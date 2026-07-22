import { format } from "date-fns";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildCsv, CSV_CONTENT_TYPE } from "@/lib/csv";
import { canAccessExecutive, type SessionUser } from "@/lib/authz";
import { executiveWhere } from "@/lib/executive";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const EXECUTIVE_HEADERS = [
  "id",
  "title",
  "status",
  "priority",
  "kecamatan",
  "desa",
  "dueDate",
  "submittedAt",
  "completedAt",
  "overdue",
  "lastRejectionReason",
  "progressCount",
  "attachmentCount",
  "createdAt",
  "updatedAt",
] as const;

/**
 * GET /api/export/executive?kecamatan=CODE
 * Auth: camat | admin. Camat is scoped to own kecamatan; admin may filter.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (!canAccessExecutive(user)) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke export executive." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const kecamatanFilter =
    user.role === "admin" ? (searchParams.get("kecamatan")?.trim() || null) : null;

  const where = executiveWhere(user, kecamatanFilter);
  const now = new Date();

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      submittedAt: true,
      completedAt: true,
      lastRejectionReason: true,
      createdAt: true,
      updatedAt: true,
      desa: { select: { name: true } },
      kecamatan: { select: { name: true } },
      _count: {
        select: {
          // progress events only (matches board progressCount)
          updates: { where: { eventType: "progress" as const } },
          attachments: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { title: "asc" }],
  });

  const rows = tasks.map((t) => {
    const isOverdue =
      t.dueDate != null &&
      t.dueDate < now &&
      t.status !== "selesai" &&
      t.status !== "dibatalkan";

    return {
      id: t.id,
      title: t.title,
      status: STATUS_LABELS[t.status] ?? t.status,
      priority: PRIORITY_LABELS[t.priority] ?? t.priority,
      kecamatan: t.kecamatan.name,
      desa: t.desa?.name ?? "",
      dueDate: t.dueDate ? format(t.dueDate, "yyyy-MM-dd") : "",
      submittedAt: t.submittedAt
        ? format(t.submittedAt, "yyyy-MM-dd HH:mm")
        : "",
      completedAt: t.completedAt
        ? format(t.completedAt, "yyyy-MM-dd HH:mm")
        : "",
      overdue: isOverdue ? "ya" : "tidak",
      lastRejectionReason: t.lastRejectionReason ?? "",
      progressCount: t._count.updates,
      attachmentCount: t._count.attachments,
      createdAt: format(t.createdAt, "yyyy-MM-dd HH:mm"),
      updatedAt: format(t.updatedAt, "yyyy-MM-dd HH:mm"),
    };
  });

  const csv = buildCsv([...EXECUTIVE_HEADERS], rows);
  const stamp = format(now, "yyyyMMdd-HHmm");
  const scope =
    user.role === "camat"
      ? user.kecamatanCode ?? "camat"
      : kecamatanFilter ?? "kabupaten";
  const filename = `sikilat-executive-${scope}-${stamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": CSV_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
