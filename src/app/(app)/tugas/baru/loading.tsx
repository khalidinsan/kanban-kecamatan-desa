import { AppTopbar } from "@/components/app-topbar";
import { PRIORITY_LABELS } from "@/lib/labels";

/**
 * Static form shell — only wilayah options are fetched.
 * Labels / inputs stay real; desa (and kecamatan for admin) show a loading select.
 */
export default function TugasBaruLoading() {
  return (
    <>
      <AppTopbar
        title="Tugas Baru"
        subtitle="Buat tugas dan tugaskan ke desa"
      />
      <div className="flex flex-1 flex-col px-6 pb-8">
        <div className="mx-auto w-full max-w-2xl rounded-3xl bg-card p-6 shadow-card sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Judul tugas <span className="text-danger">*</span>
              </label>
              <input
                disabled
                className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none disabled:opacity-70"
                placeholder="Contoh: Perbaikan drainase RT 03"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi</label>
              <textarea
                disabled
                rows={4}
                className="w-full resize-y rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none disabled:opacity-70"
                placeholder="Uraian singkat pekerjaan yang harus diselesaikan desa..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioritas</label>
                <select
                  disabled
                  defaultValue="sedang"
                  className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none disabled:opacity-70"
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jatuh tempo</label>
                <input
                  type="date"
                  disabled
                  className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none disabled:opacity-70"
                />
              </div>
            </div>

            {/* Fetched: wilayah options only */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Desa tujuan <span className="text-danger">*</span>
              </label>
              <select
                disabled
                className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none disabled:opacity-70"
              >
                <option>Memuat daftar desa…</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lampiran (opsional)</label>
              <div className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground shadow-card">
                Seret & lepas file di sini, atau klik untuk pilih
                <p className="mt-1 text-xs">Maks. 10 MB per file</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground opacity-60 shadow-card"
              >
                Buat Tugas
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
