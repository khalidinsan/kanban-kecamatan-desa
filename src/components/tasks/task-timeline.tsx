"use client";

import { useState, useTransition } from "react";
import type { Role, TaskStatus, TaskUpdateEventType } from "@prisma/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Loader2, Trash2 } from "lucide-react";
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
  const [deleteTarget, setDeleteTarget] = useState<TimelineUpdate | null>(null);
  const [pending, startTransition] = useTransition();

  if (updates.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>;
  }

  function canDelete(update: TimelineUpdate): boolean {
    if (taskStatus !== "dikerjakan" || update.eventType !== "progress") {
      return false;
    }
    return (
      currentUserRole === "admin" ||
      (currentUserRole === "operator_desa" &&
        update.author.id === currentUserId)
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

  return (
    <>
      <ol className="relative space-y-4 border-l border-muted pl-5">
        {updates.map((u) => (
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
                {u.fromStatus && u.toStatus && u.fromStatus !== u.toStatus ? (
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABELS[u.fromStatus]} → {STATUS_LABELS[u.toStatus]}
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
              <p className="mt-1 text-sm font-medium">{u.author.name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[u.author.role]}
              </p>
              {u.message ? (
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
        ))}
      </ol>

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
