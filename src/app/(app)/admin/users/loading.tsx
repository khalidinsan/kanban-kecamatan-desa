import { AppTopbar } from "@/components/app-topbar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Static chrome + filters; skeleton only for table rows (fetched users).
 */
export default function AdminUsersLoading() {
  return (
    <>
      <AppTopbar
        title="Manajemen Pengguna"
        subtitle="Memuat daftar pengguna…"
      />
      <div className="flex flex-1 flex-col gap-5 px-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-9 w-56 rounded-xl bg-card shadow-card" />
            <div className="h-9 w-32 rounded-xl bg-card shadow-card" />
            <div className="h-9 w-32 rounded-xl bg-card shadow-card" />
          </div>
          <div className="h-10 w-40 rounded-xl bg-primary/80 shadow-card" />
        </div>

        <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Daftar pengguna
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Kelola akun, peran, dan wilayah akses
              </p>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="col-span-3">Pengguna</span>
              <span className="col-span-2">Peran</span>
              <span className="col-span-3">Wilayah</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2 text-right">Aksi</span>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 items-center gap-2 px-3 py-3.5"
              >
                <div className="col-span-3 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="col-span-2 h-5 w-24 rounded-full" />
                <Skeleton className="col-span-3 h-4 w-28" />
                <Skeleton className="col-span-2 h-5 w-16 rounded-full" />
                <div className="col-span-2 flex justify-end gap-1">
                  <Skeleton className="h-7 w-14 rounded-lg" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
