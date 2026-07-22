"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronRight,
  Inbox,
  Paperclip,
  PlusCircle,
  Activity,
  SearchX,
} from "lucide-react";
import { BulkActionsBar } from "@/components/board/bulk-actions-bar";
import { TaskListExportButton } from "@/components/board/task-list-export-button";
import type { BoardTask, BoardUser } from "@/components/board/types";
import {
  DeadlineBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/tasks/status-badge";
import { getDeadlineInfo } from "@/lib/deadline";
import { cn } from "@/lib/utils";

type SortKey = "title" | "status" | "priority" | "dueDate";

const STATUS_ORDER = {
  baru: 0,
  dikerjakan: 1,
  review: 2,
  selesai: 3,
  dibatalkan: 4,
} as const;

const PRIORITY_ORDER = {
  mendesak: 0,
  tinggi: 1,
  sedang: 2,
  rendah: 3,
} as const;

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}) {
  if (sortKey !== column) {
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );
}

export function TaskListView({
  tasks,
  user,
  canCreate = false,
  hasActiveFilters = false,
  onResetFilters,
}: {
  tasks: BoardTask[];
  user: BoardUser;
  canCreate?: boolean;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const list = [...tasks];
    const dir = sortDir === "asc" ? 1 : -1;

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title, "id");
          break;
        case "status":
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case "priority":
          cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
        case "dueDate": {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
          cmp = ad - bd;
          break;
        }
        default:
          cmp = 0;
      }
      if (cmp === 0) {
        cmp = a.title.localeCompare(b.title, "id");
      }
      return cmp * dir;
    });
    return list;
  }, [tasks, sortKey, sortDir]);

  // Only count selections that are still in the filtered/visible set.
  const selectedTasks = useMemo(
    () => sorted.filter((t) => selectedIds.has(t.id)),
    [sorted, selectedIds],
  );
  const activeSelectedCount = selectedTasks.length;

  const allVisibleSelected =
    sorted.length > 0 && sorted.every((t) => selectedIds.has(t.id));
  const someVisibleSelected =
    !allVisibleSelected && sorted.some((t) => selectedIds.has(t.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (sorted.length === 0) return prev;
      const allSelected = sorted.every((t) => prev.has(t.id));
      if (allSelected) {
        const next = new Set(prev);
        for (const t of sorted) next.delete(t.id);
        return next;
      }
      const next = new Set(prev);
      for (const t of sorted) next.add(t.id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex justify-end">
          <TaskListExportButton tasks={sorted} />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-card px-6 py-16 text-center shadow-card">
          {hasActiveFilters ? (
            <SearchX className="h-8 w-8 text-muted-foreground/70" />
          ) : (
            <Inbox className="h-8 w-8 text-muted-foreground/70" />
          )}
          <p className="mt-3 text-sm font-semibold text-foreground">
            {hasActiveFilters
              ? "Tidak ada tugas yang cocok"
              : "Belum ada tugas"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Ubah pencarian atau filter, atau reset untuk melihat semua tugas."
              : canCreate
                ? "Buat tugas pertama untuk mulai melacak pekerjaan desa."
                : "Belum ada tugas di cakupan Anda."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {hasActiveFilters && onResetFilters ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="anim-interactive inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80"
              >
                Reset filter
              </button>
            ) : null}
            {canCreate ? (
              <Link
                href="/tugas/baru"
                className="anim-interactive inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90"
              >
                <PlusCircle className="h-4 w-4" />
                Buat tugas
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <TaskListExportButton tasks={sorted} />
      </div>

      {/* Desktop table */}
      <div className="hidden min-h-0 flex-1 overflow-auto rounded-3xl bg-card shadow-card md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={toggleAllVisible}
                  aria-label="Pilih semua baris yang tampil"
                  className="h-4 w-4 rounded border-muted-foreground/40 accent-primary"
                />
              </th>
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  Judul
                  <SortIcon column="title" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  Status
                  <SortIcon column="status" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("priority")}
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  Prioritas
                  <SortIcon
                    column="priority"
                    sortKey={sortKey}
                    sortDir={sortDir}
                  />
                </button>
              </th>
              <th className="px-3 py-3 font-medium">Desa</th>
              <th className="px-3 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("dueDate")}
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  Jatuh tempo
                  <SortIcon
                    column="dueDate"
                    sortKey={sortKey}
                    sortDir={sortDir}
                  />
                </button>
              </th>
              <th className="px-3 py-3 font-medium">Progress</th>
              <th className="px-3 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => {
              const deadline = getDeadlineInfo(task.dueDate, task.status);
              const rejected =
                Boolean(task.lastRejectionReason) &&
                task.status === "dikerjakan";
              const selected = selectedIds.has(task.id);
              return (
                <tr
                  key={task.id}
                  onClick={() => router.push(`/tugas/${task.id}`)}
                  className={cn(
                    "cursor-pointer border-t border-muted/40 transition hover:bg-muted/30",
                    selected && "bg-primary/5",
                  )}
                >
                  <td
                    className="px-3 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleOne(task.id)}
                      aria-label={`Pilih ${task.title}`}
                      className="h-4 w-4 rounded border-muted-foreground/40 accent-primary"
                    />
                  </td>
                  <td className="max-w-[18rem] px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-2 font-medium text-foreground">
                        {task.title}
                      </span>
                      {rejected ? (
                        <span className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-danger">
                          <AlertCircle className="h-3 w-3" />
                          Ditolak — perlu perbaikan
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {task.desaName ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {task.dueDate ? (
                      <span
                        className={cn(
                          "inline-flex flex-wrap items-center gap-1.5 tabular-nums",
                          deadline?.kind === "overdue" &&
                            "font-medium text-danger",
                          deadline?.kind === "soon" &&
                            "font-medium text-amber-800 dark:text-accent",
                          !deadline && "text-muted-foreground",
                        )}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(task.dueDate), "dd MMM yyyy", {
                          locale: localeId,
                        })}
                        <DeadlineBadge info={deadline} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {task.progressCount}
                      </span>
                      {task.attachmentCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5" />
                          {task.attachmentCount}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/tugas/${task.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="anim-interactive inline-flex items-center gap-1 rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      Buka
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto md:hidden">
        {sorted.map((task) => {
          const deadline = getDeadlineInfo(task.dueDate, task.status);
          const rejected =
            Boolean(task.lastRejectionReason) && task.status === "dikerjakan";
          const selected = selectedIds.has(task.id);
          return (
            <div
              key={task.id}
              className={cn(
                "flex gap-3 rounded-2xl bg-card p-4 shadow-card transition hover:shadow-card-hover",
                selected && "ring-2 ring-primary/30",
              )}
            >
              <div className="flex shrink-0 items-start pt-0.5">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleOne(task.id)}
                  aria-label={`Pilih ${task.title}`}
                  className="h-4 w-4 rounded border-muted-foreground/40 accent-primary"
                />
              </div>
              <Link href={`/tugas/${task.id}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  <DeadlineBadge info={deadline} className="text-[11px]" />
                  {rejected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                      <AlertCircle className="h-3 w-3" />
                      Ditolak
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                  {task.title}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {task.desaName ? <span>{task.desaName}</span> : null}
                  {task.dueDate ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        deadline?.kind === "overdue" && "font-medium text-danger",
                        deadline?.kind === "soon" &&
                          "font-medium text-amber-800 dark:text-accent",
                      )}
                    >
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
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {sorted.length} tugas ditampilkan
          {activeSelectedCount > 0
            ? ` · ${activeSelectedCount} dipilih`
            : null}
        </p>
        {sorted.length > 0 ? (
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground md:hidden">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = someVisibleSelected;
              }}
              onChange={toggleAllVisible}
              className="h-4 w-4 rounded border-muted-foreground/40 accent-primary"
            />
            Pilih semua
          </label>
        ) : null}
      </div>

      {selectedTasks.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-1 pt-8">
          <div className="pointer-events-auto w-full px-1">
            <BulkActionsBar
              selectedTasks={selectedTasks}
              user={user}
              onClear={clearSelection}
              onSuccess={() => router.refresh()}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
