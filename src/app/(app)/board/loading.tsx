import { AppTopbar } from "@/components/app-topbar";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS } from "@/lib/labels";

const COLUMNS = ["baru", "dikerjakan", "review", "selesai"] as const;

/**
 * Static: title, filter chrome, column labels.
 * Skeleton: task cards only (fetched data).
 */
export default function BoardLoading() {
  return (
    <>
      <AppTopbar title="Board Tugas" subtitle="Memuat tugas…" />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 pb-8">
        <div className="flex flex-wrap gap-2.5">
          <input
            disabled
            placeholder="Cari judul tugas..."
            className="h-9 w-64 rounded-xl bg-card px-3 text-sm shadow-card outline-none disabled:opacity-80"
          />
          <select
            disabled
            className="h-9 rounded-xl bg-card px-3 text-sm shadow-card outline-none disabled:opacity-80"
          >
            <option>Semua desa</option>
          </select>
          <select
            disabled
            className="h-9 rounded-xl bg-card px-3 text-sm shadow-card outline-none disabled:opacity-80"
          >
            <option>Semua prioritas</option>
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          Seret kartu: Baru → Dikerjakan, Dikerjakan → Review (min. 1 progres).
          Review → Selesai/Dikerjakan via dialog Verifikasi/Tolak.
        </p>

        <div className="flex flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-2">
          {COLUMNS.map((status) => (
            <div
              key={status}
              className="flex w-72 shrink-0 flex-col gap-2.5 rounded-3xl bg-muted/40 p-3 shadow-card"
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="rounded-full bg-card px-2.5 py-1 text-xs font-semibold shadow-card">
                  {STATUS_LABELS[status]}
                </span>
                <Skeleton className="h-5 w-7 rounded-full" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-24 rounded-2xl bg-card shadow-card" />
                <Skeleton className="h-24 rounded-2xl bg-card shadow-card" />
                <Skeleton className="h-20 rounded-2xl bg-card/70 shadow-card" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
