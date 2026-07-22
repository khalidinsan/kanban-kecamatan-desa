import type { Prisma, TaskStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/authz";
import { ACTIVE_KABUPATEN } from "@/config/wilayah";
import { STATUS_LABELS } from "@/lib/labels";

export type ExecutiveScope = {
  kabupatenCode: string;
  kecamatanCode?: string;
};

/** Build Prisma where for executive metrics (camat = own kecamatan; admin = kab + optional filter). */
export function executiveWhere(
  user: SessionUser,
  kecamatanFilter?: string | null,
): Prisma.TaskWhereInput {
  const base: Prisma.TaskWhereInput = {
    kabupatenCode: ACTIVE_KABUPATEN.code,
  };

  if (user.role === "camat") {
    if (!user.kecamatanCode) {
      return { id: "__none__" };
    }
    return { ...base, kecamatanCode: user.kecamatanCode };
  }

  // admin
  if (kecamatanFilter) {
    return { ...base, kecamatanCode: kecamatanFilter };
  }
  return base;
}

export type KpiMetrics = {
  total: number;
  selesai: number;
  selesaiPct: number;
  overdue: number;
  inReview: number;
};

export function computeKpis(
  tasks: Array<{ status: TaskStatus; dueDate: Date | null }>,
  now: Date = new Date(),
): KpiMetrics {
  const total = tasks.length;
  const selesai = tasks.filter((t) => t.status === "selesai").length;
  const inReview = tasks.filter((t) => t.status === "review").length;
  const overdue = tasks.filter(
    (t) =>
      t.dueDate != null &&
      t.dueDate < now &&
      t.status !== "selesai" &&
      t.status !== "dibatalkan",
  ).length;
  const selesaiPct = total === 0 ? 0 : Math.round((selesai / total) * 1000) / 10;

  return { total, selesai, selesaiPct, overdue, inReview };
}

export type StatusSlice = {
  status: TaskStatus;
  label: string;
  count: number;
  fill: string;
};

/** Chart-friendly colors that work on light and dark card backgrounds. */
export const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  baru: "#0ea5e9",
  dikerjakan: "#f59e0b",
  review: "#8b5cf6",
  selesai: "#22c55e",
  dibatalkan: "#94a3b8",
};

export function statusDistribution(
  tasks: Array<{ status: TaskStatus }>,
): StatusSlice[] {
  const counts = new Map<TaskStatus, number>();
  for (const t of tasks) {
    counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  }

  const order: TaskStatus[] = [
    "baru",
    "dikerjakan",
    "review",
    "selesai",
    "dibatalkan",
  ];

  return order
    .map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: counts.get(status) ?? 0,
      fill: STATUS_CHART_COLORS[status],
    }))
    .filter((s) => s.count > 0);
}

export type DesaCompletionRow = {
  desaCode: string;
  desaName: string;
  total: number;
  selesai: number;
  pct: number;
};

export function completionByDesa(
  tasks: Array<{
    status: TaskStatus;
    desaCode: string | null;
    desa: { code: string; name: string } | null;
  }>,
): DesaCompletionRow[] {
  const map = new Map<
    string,
    { desaName: string; total: number; selesai: number }
  >();

  for (const t of tasks) {
    if (!t.desaCode || !t.desa) continue;
    const entry = map.get(t.desaCode) ?? {
      desaName: t.desa.name,
      total: 0,
      selesai: 0,
    };
    entry.total += 1;
    if (t.status === "selesai") entry.selesai += 1;
    map.set(t.desaCode, entry);
  }

  return Array.from(map.entries())
    .map(([desaCode, v]) => ({
      desaCode,
      desaName: v.desaName,
      total: v.total,
      selesai: v.selesai,
      pct: v.total === 0 ? 0 : Math.round((v.selesai / v.total) * 1000) / 10,
    }))
    .sort((a, b) => b.pct - a.pct || a.desaName.localeCompare(b.desaName, "id"));
}

export type AttentionTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: Date | null;
  submittedAt: Date | null;
  reason: "overdue" | "review" | "both";
  desaName: string | null;
  kecamatanName: string;
};

export function needsAttention(
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: Date | null;
    submittedAt: Date | null;
    desa: { name: string } | null;
    kecamatan: { name: string };
  }>,
  now: Date = new Date(),
): AttentionTask[] {
  const rows: AttentionTask[] = [];

  for (const t of tasks) {
    const isOverdue =
      t.dueDate != null &&
      t.dueDate < now &&
      t.status !== "selesai" &&
      t.status !== "dibatalkan";
    const inReview = t.status === "review";

    if (!isOverdue && !inReview) continue;

    rows.push({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      submittedAt: t.submittedAt,
      reason: isOverdue && inReview ? "both" : isOverdue ? "overdue" : "review",
      desaName: t.desa?.name ?? null,
      kecamatanName: t.kecamatan.name,
    });
  }

  // overdue first, then longest-waiting review
  return rows.sort((a, b) => {
    const reasonRank = (r: AttentionTask["reason"]) =>
      r === "both" ? 0 : r === "overdue" ? 1 : 2;
    const d = reasonRank(a.reason) - reasonRank(b.reason);
    if (d !== 0) return d;
    const aDue = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    const aSub = a.submittedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bSub = b.submittedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return aSub - bSub;
  });
}
