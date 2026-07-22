"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "node:fs/promises";
import {
  assertTaskAccess,
  AuthzError,
  requireSession,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { evaluateTransition } from "@/lib/transitions";
import {
  absoluteUploadPath,
  filesFromFormData,
  saveUploadFiles,
  UploadError,
} from "@/lib/uploads";
import type { ActionResult } from "@/actions/tasks";

/**
 * Add a progress update while status is dikerjakan only
 * (user must click "Mulai dikerjakan" first when status is baru).
 * Does not change status (progress keeps status).
 * Enforced via evaluateTransition action "progress".
 */
export async function deleteProgress(
  updateId: string,
): Promise<ActionResult> {
  const user = await requireSession();

  try {
    const update = await prisma.taskUpdate.findUnique({
      where: { id: updateId },
      include: {
        task: true,
        attachments: { select: { path: true } },
      },
    });

    if (!update) {
      return { ok: false, error: "Progress tidak ditemukan." };
    }

    assertTaskAccess(user, update.task, "write");

    if (update.eventType !== "progress") {
      return {
        ok: false,
        error: "Riwayat perubahan status tidak dapat dihapus.",
      };
    }

    if (update.task.status !== "dikerjakan") {
      return {
        ok: false,
        error: "Progress hanya dapat dihapus saat tugas berstatus dikerjakan.",
      };
    }

    // Hanya operator desa yang menghapus progres miliknya (bukan kecamatan/admin).
    const canDelete =
      user.role === "operator_desa" && update.authorId === user.id;

    if (!canDelete) {
      return {
        ok: false,
        error: "Hanya operator desa (pembuat progres) yang dapat menghapus progres.",
      };
    }

    await prisma.$transaction([
      prisma.taskUpdate.delete({ where: { id: update.id } }),
      prisma.task.update({
        where: { id: update.taskId },
        data: { updatedAt: new Date() },
      }),
    ]);

    // Best-effort physical cleanup after DB commit. Missing files must not
    // resurrect an already-deleted progress record.
    await Promise.allSettled(
      update.attachments.map(async ({ path }) => {
        try {
          await unlink(absoluteUploadPath(path));
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== "ENOENT") throw error;
        }
      }),
    );

    revalidatePath(`/tugas/${update.taskId}`);
    revalidatePath("/board");
    revalidatePath("/executive");
    return { ok: true, id: update.taskId };
  } catch (err) {
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    console.error("deleteProgress error", err);
    return { ok: false, error: "Gagal menghapus progress." };
  }
}

export async function addProgress(
  taskId: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSession();

  const message = String(formData.get("message") ?? "").trim();
  if (!message) {
    return { ok: false, error: "Pesan progres wajib diisi." };
  }
  if (message.length > 5000) {
    return { ok: false, error: "Pesan progres terlalu panjang." };
  }

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return { ok: false, error: "Tugas tidak ditemukan." };
    }

    assertTaskAccess(user, task, "write");

    const transition = evaluateTransition({
      role: user.role,
      currentStatus: task.status,
      action: "progress",
    });

    if (!transition.ok) {
      return { ok: false, error: transition.error };
    }

    const files = filesFromFormData(formData);
    if (files.length > 10) {
      return { ok: false, error: "Maksimal 10 lampiran." };
    }

    let saved;
    try {
      saved = await saveUploadFiles(files);
    } catch (err) {
      if (err instanceof UploadError) {
        return { ok: false, error: err.message };
      }
      throw err;
    }

    await prisma.taskUpdate.create({
      data: {
        taskId: task.id,
        authorId: user.id,
        eventType: transition.eventType,
        message,
        fromStatus: transition.fromStatus,
        toStatus: transition.toStatus,
        attachments:
          saved.length > 0
            ? {
                create: saved.map((f) => ({
                  fileName: f.fileName,
                  originalName: f.originalName,
                  mimeType: f.mimeType,
                  size: f.size,
                  path: f.path,
                })),
              }
            : undefined,
      },
    });

    // Touch task updatedAt
    await prisma.task.update({
      where: { id: task.id },
      data: { updatedAt: new Date() },
    });

    revalidatePath(`/tugas/${task.id}`);
    revalidatePath("/board");
    return { ok: true, id: task.id };
  } catch (err) {
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    console.error("addProgress error", err);
    return { ok: false, error: "Gagal menambahkan progres." };
  }
}
