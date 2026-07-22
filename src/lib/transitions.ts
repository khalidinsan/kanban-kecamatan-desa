import type { Role, TaskStatus } from "@prisma/client";

export type TransitionAction =
  | "progress"
  | "start"
  | "submit_review"
  | "approve"
  | "reject"
  | "cancel";

export type TransitionResult =
  | {
      ok: true;
      fromStatus: TaskStatus;
      toStatus: TaskStatus;
      eventType:
        | "progress"
        | "status_change"
        | "submitted_review"
        | "approved"
        | "rejected"
        | "cancelled";
      requiresReason?: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const KEC_ROLES: Role[] = ["operator_kecamatan", "admin"];
const DESA_OR_KEC: Role[] = ["operator_desa", "operator_kecamatan", "admin"];

function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

/**
 * Status transition rules:
 * - progress: only when dikerjakan (no status change); not allowed on baru
 * - baru → dikerjakan via start (desa/kecamatan)
 * - dikerjakan → review via submit (desa), requires min 1 progress
 * - review → selesai approve (kecamatan/admin)
 * - review → dikerjakan reject with required reason (kecamatan/admin)
 * - no desa shortcut to selesai
 */
export function evaluateTransition(params: {
  role: Role;
  currentStatus: TaskStatus;
  action: TransitionAction;
  progressCount?: number;
  reason?: string | null;
}): TransitionResult {
  const { role, currentStatus, action, progressCount = 0, reason } = params;

  if (currentStatus === "selesai" || currentStatus === "dibatalkan") {
    return {
      ok: false,
      error: "Tugas yang sudah selesai atau dibatalkan tidak dapat diubah.",
    };
  }

  switch (action) {
    case "progress": {
      if (!hasRole(role, DESA_OR_KEC)) {
        return { ok: false, error: "Peran Anda tidak dapat menambahkan progres." };
      }
      if (currentStatus !== "dikerjakan") {
        return {
          ok: false,
          error: "Progres hanya dapat ditambahkan setelah tugas mulai dikerjakan.",
        };
      }
      return {
        ok: true,
        fromStatus: currentStatus,
        toStatus: currentStatus,
        eventType: "progress",
      };
    }

    case "start": {
      if (!hasRole(role, DESA_OR_KEC)) {
        return { ok: false, error: "Peran Anda tidak dapat memulai tugas." };
      }
      if (currentStatus !== "baru") {
        return { ok: false, error: "Hanya tugas berstatus baru yang dapat dimulai." };
      }
      return {
        ok: true,
        fromStatus: "baru",
        toStatus: "dikerjakan",
        eventType: "status_change",
      };
    }

    case "submit_review": {
      // Desa submits; kecamatan may also submit if working a task
      if (!hasRole(role, DESA_OR_KEC)) {
        return { ok: false, error: "Peran Anda tidak dapat mengajukan review." };
      }
      if (currentStatus !== "dikerjakan") {
        return {
          ok: false,
          error: "Hanya tugas berstatus dikerjakan yang dapat diajukan ke review.",
        };
      }
      if (progressCount < 1) {
        return {
          ok: false,
          error: "Minimal 1 update progres diperlukan sebelum mengajukan review.",
        };
      }
      return {
        ok: true,
        fromStatus: "dikerjakan",
        toStatus: "review",
        eventType: "submitted_review",
      };
    }

    case "approve": {
      if (!hasRole(role, KEC_ROLES)) {
        return {
          ok: false,
          error: "Hanya operator kecamatan atau admin yang dapat menyetujui.",
        };
      }
      if (currentStatus !== "review") {
        return { ok: false, error: "Hanya tugas berstatus review yang dapat disetujui." };
      }
      // Explicit: no desa shortcut to selesai (enforced by role check above)
      return {
        ok: true,
        fromStatus: "review",
        toStatus: "selesai",
        eventType: "approved",
      };
    }

    case "reject": {
      if (!hasRole(role, KEC_ROLES)) {
        return {
          ok: false,
          error: "Hanya operator kecamatan atau admin yang dapat menolak.",
        };
      }
      if (currentStatus !== "review") {
        return { ok: false, error: "Hanya tugas berstatus review yang dapat ditolak." };
      }
      if (!reason || reason.trim().length === 0) {
        return { ok: false, error: "Alasan penolakan wajib diisi." };
      }
      return {
        ok: true,
        fromStatus: "review",
        toStatus: "dikerjakan",
        eventType: "rejected",
        requiresReason: true,
      };
    }

    case "cancel": {
      if (!hasRole(role, ["admin", "operator_kecamatan"])) {
        return { ok: false, error: "Peran Anda tidak dapat membatalkan tugas." };
      }
      // selesai / dibatalkan already rejected above
      return {
        ok: true,
        fromStatus: currentStatus,
        toStatus: "dibatalkan",
        eventType: "cancelled",
      };
    }

    default:
      return { ok: false, error: "Aksi tidak dikenali." };
  }
}

export function allowedActionsFor(
  role: Role,
  status: TaskStatus,
): TransitionAction[] {
  const actions: TransitionAction[] = [
    "progress",
    "start",
    "submit_review",
    "approve",
    "reject",
    "cancel",
  ];
  return actions.filter(
    (action) => evaluateTransition({ role, currentStatus: status, action, progressCount: 1 }).ok,
  );
}

/** Helper label map (Indonesian) */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  baru: "Baru",
  dikerjakan: "Dikerjakan",
  review: "Review",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  operator_kecamatan: "Operator Kecamatan",
  operator_desa: "Operator Desa",
  camat: "Camat",
};
