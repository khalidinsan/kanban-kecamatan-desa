"use client";

import { useMemo, useState, useTransition } from "react";
import type { Role, TaskStatus, TaskUpdateEventType } from "@prisma/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { History, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProgress } from "@/actions/updates";
import {
  EVENT_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  eventBadgeClass,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { AttachmentList, type AttachmentItem } from "./attachment-list";

export type TimelineUpdate = {
  id: string;
  eventType: TaskUpdateEventType;
  message: string | null;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  createdAt: Date;
  author: { id: string; name: string; role: Role };
  attachments: AttachmentItem[];
};

type TimelineFilter = "all" | "progress" | "system";

const FILTER_CHIPS: { id: TimelineFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "progress", label: "Progress" },
  { id: "system", label: "Review/Status" },
];

function isSystemEvent(eventType: TaskUpdateEventType): boolean {
  return eventType !== "progress";
}

/** Human-readable primary line for system / review events. */
function eventSummary(update: TimelineUpdate): string | null {
  const name = update.author.name;
  switch (update.eventType) {
    case "approved":
      return `Diverifikasi oleh ${name}`;
    case "rejected": {
      const reason = update.message?.trim();
      return reason
        ? `Ditolak oleh ${name} — ${reason}`
        : `Ditolak oleh ${name}`;
    }
    case "submitted_review":
      return `Diajukan review oleh ${name}`;
    case "cancelled":
      return `Dibatalkan oleh ${name}`;
    case "status_change": {
      if (
        update.fromStatus &&
        update.toStatus &&
        update.fromStatus !== update.toStatus
      ) {
        return `Status diubah oleh ${name}: ${STATUS_LABELS[update.fromStatus]} → ${STATUS_LABELS[update.toStatus]}`;
      }
      return `Status diubah oleh ${name}`;
    }
    case "progress":
    default:
      return null;
  }
}

/** Whether the raw message is already reflected in the summary line. */
function shouldShowRawMessage(update: TimelineUpdate): boolean {
  if (!update.message?.trim()) return false;
  // Reject reason is embedded in the summary line.
  if (update.eventType === "rejected") return false;
  // Generic auto-messages for approve / submit / cancel are redundant.
  if (
    update.eventType === "approved" ||
    update.eventType === "submitted_review" ||
    update.eventType === "cancelled"
  ) {
    return false;
  }
  return true;
}

export function TaskTimeline({
  updates,
  currentUserId,
  currentUserRole,
  taskStatus,
}: {
  updates: TimelineUpdate[];
  currentUserId: string;
  currentUserRole: Role;
  taskStatus: TaskStatus;
}) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<TimelineUpdate | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    let progress = 0;
    let system = 0;
    for (const u of updates) {
      if (u.eventType === "progress") progress += 1;
      else system += 1;
    }
    return { all: updates.length, progress, system };
  }, [updates]);

  const filtered = useMemo(() => {
    if (filter === "progress") {
      return updates.filter((u) => u.eventType === "progress");
    }
    if (filter === "system") {
      return updates.filter((u) => isSystemEvent(u.eventType));
    }
    return updates;
  }, [updates, filter]);

  function canDelete(update: TimelineUpdate): boolean {
    if (taskStatus !== "dikerjakan" || update.eventType !== "progress") {
      return false;
    }
    // Hanya operator desa (pembuat progres)
    return (
      currentUserRole === "operator_desa" &&
      update.author.id === currentUserId
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProgress(deleteTarget.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Progress berhasil dihapus");
      setDeleteTarget(null);
    });
  }

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-muted/40 px-4 py-10 text-center">
        <History className="h-5 w-5 text-muted-foreground/70" />
        <p className="text-sm font-medium text-foreground">Belum ada riwayat</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Progres, pengajuan review, verifikasi, dan penolakan akan muncul di
          sini.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="mb-4 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Filter riwayat"
      >
        {FILTER_CHIPS.map((chip) => {
          const count =
            chip.id === "all"
              ? counts.all
              : chip.id === "progress"
                ? counts.progress
                : counts.system;
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(chip.id)}
              className={cn(
                "anim-interactive inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-primary-foreground/80" : "text-muted-foreground/80",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-muted/40 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Tidak ada entri untuk filter ini.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-muted pl-5">
          {filtered.map((u) => {
            const summary = eventSummary(u);
            const showMessage = shouldShowRawMessage(u);
            return (
              <li key={u.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                <div className="rounded-2xl bg-card px-4 py-3 shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        eventBadgeClass(u.eventType),
                      )}
                    >
                      {EVENT_LABELS[u.eventType]}
                    </span>
                    {u.fromStatus &&
                    u.toStatus &&
                    u.fromStatus !== u.toStatus &&
                    u.eventType !== "status_change" ? (
                      <span className="text-xs text-muted-foreground">
                        {STATUS_LABELS[u.fromStatus]} →{" "}
                        {STATUS_LABELS[u.toStatus]}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {format(new Date(u.createdAt), "dd MMM yyyy HH:mm", {
                        locale: localeId,
                      })}
                    </span>
                    {canDelete(u) ? (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        title="Hapus progress"
                        aria-label={`Hapus progress dari ${u.author.name}`}
                        className="anim-interactive inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {summary ? (
                    <>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {summary}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ROLE_LABELS[u.author.role]}
                      </p>
                    </>
                  ) : (
                    <div className="mt-1">
                      <p className="text-sm font-medium text-foreground">
                        {u.author.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[u.author.role]}
                      </p>
                    </div>
                  )}

                  {showMessage ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                      {u.message}
                    </p>
                  ) : null}

                  {u.attachments.length > 0 ? (
                    <div className="mt-3">
                      <AttachmentList items={u.attachments} />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!pending) setDeleteTarget(null);
        }}
        size="sm"
        title="Hapus progress?"
        description="Deskripsi dan seluruh file pendukung pada progress ini akan dihapus permanen."
      >
        {deleteTarget?.message ? (
          <div className="mb-4 rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-foreground/90">
            <p className="line-clamp-3 whitespace-pre-wrap">
              {deleteTarget.message}
            </p>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setDeleteTarget(null)}
            className="anim-interactive rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={confirmDelete}
            className="anim-interactive inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Hapus progress
          </button>
        </div>
      </Modal>
    </>
  );
}
