import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Calendar, MapPin, User } from "lucide-react";
import { AppTopbar } from "@/components/app-topbar";
import { AttachmentList } from "@/components/tasks/attachment-list";
import { PriorityBadge, StatusBadge } from "@/components/tasks/status-badge";
import { TaskActionsPanel } from "@/components/tasks/task-actions-panel";
import { TaskTimeline } from "@/components/tasks/task-timeline";
import {
  assertTaskAccess,
  AuthzError,
  requireSession,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TASK_DETAIL_INCLUDE } from "@/lib/tasks-query";

type PageProps = { params: Promise<{ id: string }> };

export default async function TaskDetailPage({ params }: PageProps) {
  const user = await requireSession();
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: TASK_DETAIL_INCLUDE,
  });

  if (!task) notFound();

  try {
    assertTaskAccess(user, task, "read");
  } catch (err) {
    if (err instanceof AuthzError) notFound();
    throw err;
  }

  const progressCount = task.updates.filter(
    (u) => u.eventType === "progress",
  ).length;

  return (
    <>
      <AppTopbar
        title="Detail Tugas"
        subtitle={task.kecamatan.name}
      />
      <div className="flex flex-1 flex-col gap-6 px-6 pb-10">
        <div>
          <Link
            href="/board"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke board
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-3xl bg-card p-6 shadow-card">
              <div className="flex flex-wrap items-start gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">
                {task.title}
              </h2>
              {task.description ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {task.description}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Tidak ada deskripsi.
                </p>
              )}

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Desa</dt>
                    <dd className="font-medium">
                      {task.desa?.name ?? "—"}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      {task.kecamatan.name}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Jatuh tempo
                    </dt>
                    <dd className="font-medium">
                      {task.dueDate
                        ? format(task.dueDate, "dd MMMM yyyy", {
                            locale: localeId,
                          })
                        : "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Dibuat oleh</dt>
                    <dd className="font-medium">{task.createdBy.name}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Dibuat</dt>
                    <dd className="font-medium">
                      {format(task.createdAt, "dd MMM yyyy HH:mm", {
                        locale: localeId,
                      })}
                    </dd>
                  </div>
                </div>
              </dl>

              {task.lastRejectionReason ? (
                <div className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
                  <p className="font-semibold">Alasan penolakan terakhir</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {task.lastRejectionReason}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl bg-card p-6 shadow-card">
              <h3 className="text-sm font-semibold">Lampiran tugas</h3>
              <div className="mt-3">
                <AttachmentList items={task.attachments} />
              </div>
            </section>

            <section className="rounded-3xl bg-card p-6 shadow-card">
              <h3 className="mb-4 text-sm font-semibold">
                Riwayat & progres
              </h3>
              <TaskTimeline
                updates={task.updates}
                currentUserId={user.id}
                currentUserRole={user.role}
                taskStatus={task.status}
              />
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <TaskActionsPanel
              taskId={task.id}
              status={task.status}
              role={user.role}
              progressCount={progressCount}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
