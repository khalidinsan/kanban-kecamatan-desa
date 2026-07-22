import type { TaskStatus } from "@prisma/client";
import { differenceInCalendarDays, startOfDay } from "date-fns";

/** Days remaining (inclusive) that count as "soon": H-0 … H-3 */
export const DEADLINE_SOON_DAYS = 3;

export type DeadlineInfo =
  | { kind: "overdue" }
  | { kind: "soon"; days: number };

/**
 * Visual urgency for a task due date.
 * - `null` when no due date, terminal status, or outside the soon window
 * - `{ kind: "overdue" }` when due date is before today
 * - `{ kind: "soon", days }` for H-0 (today) through H-3
 */
export function getDeadlineInfo(
  dueDate: string | Date | null | undefined,
  status: TaskStatus,
  now: Date = new Date(),
): DeadlineInfo | null {
  if (!dueDate) return null;
  if (status === "selesai" || status === "dibatalkan") return null;

  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(now);
  const days = differenceInCalendarDays(due, today);

  if (days < 0) return { kind: "overdue" };
  if (days <= DEADLINE_SOON_DAYS) return { kind: "soon", days };
  return null;
}

export function deadlineLabel(info: DeadlineInfo): string {
  if (info.kind === "overdue") return "Terlambat";
  return `H-${info.days}`;
}

/** Soft Subang palette: danger for overdue, warning/accent for soon. */
export function deadlineBadgeClass(info: DeadlineInfo): string {
  if (info.kind === "overdue") {
    return "bg-danger/15 text-danger";
  }
  // H-0 (today) slightly stronger warning; H-1..H-3 soft accent/gold
  if (info.days === 0) {
    return "bg-warning/20 text-amber-900 dark:bg-warning/25 dark:text-accent";
  }
  return "bg-accent/15 text-amber-800 dark:bg-accent/20 dark:text-accent";
}
