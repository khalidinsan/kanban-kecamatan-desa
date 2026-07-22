import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ExternalLink, LayoutDashboard } from "lucide-react";
import type { AttentionTask } from "@/lib/executive";
import { StatusBadge } from "@/components/tasks/status-badge";
import { cn } from "@/lib/utils";

const REASON_LABEL: Record<AttentionTask["reason"], string> = {
  overdue: "Terlambat",
  review: "Menunggu review",
  both: "Terlambat + review",
};

const REASON_CLASS: Record<AttentionTask["reason"], string> = {
  overdue: "bg-danger/15 text-danger",
  review: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  both: "bg-warning/15 text-warning",
};

export function AttentionTable({ tasks }: { tasks: AttentionTask[] }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/40 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          Semua aman saat ini
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tidak ada tugas terlambat atau menunggu review di cakupan ini.
        </p>
        <Link
          href="/board"
          className="anim-interactive mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-90"
        >
          <LayoutDashboard className="h-4 w-4" />
          Lihat board
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-muted text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">Tugas</th>
            <th className="px-3 py-2.5 font-medium">Wilayah</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Alasan</th>
            <th className="px-3 py-2.5 font-medium">Tanggal</th>
            <th className="px-3 py-2.5 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              className="border-b border-muted/60 last:border-0 hover:bg-muted/30"
            >
              <td className="max-w-[220px] px-3 py-3">
                <Link
                  href={`/tugas/${t.id}`}
                  className="font-medium text-foreground transition hover:text-primary"
                >
                  {t.title}
                </Link>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                <div className="font-medium text-foreground/90">
                  {t.desaName ?? "—"}
                </div>
                <div className="text-xs">{t.kecamatanName}</div>
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-3 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    REASON_CLASS[t.reason],
                  )}
                >
                  {REASON_LABEL[t.reason]}
                </span>
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {t.dueDate ? (
                  <div>
                    Tempo:{" "}
                    {format(t.dueDate, "d MMM yyyy", { locale: localeId })}
                  </div>
                ) : null}
                {t.submittedAt ? (
                  <div>
                    Review:{" "}
                    {format(t.submittedAt, "d MMM yyyy", { locale: localeId })}
                  </div>
                ) : null}
                {!t.dueDate && !t.submittedAt ? "—" : null}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/tugas/${t.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium transition hover:bg-primary/10 hover:text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Detail
                  </Link>
                  <Link
                    href="/board"
                    className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium transition hover:bg-primary/10 hover:text-primary"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Board
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
