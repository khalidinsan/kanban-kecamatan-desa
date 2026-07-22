"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  Play,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveTask,
  rejectTask,
  startTask,
  submitForReview,
} from "@/actions/review";
import type { ActionResult } from "@/actions/tasks";
import type { BoardTask, BoardUser } from "@/components/board/types";
import { Modal } from "@/components/ui/modal";
import type { Role, TaskStatus } from "@prisma/client";

/** Desa executes work; kecamatan/admin only review. */
const DESA_EXEC: Role[] = ["operator_desa"];
const KEC_REVIEW: Role[] = ["operator_kecamatan", "admin"];

function canStart(role: Role) {
  return DESA_EXEC.includes(role);
}

function canSubmit(role: Role) {
  return DESA_EXEC.includes(role);
}

function canReview(role: Role) {
  return KEC_REVIEW.includes(role);
}

async function runBulk(
  ids: string[],
  action: (id: string) => Promise<ActionResult>,
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const id of ids) {
    const result = await action(id);
    if (result.ok) ok += 1;
    else fail += 1;
  }
  return { ok, fail };
}

function toastSummary(ok: number, fail: number, successLabel: string) {
  if (ok > 0 && fail === 0) {
    toast.success(`${ok} tugas ${successLabel}.`);
  } else if (ok > 0 && fail > 0) {
    toast.warning(`${ok} sukses, ${fail} gagal.`);
  } else if (fail > 0) {
    toast.error(`${fail} tugas gagal diproses.`);
  }
}

type ConfirmKind = "start" | "submit" | "approve" | "reject" | null;

