import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  assertTaskAccess,
  AuthzError,
  type SessionUser,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { absoluteUploadPath, UploadError } from "@/lib/uploads";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/uploads/:id
 * Serve a task or task-update attachment by id after auth + task access check.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const { id } = await context.params;

  try {
    const taskAttachment = await prisma.taskAttachment.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            kecamatanCode: true,
            desaCode: true,
            createdById: true,
            assignedToId: true,
            kabupatenCode: true,
          },
        },
      },
    });

    if (taskAttachment) {
      assertTaskAccess(user, taskAttachment.task, "read");
      return streamFile(taskAttachment);
    }

    const updateAttachment = await prisma.taskUpdateAttachment.findUnique({
      where: { id },
      include: {
        update: {
          include: {
            task: {
              select: {
                id: true,
                kecamatanCode: true,
                desaCode: true,
                createdById: true,
                assignedToId: true,
                kabupatenCode: true,
              },
            },
          },
        },
      },
    });

    if (updateAttachment) {
      assertTaskAccess(user, updateAttachment.update.task, "read");
      return streamFile(updateAttachment);
    }

    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  } catch (err) {
    if (err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("upload GET error", err);
    return NextResponse.json(
      { error: "Gagal membaca file." },
      { status: 500 },
    );
  }
}

async function streamFile(meta: {
  path: string;
  mimeType: string;
  originalName: string;
  size: number;
}) {
  const abs = absoluteUploadPath(meta.path);
  try {
    await stat(abs);
  } catch {
    return NextResponse.json(
      { error: "File tidak ada di penyimpanan." },
      { status: 404 },
    );
  }

  const nodeStream = createReadStream(abs);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": meta.mimeType || "application/octet-stream",
      "Content-Length": String(meta.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(meta.originalName)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
