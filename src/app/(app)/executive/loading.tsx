import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_LABELS = [
  "Total tugas",
  "% Selesai",
  "Terlambat",
  "Menunggu review",
] as const;

/**
 * Static: titles, KPI labels, section headings, CTA.
 * Skeleton: numbers, charts, table rows (fetched).
 */
export default function ExecutiveLoading() {
  return (
    <>
      <AppTopbar
        title="Dashboard Executive"
        subtitle="Memuat ringkasan…"
      />
      <div className="flex flex-1 flex-col gap-6 px-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Memuat filter wilayah…</p>
          <Link
            href="/board"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-card px-3 text-sm font-medium shadow-card transition hover:opacity-90"
          >
            <LayoutDashboard className="h-4 w-4" />
            Board
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_LABELS.map((label) => (
            <div key={label} className="rounded-3xl bg-card p-5 shadow-card">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Skeleton className="mt-2.5 h-9 w-16" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
            <h2 className="text-sm font-semibold">Distribusi status</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Proporsi tugas per kolom kanban
            </p>
            <Skeleton className="mt-4 h-56 w-full rounded-2xl" />
          </section>
          <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
            <h2 className="text-sm font-semibold">Penyelesaian per desa</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Persentase tugas selesai di tiap desa
            </p>
            <Skeleton className="mt-4 h-56 w-full rounded-2xl" />
          </section>
        </div>

        <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-sm font-semibold">Perlu perhatian</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tugas terlambat atau masih menunggu review
          </p>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
