"use client";

import { Columns3, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type BoardViewMode = "kanban" | "list";

export function BoardViewToggle({
  value,
  onChange,
}: {
  value: BoardViewMode;
  onChange: (next: BoardViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Mode tampilan board"
      className="inline-flex rounded-xl bg-muted/60 p-1 shadow-card"
    >
      <button
        type="button"
        onClick={() => onChange("kanban")}
        aria-pressed={value === "kanban"}
        className={cn(
          "anim-interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
          value === "kanban"
            ? "bg-card text-foreground shadow-card"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Columns3 className="h-4 w-4" />
        <span className="hidden sm:inline">Papan</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        className={cn(
          "anim-interactive inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
          value === "list"
            ? "bg-card text-foreground shadow-card"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">Daftar</span>
      </button>
    </div>
  );
}
