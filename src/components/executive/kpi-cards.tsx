import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
} from "lucide-react";
import type { KpiMetrics } from "@/lib/executive";
import { cn } from "@/lib/utils";

type CardDef = {
  key: keyof KpiMetrics | "selesaiPct";
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

export function KpiCards({ metrics }: { metrics: KpiMetrics }) {
  const cards: CardDef[] = [
    {
      key: "total",
      label: "Total tugas",
      value: String(metrics.total),
      hint: "Semua status dalam cakupan",
      icon: ClipboardList,
      tone: "text-primary bg-primary/10",
    },
    {
      key: "selesaiPct",
      label: "Persentase selesai",
      value: `${metrics.selesaiPct}%`,
      hint: `${metrics.selesai} dari ${metrics.total} tugas`,
      icon: CheckCircle2,
      tone: "text-success bg-success/10",
    },
    {
      key: "overdue",
      label: "Terlambat",
      value: String(metrics.overdue),
      hint: "Lewat jatuh tempo & belum selesai",
      icon: AlertTriangle,
      tone: "text-danger bg-danger/10",
    },
    {
      key: "inReview",
      label: "Menunggu review",
      value: String(metrics.inReview),
      hint: "Status review aktif",
      icon: Eye,
      tone: "text-violet-600 bg-violet-500/10 dark:text-violet-300",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="rounded-3xl bg-card p-5 shadow-card transition hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              </div>
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  card.tone,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