export function BulkActionsBar({
  selectedTasks,
  user,
  onClear,
  onSuccess,
}: {
  selectedTasks: BoardTask[];
  user: BoardUser;
  onClear: () => void;
  onSuccess: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const count = selectedTasks.length;

  const uniformStatus = useMemo((): TaskStatus | null => {
    if (count === 0) return null;
    const first = selectedTasks[0]!.status;
    return selectedTasks.every((t) => t.status === first) ? first : null;
  }, [selectedTasks, count]);

  if (count === 0) return null;

  const role = user.role;
  const showStart = uniformStatus === "baru" && canStart(role);
  const showSubmit = uniformStatus === "dikerjakan" && canSubmit(role);
  const showReviewActions =
    uniformStatus === "review" && (user.canReview || canReview(role));

  const hasActions = showStart || showSubmit || showReviewActions;

  const eligibleSubmit = selectedTasks.filter((t) => t.progressCount >= 1);
  const skippedSubmit = selectedTasks.length - eligibleSubmit.length;

  function finishBulk(ok: number, fail: number, successLabel: string) {
    toastSummary(ok, fail, successLabel);
    setConfirm(null);
    setRejectReason("");
    setRejectError(null);
    if (ok > 0) {
      onClear();
      onSuccess();
    }
  }

  function closeConfirm() {
    if (pending) return;
    setConfirm(null);
    setRejectError(null);
  }

  function runStart() {
    const ids = selectedTasks.map((t) => t.id);
    startTransition(async () => {
      const { ok, fail } = await runBulk(ids, startTask);
      finishBulk(ok, fail, "mulai dikerjakan");
    });
  }

  function runSubmit() {
    if (eligibleSubmit.length === 0) {
      toast.message("Tidak ada tugas yang memenuhi syarat ajukan review.");
      setConfirm(null);
      return;
    }
    if (skippedSubmit > 0) {
      toast.message(
        `${skippedSubmit} tugas dilewati (belum ada update progres).`,
      );
    }
    const ids = eligibleSubmit.map((t) => t.id);
    startTransition(async () => {
      const { ok, fail } = await runBulk(ids, submitForReview);
      finishBulk(ok, fail, "diajukan untuk review");
    });
  }

  function runApprove() {
    const ids = selectedTasks.map((t) => t.id);
    startTransition(async () => {
      const { ok, fail } = await runBulk(ids, approveTask);
      finishBulk(ok, fail, "diverifikasi");
    });
  }

  function runReject() {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError("Alasan penolakan wajib diisi.");
      return;
    }
    setRejectError(null);
    const ids = selectedTasks.map((t) => t.id);
    startTransition(async () => {
      const { ok, fail } = await runBulk(ids, (id) => {
        const fd = new FormData();
        fd.set("reason", trimmed);
        return rejectTask(id, fd);
      });
      finishBulk(ok, fail, "ditolak");
    });
  }

  return (
    <>
      <div className="sticky bottom-3 z-20 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-muted/60 bg-card/95 px-3 py-2.5 shadow-elevated backdrop-blur-sm sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-bold tabular-nums text-primary">
            {count}
          </span>
          <span className="truncate text-sm font-medium text-foreground">
            dipilih
          </span>
          {!hasActions && uniformStatus === null ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              — pilih tugas dengan status yang sama
            </span>
          ) : null}
          {!hasActions && uniformStatus !== null ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              — tidak ada aksi bulk untuk status ini
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {showStart ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirm("start")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
            >
              <Play className="h-3.5 w-3.5" />
              Mulai dikerjakan
            </button>
          ) : null}

          {showSubmit ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirm("submit")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              Ajukan review
            </button>
          ) : null}

          {showReviewActions ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirm("approve")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-success px-3 py-1.5 text-xs font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verifikasi
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setRejectError(null);
                  setRejectReason("");
                  setConfirm("reject");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-3 py-1.5 text-xs font-semibold text-white shadow-card transition hover:opacity-90 disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" />
                Tolak
              </button>
            </>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
            aria-label="Batalkan pilihan"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Batal</span>
          </button>
        </div>
      </div>

      <Modal
        open={confirm === "start"}
        onClose={closeConfirm}
        size="sm"
        title={`Mulai dikerjakan ${count} tugas?`}
        description="Semua tugas terpilih akan berstatus Dikerjakan. Pastikan pilihan sudah benar."
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={closeConfirm}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={runStart}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ya, mulai dikerjakan
          </button>
        </div>
      </Modal>

      <Modal
        open={confirm === "submit"}
        onClose={closeConfirm}
        size="sm"
        title={`Ajukan review ${eligibleSubmit.length || count} tugas?`}
        description={
          skippedSubmit > 0
            ? `${eligibleSubmit.length} tugas memenuhi syarat. ${skippedSubmit} tugas tanpa progres akan dilewati.`
            : "Tugas akan dikirim ke kecamatan untuk diverifikasi. Pastikan progres sudah lengkap."
        }
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={closeConfirm}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending || eligibleSubmit.length === 0}
            onClick={runSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ya, ajukan review
          </button>
        </div>
      </Modal>

      <Modal
        open={confirm === "approve"}
        onClose={closeConfirm}
        size="sm"
        title={`Verifikasi ${count} tugas?`}
        description="Semua tugas terpilih akan disetujui dan berstatus Selesai."
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={closeConfirm}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={runApprove}
            className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ya, verifikasi
          </button>
        </div>
      </Modal>

      <Modal
        open={confirm === "reject"}
        onClose={closeConfirm}
        size="sm"
        title={`Tolak ${count} tugas?`}
        description="Alasan penolakan yang sama akan diterapkan ke semua tugas terpilih. Status kembali ke Dikerjakan."
      >
        <label className="mb-3 block text-sm font-medium">
          Alasan penolakan <span className="text-danger">*</span>
          <textarea
            required
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={pending}
            placeholder="Contoh: Dokumentasi foto belum lengkap..."
            className="mt-1.5 w-full resize-y rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card disabled:opacity-60"
          />
        </label>
        {rejectError ? (
          <p className="mb-3 text-sm text-danger">{rejectError}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={closeConfirm}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={runReject}
            className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ya, tolak
          </button>
        </div>
      </Modal>
    </>
  );
}
