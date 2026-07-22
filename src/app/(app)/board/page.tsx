import { AppTopbar } from "@/components/app-topbar";
import { KanbanBoard } from "@/components/board/kanban-board";
import type { BoardTask } from "@/components/board/types";
import { requireSession } from "@/lib/authz";
import { ROLE_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  BOARD_TASK_INCLUDE,
  taskWhereForUser,
} from "@/lib/tasks-query";

export default async function BoardPage() {
  const user = await requireSession();

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
  const canDrag =
    user.role === "admin" ||
    user.role === "operator_kecamatan" ||
    user.role === "operator_desa";
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
        />
      </div>
    </>
  );
}
