"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Inbox } from "lucide-react";
import { StatusBadge } from "@/components/tasks/status-badge";
import { KanbanCard } from "@/components/board/kanban-card";
import type { BoardTask } from "@/components/board/types";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@prisma/client";

export function KanbanColumn({
  status,
  tasks,
  dragDisabled,
  isOverHighlight,
}: {
  status: TaskStatus;
  tasks: BoardTask[];
  dragDisabled: boolean;
  isOverHighlight?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const highlight = isOver || isOverHighlight;

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
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-card/50 px-3 py-10 text-center">
              <Inbox className="h-5 w-5 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">Belum ada tugas</p>
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                disabled={dragDisabled}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
