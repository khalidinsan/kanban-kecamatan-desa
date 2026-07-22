"use client";

import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  GripVertical,
  Paperclip,
  Activity,
} from "lucide-react";
import { PriorityBadge } from "@/components/tasks/status-badge";
import type { BoardTask } from "@/components/board/types";
import { cn } from "@/lib/utils";

export function KanbanCard({
  task,
  disabled,
  isOverlay = false,
}: {
  task: BoardTask;
  disabled?: boolean;
  isOverlay?: boolean;
}) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: disabled || isOverlay,
  });

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const showRejected =
    Boolean(task.lastRejectionReason) && task.status === "dikerjakan";

  return (
    <article
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-2xl bg-card p-3.5 shadow-card transition duration-200 ease-out",
        !isOverlay && "hover:shadow-card-hover hover:-translate-y-0.5",
        isDragging && "opacity-40 scale-[0.98]",
        isOverlay && "shadow-elevated rotate-1 cursor-grabbing scale-105",
        disabled && "cursor-default hover:translate-y-0",
      )}
    >
      <div className="flex items-start gap-1.5">
        {!disabled ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-0.5 text-muted-foreground opacity-50 transition hover:bg-muted hover:opacity-100 active:cursor-grabbing"
            aria-label="Seret kartu"
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            if (!isOverlay) router.push(`/tugas/${task.id}`);
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <PriorityBadge priority={task.priority} />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {task.attachmentCount > 0 ? (
                <span className="inline-flex items-center gap-0.5">
                  <Paperclip className="h-3 w-3" />
                  {task.attachmentCount}
                </span>
              ) : null}
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">
            {task.title}
          </p>

          <p className="mt-1.5 truncate text-xs text-muted-foreground">
            {task.desaName ?? "—"}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {task.dueDate ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), "dd MMM yyyy", {
                  locale: localeId,
                })}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {task.progressCount} progres
            </span>
          </div>

          {showRejected ? (
            <div className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-danger/10 px-2.5 py-1.5 text-[11px] text-danger">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">
                Ditolak: {task.lastRejectionReason}
              </span>
            </div>
          ) : null}
        </button>
      </div>
    </article>
  );
}
