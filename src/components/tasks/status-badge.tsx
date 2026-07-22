import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  deadlineBadgeClass,
  deadlineLabel,
  getDeadlineInfo,
  type DeadlineInfo,
} from "@/lib/deadline";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  priorityBadgeClass,
  statusBadgeClass,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        statusBadgeClass(status),
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        priorityBadgeClass(priority),
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

/** Soft H-n / Terlambat badge; returns null when not soon/overdue. */
export function DeadlineBadge({
  dueDate,
  status,
  info: infoProp,
  className,
}: {
  dueDate?: string | Date | null;
  status?: TaskStatus;
  /** Precomputed info (skips dueDate/status resolution). */
  info?: DeadlineInfo | null;
  className?: string;
}) {
  const info =
    infoProp !== undefined
      ? infoProp
      : dueDate != null && status != null
        ? getDeadlineInfo(dueDate, status)
        : null;

  if (!info) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        deadlineBadgeClass(info),
        className,
      )}
    >
      {deadlineLabel(info)}
    </span>
  );
}
