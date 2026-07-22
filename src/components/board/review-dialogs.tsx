"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { approveTask, rejectTask } from "@/actions/review";
import type { ReviewModalState } from "@/components/board/types";

export function ReviewDialogs({
  modal,
  onClose,
  onSuccess,
}: {
  modal: ReviewModalState;
  onClose: () => void;
  onSuccess: (
    taskId: string,
    nextStatus: "selesai" | "dikerjakan",
    extra?: { lastRejectionReason?: string | null },
  ) => void;
}) {
  if (!modal) return null;

  if (modal.type === "approve") {
    return (
      <ApproveDialog
        taskId={modal.taskId}
        title={modal.title}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <RejectDialog
      taskId={modal.taskId}
      title={modal.title}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button
        type="button"
        aria-label="Tutup dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl bg-card p-5 shadow-elevated"
      >
        {children}
      </div>
    </div>
  );
}

function ApproveDialog({
  taskId,
  title,
  onClose,
  onSuccess,
}: {
  taskId: string;
  title: string;
  onClose: () => void;
  onSuccess: (
    taskId: string,
    nextStatus: "selesai",
    extra?: { lastRejectionReason?: string | null },
  ) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Backdrop onClose={pending ? () => undefined : onClose}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-base font-semibold">Verifikasi tugas</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Setujui dan selesaikan tugas{" "}
            <span className="font-medium text-foreground">&ldquo;{title}&rdquo;</span>?
            Tugas akan berstatus Selesai.
          </p>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await approveTask(taskId);
              if (!result.ok) {
                setError(result.error);
                toast.error(result.error);
                return;
              }
              toast.success("Tugas diverifikasi dan diselesaikan.");
              onSuccess(taskId, "selesai", { lastRejectionReason: null });
              onClose();
            });
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Konfirmasi verifikasi
        </button>
      </div>
    </Backdrop>
  );
}

function RejectDialog({
  taskId,
  title,
  onClose,
  onSuccess,
}: {
  taskId: string;
  title: string;
  onClose: () => void;
  onSuccess: (
    taskId: string,
    nextStatus: "dikerjakan",
    extra?: { lastRejectionReason?: string | null },
  ) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  return (
    <Backdrop onClose={pending ? () => undefined : onClose}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
          <XCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-base font-semibold">Tolak tugas</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Tolak{" "}
            <span className="font-medium text-foreground">&ldquo;{title}&rdquo;</span>.
            Alasan wajib diisi; status kembali ke Dikerjakan.
          </p>
        </div>
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = reason.trim();
          if (!trimmed) {
            setError("Alasan penolakan wajib diisi.");
            return;
          }
          setError(null);
          const fd = new FormData();
          fd.set("reason", trimmed);
          startTransition(async () => {
            const result = await rejectTask(taskId, fd);
            if (!result.ok) {
              setError(result.error);
              toast.error(result.error);
              return;
            }
            toast.success("Tugas ditolak dan dikembalikan ke dikerjakan.");
            onSuccess(taskId, "dikerjakan", {
              lastRejectionReason: trimmed,
            });
            onClose();
          });
        }}
      >
        <textarea
          name="reason"
          required
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Contoh: Dokumentasi foto belum lengkap..."
          className="w-full resize-y rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Konfirmasi tolak
          </button>
        </div>
      </form>
    </Backdrop>
  );
}
