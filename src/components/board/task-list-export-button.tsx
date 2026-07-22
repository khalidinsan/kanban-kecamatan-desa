"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import type { BoardTask } from "@/components/board/types";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const BOARD_EXPORT_HEADERS = [
  "id",
  "title",
  "status",
  "priority",
  "desa",
  "dueDate",
  "progressCount",
  "attachmentCount",
  "lastRejectionReason",
] as const;

function tasksToCsvRows(tasks: BoardTask[]) {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: STATUS_LABELS[t.status] ?? t.status,
    priority: PRIORITY_LABELS[t.priority] ?? t.priority,
    desa: t.desaName ?? "",
    dueDate: t.dueDate
      ? format(new Date(t.dueDate), "yyyy-MM-dd")
      : "",
    progressCount: t.progressCount,
    attachmentCount: t.attachmentCount,
    lastRejectionReason: t.lastRejectionReason ?? "",
  }));
}

export function TaskListExportButton({
  tasks,
  className,
  disabled,
}: {
  tasks: BoardTask[];
  className?: string;
  disabled?: boolean;
}) {
  const handleExport = useCallback(() => {
    const csv = buildCsv(
      [...BOARD_EXPORT_HEADERS],
      tasksToCsvRows(tasks),
    );
    const stamp = format(new Date(), "yyyyMMdd-HHmm");
    downloadCsv(`board-tugas-${stamp}.csv`, csv);
  }, [tasks]);

  const isDisabled = disabled || tasks.length === 0;

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDisabled}
      title={
        isDisabled
          ? "Tidak ada tugas untuk diekspor"
          : `Export ${tasks.length} tugas ke CSV`
      }
      className={cn(
        "inline-flex items-center gap-2 rounded-xl bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-card transition hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
