import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Static: page chrome + section titles.
 * Skeleton: task fields, attachments, timeline, actions (fetched).
 */
export default function TaskDetailLoading() {
  return (
    <>
      <AppTopbar title="Detail Tugas" subtitle="Memuat data tugas…" />
      <div className="flex flex-1 flex-col gap-6 px-6 pb-10">
        <Link
          href="/board"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke board
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-3xl bg-card p-6 shadow-card">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-7 w-3/4 max-w-md" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {["Desa", "Kecamatan", "Dibuat oleh", "Jatuh tempo"].map(
                  (label) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1">
                        <Skeleton className="h-4 w-28" />
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </section>

            <section className="rounded-3xl bg-card p-6 shadow-card">
              <h2 className="text-sm font-semibold">Lampiran</h2>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </section>

            <section className="rounded-3xl bg-card p-6 shadow-card">
              <h2 className="text-sm font-semibold">Riwayat progres</h2>
              <div className="mt-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-full max-w-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <section className="rounded-3xl bg-card p-5 shadow-card">
              <h2 className="text-sm font-semibold">Aksi</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Memuat aksi yang tersedia…
              </p>
              <div className="mt-4 space-y-2.5">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
