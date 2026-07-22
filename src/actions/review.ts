"use server";

import { revalidatePath } from "next/cache";
import {
  assertTaskAccess,
  AuthzError,
  requireSession,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { evaluateTransition, type TransitionAction } from "@/lib/transitions";
import type { ActionResult } from "@/actions/tasks";

async function countProgress(taskId: string): Promise<number> {
  return prisma.taskUpdate.count({
    where: { taskId, eventType: "progress" },
  });
}

async function runStatusAction(params: {
  taskId: string;
  action: TransitionAction;
  reason?: string | null;
  message?: string | null;
  access: "write" | "review";
}): Promise<ActionResult> {
  const user = await requireSession();
  const { taskId, action, reason, message, access } = params;

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return { ok: false, error: "Tugas tidak ditemukan." };
    }

    assertTaskAccess(user, task, access);

    const progressCount =
      action === "submit_review" ? await countProgress(task.id) : 0;

    const transition = evaluateTransition({
      role: user.role,
      currentStatus: task.status,
      action,
      progressCount,
      reason,
    });

    if (!transition.ok) {
      return { ok: false, error: transition.error };
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: task.id },
        data: {
          status: transition.toStatus,
          lastRejectionReason:
            action === "reject"
              ? (reason ?? "").trim()
              : action === "approve"
                ? null
                : undefined,
          submittedAt: action === "submit_review" ? now : undefined,
          completedAt: action === "approve" ? now : undefined,
        },
      });

      await tx.taskUpdate.create({
        data: {
          taskId: task.id,
          authorId: user.id,
          eventType: transition.eventType,
          message:
            message?.trim() ||
            (action === "reject"
              ? (reason ?? "").trim()
              : action === "start"
                ? "Tugas mulai dikerjakan"
                : action === "submit_review"
                  ? "Diajukan untuk review"
                  : action === "approve"
                    ? "Tugas disetujui / selesai"
                    : action === "cancel"
                      ? "Tugas dibatalkan"
                      : null),
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus,
        },
      });
    });

    revalidatePath(`/tugas/${task.id}`);
    revalidatePath("/board");
    return { ok: true, id: task.id };
  } catch (err) {
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    console.error(`review action ${action} error`, err);
    return { ok: false, error: "Gagal memproses aksi tugas." };
  }
}

/** baru → dikerjakan */
export async function startTask(taskId: string): Promise<ActionResult> {
  return runStatusAction({
    taskId,
    action: "start",
    access: "write",
  });
}

/** dikerjakan → review (min 1 progress) */
export async function submitForReview(taskId: string): Promise<ActionResult> {
  return runStatusAction({
    taskId,
    action: "submit_review",
    access: "write",
  });
}

/** review → selesai */
export async function approveTask(taskId: string): Promise<ActionResult> {
  return runStatusAction({
    taskId,
    action: "approve",
    access: "review",
  });
}

/** review → dikerjakan, reason required → lastRejectionReason */
export async function rejectTask(
  taskId: string,
  formData: FormData,
): Promise<ActionResult> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return { ok: false, error: "Alasan penolakan wajib diisi." };
  }
  return runStatusAction({
    taskId,
    action: "reject",
    reason,
    message: reason,
    access: "review",
  });
}

/** any open status → dibatalkan */
export async function cancelTask(taskId: string): Promise<ActionResult> {
  return runStatusAction({
    taskId,
    action: "cancel",
    access: "write",
  });
}
