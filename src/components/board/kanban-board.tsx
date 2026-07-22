"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  Loader2,
  PlusCircle,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { startTask, submitForReview } from "@/actions/review";
import {
  BoardFilters,
  EMPTY_BOARD_FILTERS,
  type BoardFiltersState,
} from "@/components/board/board-filters";
import {
  BoardViewToggle,
  type BoardViewMode,
} from "@/components/board/board-view-toggle";
import { KanbanCard } from "@/components/board/kanban-card";
import { KanbanColumn } from "@/components/board/kanban-column";
import { ReviewDialogs } from "@/components/board/review-dialogs";
import { TaskListView } from "@/components/board/task-list-view";
import type {
  BoardDesaOption,
  BoardTask,
  BoardUser,
  ReviewModalState,
} from "@/components/board/types";
import { PRIMARY_BOARD_STATUSES } from "@/lib/tasks-query";
import type { TaskStatus } from "@prisma/client";

const VIEW_STORAGE_KEY = "kanban-board-view";

/** Validated view from the URL (`view=kanban|list`), or null when absent/invalid. */
export type BoardUrlView = BoardViewMode;

/** Filter snapshot parsed from board URL query params. */
export type BoardUrlFilters = BoardFiltersState;

function readStoredView(): BoardViewMode {
  if (typeof window === "undefined") return "kanban";
  try {
    const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (v === "list" || v === "kanban") return v;
  } catch {
    /* ignore */
  }
  return "kanban";
}

function isColumnId(id: string | number): id is TaskStatus {
  return (
    id === "baru" ||
    id === "dikerjakan" ||
    id === "review" ||
    id === "selesai" ||
    id === "dibatalkan"
  );
}

function buildBoardQueryString(
  current: URLSearchParams,
  filters: BoardFiltersState,
  view: BoardViewMode,
): string {
  const params = new URLSearchParams(current.toString());

  params.set("view", view);

  // Prefer short `q`; drop legacy `search` alias so links stay clean.
  params.delete("search");
  const q = filters.search.trim();
  if (q) {
    params.set("q", q);
  } else {
    params.delete("q");
  }

  if (filters.status) {
    params.set("status", filters.status);
  } else {
    params.delete("status");
  }

  if (filters.desaCode) {
    params.set("desa", filters.desaCode);
  } else {
    params.delete("desa");
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  } else {
    params.delete("priority");
  }

  return params.toString();
}

