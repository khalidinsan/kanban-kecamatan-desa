"use client";

import { useState, useTransition } from "react";
import {
  Ban,
  CheckCircle2,
  Loader2,
  Play,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
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
import { Modal } from "@/components/ui/modal";

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
  const canProgress = allowed.includes("progress");
  const canStart = allowed.includes("start");
  const canSubmit =
    allowed.includes("submit_review") && progressCount >= 1;
  const canApprove = allowed.includes("approve");
  const canReject = allowed.includes("reject");
  const canCancel = allowed.includes("cancel");

  if (role === "camat") {
    return (
      <div className="rounded-2xl bg-card px-4 py-4 text-sm text-muted-foreground shadow-card">
        Mode baca saja untuk Camat. Gunakan board/executive untuk memantau
        progres.
      </div>
    );
  }

  if (role === "operator_kecamatan" || role === "admin") {
    const showReviewActions = canApprove || canReject;
    if (!showReviewActions && !canCancel) {
      return (
        <div className="rounded-2xl bg-card px-4 py-4 text-sm text-muted-foreground shadow-card">
          {status === "baru" || status === "dikerjakan"
            ? "Menunggu operator desa: mulai dikerjakan, isi progres, lalu ajukan review."
            : "Tidak ada aksi yang tersedia pada status ini."}
        </div>
      );
    }
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
          <h3 className="text-sm font-semibold">Aksi operator desa</h3>
          {canProgress ? <ProgressForm taskId={taskId} /> : null}
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

  function run(fn: () => Promise<ActionResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      onOk?.();
    });
  }

  return { pending, error, setError, run };
}

type ConfirmTone = "primary" | "amber" | "violet" | "success" | "danger";

const TONE_BTN: Record<ConfirmTone, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90",
  amber: "bg-amber-500 text-white hover:opacity-90",
  violet: "bg-violet-600 text-white hover:opacity-90",
  success: "bg-success text-white hover:opacity-90",
  danger: "bg-danger text-white hover:opacity-90",
};

function ConfirmActionModal({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  tone = "primary",
  pending,
  error,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: ConfirmTone;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      size="sm"
      title={title}
      description={description}
    >
      {children}
      {error ? (
        <p className="mb-3 text-sm text-danger">{error}</p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          className="anim-interactive rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className={`anim-interactive inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 ${TONE_BTN[tone]}`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function ProgressForm({ taskId }: { taskId: string }) {
  const { pending, error, setError, run } = useActionFeedback();
  const [key, setKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFd, setPendingFd] = useState<FormData | null>(null);
  const [preview, setPreview] = useState("");

  return (
    <>
      <form
        key={key}
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const message = String(fd.get("message") ?? "").trim();
          if (!message) {
            setError("Pesan progres wajib diisi.");
            return;
          }
          setError(null);
          setPreview(message);
          setPendingFd(fd);
          setConfirmOpen(true);
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
        {error && !confirmOpen ? (
          <p className="text-sm text-danger">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Simpan progres
        </button>
      </form>

      <ConfirmActionModal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPendingFd(null);
        }}
        title="Simpan progres?"
        description="Progres akan ditambahkan ke riwayat tugas. Pastikan deskripsi sudah benar."
        confirmLabel="Ya, simpan progres"
        tone="primary"
        pending={pending}
        error={error}
        onConfirm={() => {
          if (!pendingFd) return;
          run(
            async () => addProgress(taskId, pendingFd),
            () => {
              toast.success("Progres disimpan.");
              setConfirmOpen(false);
              setPendingFd(null);
              setKey((k) => k + 1);
            },
          );
        }}
      >
        {preview ? (
          <div className="mb-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-foreground/90">
            <p className="line-clamp-4 whitespace-pre-wrap">{preview}</p>
          </div>
        ) : null}
      </ConfirmActionModal>
    </>
  );
}

function StartButton({ taskId }: { taskId: string }) {
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
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        <Play className="h-4 w-4" />
        Mulai dikerjakan
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        title="Mulai dikerjakan?"
        description="Status tugas akan berubah dari Baru menjadi Dikerjakan. Setelah itu Anda dapat mengisi progres."
        confirmLabel="Ya, mulai dikerjakan"
        tone="amber"
        pending={pending}
        error={error}
        onConfirm={() => {
          run(
            () => startTask(taskId),
            () => {
              toast.success("Tugas mulai dikerjakan.");
              setOpen(false);
            },
          );
        }}
      />
    </div>
  );
}

function SubmitButton({ taskId }: { taskId: string }) {
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
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        Ajukan untuk review
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        title="Ajukan untuk review?"
        description="Tugas akan dikirim ke kecamatan untuk diverifikasi. Pastikan progres dan lampiran sudah lengkap."
        confirmLabel="Ya, ajukan review"
        tone="violet"
        pending={pending}
        error={error}
        onConfirm={() => {
          run(
            () => submitForReview(taskId),
            () => {
              toast.success("Tugas diajukan untuk review.");
              setOpen(false);
            },
          );
        }}
      />
    </div>
  );
}

function ApproveButton({ taskId }: { taskId: string }) {
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
        className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" />
        Verifikasi
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        title="Verifikasi tugas?"
        description="Tugas akan disetujui dan status berubah menjadi Selesai. Tindakan ini menandai pekerjaan desa telah diverifikasi."
        confirmLabel="Ya, verifikasi & selesai"
        tone="success"
        pending={pending}
        error={error}
        onConfirm={() => {
          run(
            () => approveTask(taskId),
            () => {
              toast.success("Tugas diverifikasi dan diselesaikan.");
              setOpen(false);
            },
          );
        }}
      />
    </div>
  );
}

function RejectButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const { pending, error, setError, run } = useActionFeedback();
  const [reason, setReason] = useState("");

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setReason("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        <XCircle className="h-4 w-4" />
        Tolak
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        title="Tolak tugas?"
        description="Tugas akan dikembalikan ke status Dikerjakan. Alasan penolakan wajib diisi dan akan dilihat operator desa."
        confirmLabel="Ya, tolak tugas"
        tone="danger"
        pending={pending}
        error={error}
        onConfirm={() => {
          const trimmed = reason.trim();
          if (!trimmed) {
            setError("Alasan penolakan wajib diisi.");
            return;
          }
          const fd = new FormData();
          fd.set("reason", trimmed);
          run(
            () => rejectTask(taskId, fd),
            () => {
              toast.success("Tugas ditolak dan dikembalikan ke desa.");
              setOpen(false);
              setReason("");
            },
          );
        }}
      >
        <label className="mb-3 block text-sm font-medium">
          Alasan penolakan <span className="text-danger">*</span>
          <textarea
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Dokumentasi foto belum lengkap..."
            className="mt-1.5 w-full resize-y rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
          />
        </label>
      </ConfirmActionModal>
    </div>
  );
}

function CancelButton({ taskId }: { taskId: string }) {
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
        className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground shadow-card transition hover:bg-danger/10 hover:text-danger disabled:opacity-60"
      >
        <Ban className="h-4 w-4" />
        Batalkan tugas
      </button>

      <ConfirmActionModal
        open={open}
        onClose={() => setOpen(false)}
        title="Batalkan tugas?"
        description="Tugas akan berstatus Dibatalkan. Tindakan ini tidak dapat dibatalkan kembali lewat alur normal."
        confirmLabel="Ya, batalkan tugas"
        tone="danger"
        pending={pending}
        error={error}
        onConfirm={() => {
          run(
            () => cancelTask(taskId),
            () => {
              toast.success("Tugas dibatalkan.");
              setOpen(false);
            },
          );
        }}
      />
    </div>
  );
}
