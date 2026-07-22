import { AppTopbar } from "@/components/app-topbar";
import {
  KanbanBoard,
  type BoardUrlFilters,
  type BoardUrlView,
} from "@/components/board/kanban-board";
import type { BoardTask } from "@/components/board/types";
import { PRIORITY_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/lib/labels";
import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  BOARD_TASK_INCLUDE,
  taskWhereForUser,
} from "@/lib/tasks-query";
import type { TaskPriority, TaskStatus } from "@prisma/client";

type BoardSearchParams = {
  view?: string | string[];
  q?: string | string[];
  search?: string | string[];
  status?: string | string[];
  desa?: string | string[];
  priority?: string | string[];
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseBoardView(
  raw: string | string[] | undefined,
): BoardUrlView | null {
  const value = firstParam(raw);
  if (value === "kanban" || value === "list") return value;
  return null;
}

function parseBoardFilters(
  params: BoardSearchParams,
): BoardUrlFilters {
  const search =
    firstParam(params.q)?.trim() ||
    firstParam(params.search)?.trim() ||
    "";

  const statusRaw = firstParam(params.status) ?? "";
  const status =
    statusRaw in STATUS_LABELS ? (statusRaw as TaskStatus) : "";

  const priorityRaw = firstParam(params.priority) ?? "";
  const priority =
    priorityRaw in PRIORITY_LABELS
      ? (priorityRaw as TaskPriority)
      : "";

  const desaCode = firstParam(params.desa)?.trim() ?? "";

  return {
    search,
    desaCode,
    priority,
    status,
  };
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<BoardSearchParams>;
}) {
  const user = await requireSession();
  const params = await searchParams;
  const initialView = parseBoardView(params.view);
  const initialFilters = parseBoardFilters(params);

  const tasks = await prisma.task.findMany({
    where: taskWhereForUser(user),
    include: BOARD_TASK_INCLUDE,
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  const boardTasks: BoardTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    lastRejectionReason: t.lastRejectionReason,
    desaCode: t.desaCode,
    desaName: t.desa?.name ?? null,
    progressCount: t._count.updates,
    attachmentCount: t._count.attachments,
  }));

  const showDesaFilter =
    user.role === "admin" ||
    user.role === "operator_kecamatan" ||
    user.role === "camat";

  let desaOptions: { code: string; name: string }[] = [];
  if (showDesaFilter) {
    if (user.role === "admin") {
      // Distinct desas that appear on visible tasks (admin sees all)
      const codes = [
        ...new Set(
          tasks.map((t) => t.desaCode).filter((c): c is string => Boolean(c)),
        ),
      ];
      if (codes.length > 0) {
        desaOptions = await prisma.desa.findMany({
          where: { code: { in: codes } },
          select: { code: true, name: true },
          orderBy: { name: "asc" },
        });
      }
    } else if (user.kecamatanCode) {
      desaOptions = await prisma.desa.findMany({
        where: { kecamatanCode: user.kecamatanCode },
        select: { code: true, name: true },
        orderBy: { name: "asc" },
      });
    }
  }

  const canCreate =
    user.role === "admin" || user.role === "operator_kecamatan";
  // Drag: desa (start/submit) or kecamatan/admin (review modals only)
  const canDrag =
    user.role === "operator_desa" ||
    user.role === "operator_kecamatan" ||
    user.role === "admin";
  const canReview =
    user.role === "admin" || user.role === "operator_kecamatan";

  return (
    <>
      <AppTopbar
        title="Board Tugas"
        subtitle={`${ROLE_LABELS[user.role]} · ${tasks.length} tugas`}
      />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 pb-8">
        <KanbanBoard
          initialTasks={boardTasks}
          user={{
            role: user.role,
            canDrag,
            canReview,
            showDesaFilter,
          }}
          desaOptions={desaOptions}
          canCreate={canCreate}
          initialView={initialView}
          initialFilters={initialFilters}
        />
      </div>
    </>
  );
}
