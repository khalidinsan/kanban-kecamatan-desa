import type { TaskPriority, TaskStatus } from "@prisma/client";
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
