"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/tasks/status-badge";
import { KanbanCard } from "@/components/board/kanban-card";
import type { BoardTask } from "@/components/board/types";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@prisma/client";

/** Initial cards per column; each "load more" reveals another page. */
export const COLUMN_PAGE_SIZE = 12;

export function KanbanColumn({
  status,
  tasks,
  dragDisabled,
  isOverHighlight,
  pageSize = COLUMN_PAGE_SIZE,
}: {
  status: TaskStatus;
  tasks: BoardTask[];
  dragDisabled: boolean;
  isOverHighlight?: boolean;
  pageSize?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  // Extra pages beyond the first pageSize window (user-driven only).
  const [extra, setExtra] = useState(0);
  // When the column data fingerprint changes, drop extra pages without an effect.
  const fingerprint = `${status}:${tasks.length}:${pageSize}`;
  const [seenFingerprint, setSeenFingerprint] = useState(fingerprint);
  if (fingerprint !== seenFingerprint) {
    setSeenFingerprint(fingerprint);
    setExtra(0);
  }

  const highlight = isOver || isOverHighlight;
  const visibleCount = pageSize + extra;
  const visibleTasks = tasks.slice(0, visibleCount);
  const remaining = Math.max(0, tasks.length - visibleCount);
  const canLoadMore = remaining > 0;

  function loadMore() {
    setExtra((n) => n + pageSize);
  }

  return (
    <section
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-3xl bg-muted/35 transition",
        highlight && "bg-primary/5 ring-1 ring-primary/25",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-card/80 px-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <span className="sr-only">{STATUS_LABELS[status]}</span>
      </header>

      <div
        ref={setNodeRef}
        className="flex min-h-[8rem] flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3"
      >
        <SortableContext
          items={visibleTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-card/50 px-3 py-10 text-center">
              <Inbox className="h-5 w-5 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">Belum ada tugas</p>
            </div>
          ) : (
            <>
              {visibleTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  disabled={dragDisabled}
                />
              ))}
              {canLoadMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  className="anim-interactive mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-muted-foreground/25 bg-card/40 px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-card hover:text-foreground"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Muat {Math.min(pageSize, remaining)} lagi
                  <span className="tabular-nums text-muted-foreground/80">
                    ({remaining} tersisa)
                  </span>
                </button>
              ) : null}
            </>
          )}
        </SortableContext>
      </div>
    </section>
  );
}
