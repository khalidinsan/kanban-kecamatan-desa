import type { Prisma, TaskStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/authz";

/** Prisma where-clause for role-scoped task lists. */
export function taskWhereForUser(user: SessionUser): Prisma.TaskWhereInput {
  switch (user.role) {
    case "admin":
      return {};
    case "camat":
    case "operator_kecamatan":
      if (!user.kecamatanCode) {
        return { id: "__none__" };
      }
      return { kecamatanCode: user.kecamatanCode };
    case "operator_desa":
      if (!user.desaCode) {
        return { id: "__none__" };
      }
      return { desaCode: user.desaCode };
    default:
      return { id: "__none__" };
  }
}

export const TASK_LIST_INCLUDE = {
  desa: { select: { code: true, name: true } },
  kecamatan: { select: { code: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  _count: { select: { updates: true, attachments: true } },
} satisfies Prisma.TaskInclude;

/** Board list: progress count = updates with eventType progress. */
export const BOARD_TASK_INCLUDE = {
  desa: { select: { code: true, name: true } },
  kecamatan: { select: { code: true, name: true } },
  _count: {
    select: {
      attachments: true,
      // filtered: only progress events
      updates: { where: { eventType: "progress" as const } },
    },
  },
} satisfies Prisma.TaskInclude;

/** Primary columns always shown; dibatalkan is optional/collapsible. */
export const PRIMARY_BOARD_STATUSES: TaskStatus[] = [
  "baru",
  "dikerjakan",
  "review",
  "selesai",
];

export const TASK_DETAIL_INCLUDE = {
  desa: { select: { code: true, name: true } },
  kecamatan: { select: { code: true, name: true } },
  kabupaten: { select: { code: true, name: true } },
  createdBy: { select: { id: true, name: true, role: true } },
  assignedTo: { select: { id: true, name: true } },
  attachments: { orderBy: { createdAt: "desc" as const } },
  updates: {
    orderBy: { createdAt: "desc" as const },
    include: {
      author: { select: { id: true, name: true, role: true } },
      attachments: { orderBy: { createdAt: "asc" as const } },
    },
  },
} satisfies Prisma.TaskInclude;

export const BOARD_STATUSES: TaskStatus[] = [
  "baru",
  "dikerjakan",
  "review",
  "selesai",
  "dibatalkan",
];
