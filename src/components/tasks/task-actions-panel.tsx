"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  Play,
  Send,
  XCircle,
  Ban,
} from "lucide-react";
import { addProgress } from "@/actions/updates";
import {
  approveTask,
  cancelTask,
  rejectTask,
  startTask,
  submitForReview,
} from "@/actions/review";
import type { ActionResult } from "@/actions/tasks";
import type { Role, TaskStatus } from "@prisma/client";
import { allowedActionsFor } from "@/lib/transitions";
import {
  DEFAULT_ACCEPT,
  FileDropzone,
} from "@/components/ui/file-dropzone";

export function TaskActionsPanel({
  taskId,
  status,
  role,
  progressCount,
}: {
  taskId: string;
  status: TaskStatus;
  role: Role;
  progressCount: number;
}) {
  const allowed = allowedActionsFor(role, status);
  // refine submit_review with real progress count
  const canProgress = allowed.includes("progress");
  const canStart = allowed.includes("start");
  const canSubmit =
    status === "dikerjakan" &&
    (role === "operator_desa" ||
      role === "operator_kecamatan" ||
      role === "admin") &&
    progressCount >= 1;
  const canApprove = allowed.includes("approve");
  const canReject = allowed.includes("reject");
  const canCancel = allowed.includes("cancel");

  // Camat: read-only — no write actions
  if (role === "camat") {
    return (
      <div className="rounded-2xl bg-card px-4 py-4 text-sm text-muted-foreground shadow-card">
        Mode baca saja untuk Camat. Gunakan board/executive untuk memantau
        progres.
      </div>
    );
  }

  const showDesaActions = canProgress || canStart || canSubmit;
  const showReviewActions = canApprove || canReject;
  const showAny = showDesaActions || showReviewActions || canCancel;

  if (!showAny) {
    return (
      <div className="rounded-2xl bg-card px-4 py-4 text-sm text-muted-foreground shadow-card">
        Tidak ada aksi yang tersedia pada status ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showDesaActions ? (
        <div className="space-y-4 rounded-2xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold">Aksi desa / pelaksana</h3>
          {canProgress ? (
            <ProgressForm taskId={taskId} />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canStart ? <StartButton taskId={taskId} /> : null}
            {canSubmit ? <SubmitButton taskId={taskId} /> : null}
            {status === "baru" && canStart ? (
              <p className="w-full text-xs text-muted-foreground">
                Mulai dikerjakan terlebih dahulu untuk mengisi progres.
              </p>
            ) : null}
            {status === "dikerjakan" && progressCount < 1 ? (
              <p className="w-full text-xs text-muted-foreground">
                Minimal 1 update progres diperlukan sebelum mengajukan review.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showReviewActions ? (
        <div className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold">Verifikasi kecamatan</h3>
          <div className="flex flex-wrap gap-2">
            {canApprove ? <ApproveButton taskId={taskId} /> : null}
            {canReject ? <RejectButton taskId={taskId} /> : null}
          </div>
        </div>
      ) : null}

      {canCancel ? (
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <CancelButton taskId={taskId} />
        </div>
      ) : null}
    </div>
  );
}

function useActionFeedback() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
    });
  }

  return { pending, error, setError, run };
}

function ProgressForm({ taskId }: { taskId: string }) {
  const { pending, error, setError, run } = useActionFeedback();
  const [key, setKey] = useState(0);

  return (
    <form
      key={key}
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        run(async () => {
          const result = await addProgress(taskId, fd);
          if (result.ok) {
            form.reset();
            setKey((k) => k + 1);
          }
          return result;
        });
      }}
    >
      <label className="block text-sm font-medium">
        Tambah progres
        <textarea
          name="message"
          required
          rows={3}
          maxLength={5000}
          placeholder="Jelaskan progres pekerjaan..."
          className="mt-1.5 w-full resize-y rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
        />
      </label>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Lampiran (opsional)</span>
        <FileDropzone name="files" multiple accept={DEFAULT_ACCEPT} />
      </div>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        onClick={() => setError(null)}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Simpan progres
      </button>
    </form>
  );
}

function StartButton({ taskId }: { taskId: string }) {
  const { pending, error, run } = useActionFeedback();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => startTask(taskId))}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Mulai dikerjakan
      </button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function SubmitButton({ taskId }: { taskId: string }) {
  const { pending, error, run } = useActionFeedback();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => submitForReview(taskId))}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Ajukan untuk review
      </button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function ApproveButton({ taskId }: { taskId: string }) {
  const { pending, error, run } = useActionFeedback();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => approveTask(taskId))}
        className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Verifikasi
      </button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function RejectButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const { pending, error, setError, run } = useActionFeedback();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        <XCircle className="h-4 w-4" />
        Tolak
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-5 shadow-elevated"
          >
            <h4 className="text-base font-semibold">Tolak tugas</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Alasan penolakan wajib diisi. Tugas akan kembali ke status
              dikerjakan.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                run(async () => {
                  const result = await rejectTask(taskId, fd);
                  if (result.ok) setOpen(false);
                  return result;
                });
              }}
            >
              <textarea
                name="reason"
                required
                rows={4}
                placeholder="Contoh: Dokumentasi foto belum lengkap..."
                className="w-full resize-y rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
              />
              {error ? (
                <p className="text-sm text-danger">{error}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white shadow-card disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Konfirmasi tolak
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CancelButton({ taskId }: { taskId: string }) {
  const { pending, error, run } = useActionFeedback();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            typeof window !== "undefined" &&
            !window.confirm("Batalkan tugas ini? Tindakan tidak dapat dibatalkan.")
          ) {
            return;
          }
          run(() => cancelTask(taskId));
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground shadow-card transition hover:bg-danger/10 hover:text-danger disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Ban className="h-4 w-4" />
        )}
        Batalkan tugas
      </button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