export function KanbanBoard({
  initialTasks,
  user,
  desaOptions,
  canCreate,
  initialView = null,
  initialFilters,
}: {
  initialTasks: BoardTask[];
  user: BoardUser;
  desaOptions: BoardDesaOption[];
  canCreate: boolean;
  /** URL `view` when valid; null means fall back to localStorage after mount. */
  initialView?: BoardUrlView | null;
  initialFilters?: BoardUrlFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<BoardTask[]>(initialTasks);
  const [viewMode, setViewMode] = useState<BoardViewMode>(
    initialView ?? "kanban",
  );
  const [filters, setFilters] = useState<BoardFiltersState>({
    search: initialFilters?.search ?? "",
    desaCode: initialFilters?.desaCode ?? "",
    priority: initialFilters?.priority ?? "",
    status: initialFilters?.status ?? "",
  });
  const [showCancelled, setShowCancelled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [modal, setModal] = useState<ReviewModalState>(null);
  const [pending, startTransition] = useTransition();

  const replaceBoardUrl = useCallback(
    (nextFilters: BoardFiltersState, nextView: BoardViewMode) => {
      const qs = buildBoardQueryString(searchParams, nextFilters, nextView);
      const href = qs ? `${pathname}?${qs}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Restore preferred view after mount only when URL has no valid `view`.
  // URL always takes precedence when present.
  useEffect(() => {
    if (initialView) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once
    setViewMode(readStoredView());
  }, [initialView]);

  function handleViewChange(next: BoardViewMode) {
    setViewMode(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    replaceBoardUrl(filters, next);
  }

  function handleFiltersChange(next: BoardFiltersState) {
    setFilters(next);
    replaceBoardUrl(next, viewMode);
  }

  // Server revalidation replaces the authoritative task snapshot. This local copy is
  // also mutated optimistically during drag/drop, so prop-to-state synchronization
  // is intentional and cannot be derived during render without losing those edits.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize the server snapshot after revalidation
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const filteredTasks = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (filters.desaCode && t.desaCode !== filters.desaCode) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.status && t.status !== filters.status) return false;
      return true;
    });
  }, [tasks, filters]);

  const byStatus = useMemo(() => {
    const map = {} as Record<TaskStatus, BoardTask[]>;
    for (const s of [
      ...PRIMARY_BOARD_STATUSES,
      "dibatalkan" as TaskStatus,
    ]) {
      map[s] = [];
    }
    for (const t of filteredTasks) {
      map[t.status]?.push(t);
    }
    return map;
  }, [filteredTasks]);

  const activeTask = activeId
    ? (tasks.find((t) => t.id === activeId) ?? null)
    : null;

  const moveTaskLocal = useCallback(
    (taskId: string, toStatus: TaskStatus, patch?: Partial<BoardTask>) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: toStatus, ...patch } : t,
        ),
      );
    },
    [],
  );

  const findTask = useCallback(
    (id: string) => tasks.find((t) => t.id === id),
    [tasks],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id;
    if (!overId) {
      setOverColumn(null);
      return;
    }
    if (isColumnId(overId)) {
      setOverColumn(overId);
      return;
    }
    const overTask = findTask(String(overId));
    setOverColumn(overTask?.status ?? null);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverColumn(null);
  }

  function resolveDropStatus(
    overId: string | number,
  ): TaskStatus | null {
    if (isColumnId(overId)) return overId;
    const overTask = findTask(String(overId));
    return overTask?.status ?? null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);

    if (!over || !user.canDrag) return;

    const taskId = String(active.id);
    const task = findTask(taskId);
    if (!task) return;

    const toStatus = resolveDropStatus(over.id);
    if (!toStatus || toStatus === task.status) return;

    // Terminal columns: no outbound drag handled elsewhere; block inbound free moves except policy below
    if (task.status === "selesai" || task.status === "dibatalkan") {
      toast.error("Tugas selesai atau dibatalkan tidak dapat dipindahkan.");
      return;
    }

    // baru → dikerjakan : startTask (desa only)
    if (task.status === "baru" && toStatus === "dikerjakan") {
      if (user.role !== "operator_desa") {
        toast.error("Hanya operator desa yang dapat memulai pengerjaan tugas.");
        return;
      }
      const prev = task.status;
      moveTaskLocal(taskId, "dikerjakan");
      startTransition(async () => {
        const result = await startTask(taskId);
        if (!result.ok) {
          moveTaskLocal(taskId, prev);
          toast.error(result.error);
          return;
        }
        toast.success("Tugas mulai dikerjakan.");
      });
      return;
    }

    // dikerjakan → review : submitForReview (desa only, requires progress)
    if (task.status === "dikerjakan" && toStatus === "review") {
      if (user.role !== "operator_desa") {
        toast.error("Hanya operator desa yang dapat mengajukan review.");
        return;
      }
      if (task.progressCount < 1) {
        toast.error(
          "Minimal 1 update progres diperlukan sebelum mengajukan review.",
        );
        return;
      }
      const prev = task.status;
      moveTaskLocal(taskId, "review");
      startTransition(async () => {
        const result = await submitForReview(taskId);
        if (!result.ok) {
          moveTaskLocal(taskId, prev);
          toast.error(result.error);
          return;
        }
        toast.success("Tugas diajukan untuk review.");
      });
      return;
    }

    // review → selesai : NEVER silent; open approve modal (reviewers only)
    if (task.status === "review" && toStatus === "selesai") {
      if (!user.canReview) {
        toast.error(
          "Hanya operator kecamatan atau admin yang dapat memverifikasi.",
        );
        return;
      }
      setModal({ type: "approve", taskId, title: task.title });
      return;
    }

    // review → dikerjakan : open reject modal (reviewers only)
    if (task.status === "review" && toStatus === "dikerjakan") {
      if (!user.canReview) {
        toast.error(
          "Hanya operator kecamatan atau admin yang dapat menolak.",
        );
        return;
      }
      setModal({ type: "reject", taskId, title: task.title });
      return;
    }

    // Explicit block: any path to selesai without modal
    if (toStatus === "selesai") {
      toast.error(
        "Tidak dapat menyelesaikan tugas lewat drag. Gunakan Verifikasi pada kolom Review.",
      );
      return;
    }

    if (toStatus === "dibatalkan") {
      toast.error(
        "Pembatalan tidak melalui drag. Buka detail tugas untuk membatalkan.",
      );
      return;
    }

    toast.error(
      `Pemindahan ${task.status} → ${toStatus} tidak diizinkan. Gunakan aksi di detail tugas.`,
    );
  }

  const cancelledCount = byStatus.dibatalkan?.length ?? 0;

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.desaCode !== "" ||
    filters.priority !== "" ||
    filters.status !== "";

  const boardEmpty = filteredTasks.length === 0;

  function resetFilters() {
    handleFiltersChange(EMPTY_BOARD_FILTERS);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BoardFilters
          filters={filters}
          onChange={handleFiltersChange}
          desaOptions={desaOptions}
          showDesaFilter={user.showDesaFilter}
        />
        <div className="flex flex-wrap items-center gap-2">
          <BoardViewToggle value={viewMode} onChange={handleViewChange} />
          {pending ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Menyimpan…
            </span>
          ) : null}
          {canCreate ? (
            <Link
              href="/tugas/baru"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <PlusCircle className="h-4 w-4" />
              Tugas baru
            </Link>
          ) : null}
        </div>
      </div>

      {viewMode === "kanban" ? (
        !user.canDrag ? (
          <p className="text-xs text-muted-foreground">
            Mode baca saja — seret kartu dinonaktifkan untuk peran Anda.
          </p>
        ) : user.role === "operator_desa" ? (
          <p className="text-xs text-muted-foreground">
            Desa: seret Baru → Dikerjakan, atau Dikerjakan → Review (min. 1
            progres). Isi progres di detail tugas.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Kecamatan: seret dari Review ke Selesai (verifikasi) atau kembali ke
            Dikerjakan (tolak + alasan). Pengerjaan &amp; ajukan review hanya
            oleh desa.
          </p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          Tampilan daftar — klik baris untuk membuka detail. Aksi bulk mengikuti
          peran: desa mengerjakan, kecamatan memverifikasi.
        </p>
      )}

      {boardEmpty ? (
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
                : "Belum ada tugas di cakupan Anda. Hubungi operator kecamatan jika diperlukan."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
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
      ) : viewMode === "list" ? (
        <TaskListView
          tasks={filteredTasks}
          user={user}
          canCreate={canCreate}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
            {PRIMARY_BOARD_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={byStatus[status] ?? []}
                dragDisabled={!user.canDrag}
                isOverHighlight={overColumn === status}
              />
            ))}

            {/* Collapsible cancelled column */}
            <section className="flex w-72 shrink-0 flex-col">
              <button
                type="button"
                onClick={() => setShowCancelled((v) => !v)}
                className="flex items-center gap-2 rounded-2xl bg-muted/35 px-4 py-3 text-left text-sm font-medium transition hover:bg-muted/55"
              >
                {showCancelled ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Dibatalkan</span>
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-card/80 px-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
                  {cancelledCount}
                </span>
              </button>
              {showCancelled ? (
                <div className="mt-2 flex flex-1">
                  <KanbanColumn
                    status="dibatalkan"
                    tasks={byStatus.dibatalkan ?? []}
                    dragDisabled={!user.canDrag}
                    isOverHighlight={overColumn === "dibatalkan"}
                  />
                </div>
              ) : null}
            </section>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="w-72">
                <KanbanCard task={activeTask} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ReviewDialogs
        modal={modal}
        onClose={() => setModal(null)}
        onSuccess={(taskId, nextStatus, extra) => {
          moveTaskLocal(taskId, nextStatus, extra);
        }}
      />
    </div>
  );
}
