import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { taskWhereForUser } from "@/lib/tasks-query";

/** Nav badge counts for "perlu aksi" items. */
export type ActionBadges = {
  /** Board / operational queue */
  board: number;
  /** Executive attention (admin / camat) */
  executive: number;
};

const EMPTY_BADGES: ActionBadges = { board: 0, executive: 0 };

/** Pending verification — the only task status kecamatan/admin can act on. */
function reviewWhere(scope: Prisma.TaskWhereInput): Prisma.TaskWhereInput {
  return {
    AND: [scope, { status: "review" }],
  };
}

/**
 * Monitoring set for camat executive: review + overdue open tasks.
 * Overdue is NOT an admin/kecamatan board action (desa owns dikerjakan).
 */
function monitoringWhere(
  scope: Prisma.TaskWhereInput,
  now: Date,
): Prisma.TaskWhereInput {
  return {
    AND: [
      scope,
      {
        OR: [
          { status: "review" },
          {
            AND: [
              { dueDate: { lt: now } },
              { status: { notIn: ["selesai", "dibatalkan"] } },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Cheap count queries for sidebar "perlu aksi" badges, scoped by role.
 *
 * Board = antrian yang bisa di-aksi role itu (ACL `transitions.ts`).
 * Executive = pantauan "Perlu perhatian" (review ∪ overdue), selaras `needsAttention`.
 *
 * - operator_desa: board = ditolak + tugas baru
 * - operator_kecamatan: board = review saja
 * - admin: board = review (aksi); executive = review ∪ overdue (info)
 * - camat: executive = review ∪ overdue (read-only)
 */
export async function getActionBadges(
  user: SessionUser,
  now: Date = new Date(),
): Promise<ActionBadges> {
  const scope = taskWhereForUser(user);

  switch (user.role) {
    case "operator_desa": {
      const [rejected, baru] = await Promise.all([
        prisma.task.count({
          where: {
            AND: [
              scope,
              { status: "dikerjakan" },
              { lastRejectionReason: { not: null } },
            ],
          },
        }),
        prisma.task.count({
          where: { AND: [scope, { status: "baru" }] },
        }),
      ]);
      return { board: rejected + baru, executive: 0 };
    }

    case "operator_kecamatan": {
      // Hanya antrian verifikasi — bukan overdue dikerjakan (aksi desa)
      const board = await prisma.task.count({
        where: reviewWhere(scope),
      });
      return { board, executive: 0 };
    }

    case "admin": {
      // Board = aksi (verifikasi/tolak). Executive = pantauan (sama "Perlu perhatian").
      const [board, executive] = await Promise.all([
        prisma.task.count({ where: reviewWhere(scope) }),
        prisma.task.count({ where: monitoringWhere(scope, now) }),
      ]);
      return { board, executive };
    }

    case "camat": {
      // Read-only monitoring: review + overdue
      const executive = await prisma.task.count({
        where: monitoringWhere(scope, now),
      });
      return { board: 0, executive };
    }

    default:
      return EMPTY_BADGES;
  }
}
