import { Suspense } from "react";
import Link from "next/link";
import { Inbox, LayoutDashboard, PlusCircle } from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { AttentionTable } from "@/components/executive/attention-table";
import { CompletionByDesaChart } from "@/components/executive/completion-by-desa-chart";
import { ExecutiveExportButton } from "@/components/executive/executive-export-button";
import { KecamatanFilter } from "@/components/executive/kecamatan-filter";
import { KpiCards } from "@/components/executive/kpi-cards";
import { StatusChart } from "@/components/executive/status-chart";
import { ACTIVE_KABUPATEN } from "@/config/wilayah";
import { requireRole } from "@/lib/authz";
import {
  completionByDesa,
  computeKpis,
  executiveWhere,
  needsAttention,
  statusDistribution,
} from "@/lib/executive";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{ kecamatan?: string }>;
};

export default async function ExecutivePage({ searchParams }: PageProps) {
  const user = await requireRole("admin", "camat");
  const params = await searchParams;
  const kecamatanFilter =
    user.role === "admin" ? (params.kecamatan?.trim() || null) : null;

  const where = executiveWhere(user, kecamatanFilter);

  const [tasks, kecamatanList, scopeKecamatan] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        submittedAt: true,
        desaCode: true,
        desa: { select: { code: true, name: true } },
        kecamatan: { select: { code: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    user.role === "admin"
      ? prisma.kecamatan.findMany({
          where: { kabupatenCode: ACTIVE_KABUPATEN.code },
          orderBy: { name: "asc" },
          select: { code: true, name: true },
        })
      : Promise.resolve([]),
    user.role === "camat" && user.kecamatanCode
      ? prisma.kecamatan.findUnique({
          where: { code: user.kecamatanCode },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const kpis = computeKpis(tasks);
  const statusData = statusDistribution(tasks);
  const desaData = completionByDesa(tasks);
  const attention = needsAttention(tasks);

  const subtitle =
    user.role === "camat"
      ? `Ringkasan Kecamatan ${scopeKecamatan?.name ?? user.kecamatanCode ?? "—"} · hanya baca`
      : kecamatanFilter
        ? `Filter: ${kecamatanList.find((k) => k.code === kecamatanFilter)?.name ?? kecamatanFilter}`
        : `Kabupaten ${ACTIVE_KABUPATEN.name} · semua kecamatan`;

  return (
    <>
      <AppTopbar title="Dashboard Executive" subtitle={subtitle} />
      <div className="flex flex-1 flex-col gap-6 px-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {user.role === "admin" ? (
            <Suspense
              fallback={
                <div className="h-9 w-48 animate-pulse rounded-xl bg-muted" />
              }
            >
              <KecamatanFilter options={kecamatanList} />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tampilan eksekutif (camat) — tidak dapat mengubah status tugas di
              sini.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ExecutiveExportButton kecamatanCode={kecamatanFilter} />
            <Link
              href="/board"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <LayoutDashboard className="h-4 w-4" />
              Buka board
            </Link>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-card px-6 py-16 text-center shadow-card">
            <Inbox className="h-8 w-8 text-muted-foreground/70" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              Belum ada data tugas
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {kecamatanFilter
                ? "Tidak ada tugas di kecamatan yang dipilih. Ubah filter atau buka board untuk membuat tugas."
                : "Dashboard akan menampilkan KPI, grafik, dan tugas yang perlu perhatian setelah ada data di board."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/board"
                className="anim-interactive inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90"
              >
                <LayoutDashboard className="h-4 w-4" />
                Buka board
              </Link>
              {user.role === "admin" ? (
                <Link
                  href="/tugas/baru"
                  className="anim-interactive inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80"
                >
                  <PlusCircle className="h-4 w-4" />
                  Buat tugas
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <KpiCards metrics={kpis} />

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
                <h2 className="text-sm font-semibold tracking-tight">
                  Distribusi status
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Proporsi tugas berdasarkan status saat ini
                </p>
                <div className="mt-4">
                  <StatusChart data={statusData} />
                </div>
              </section>

              <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
                <h2 className="text-sm font-semibold tracking-tight">
                  Penyelesaian per desa
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Persentase tugas berstatus selesai
                </p>
                <div className="mt-4">
                  <CompletionByDesaChart data={desaData} />
                </div>
              </section>
            </div>

            <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    Perlu perhatian
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tugas terlambat dan/atau masih menunggu review
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {attention.length} item
                </span>
              </div>
              <AttentionTable tasks={attention} />
            </section>
          </>
        )}
      </div>
    </>
  );
}
