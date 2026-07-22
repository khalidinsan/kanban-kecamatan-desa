"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import type { TaskPriority } from "@prisma/client";
import { z } from "zod";
import {
  AuthzError,
  requireSession,
  type SessionUser,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ACTIVE_KABUPATEN } from "@/config/wilayah";
import {
  filesFromFormData,
  saveUploadFiles,
  UploadError,
} from "@/lib/uploads";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const PRIORITIES = ["rendah", "sedang", "tinggi", "mendesak"] as const;

const createTaskSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  priority: z.enum(PRIORITIES).default("sedang"),
  dueDate: z.string().optional().nullable(),
  desaCode: z.string().min(1, "Desa wajib dipilih."),
  kecamatanCode: z.string().optional().nullable(),
});

function canCreateTask(user: SessionUser): boolean {
  return user.role === "admin" || user.role === "operator_kecamatan";
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const user = await requireSession();

  if (!canCreateTask(user)) {
    return {
      ok: false,
      error: "Hanya operator kecamatan atau admin yang dapat membuat tugas.",
    };
  }

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    priority: formData.get("priority") || "sedang",
    dueDate: formData.get("dueDate") || null,
    desaCode: formData.get("desaCode"),
    kecamatanCode: formData.get("kecamatanCode") || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Data tidak valid.";
    return { ok: false, error: first };
  }

  const data = parsed.data;

  try {
    const desa = await prisma.desa.findUnique({
      where: { code: data.desaCode },
      include: {
        kecamatan: { select: { code: true, kabupatenCode: true } },
      },
    });

    if (!desa) {
      return { ok: false, error: "Desa tidak ditemukan." };
    }

    if (user.role === "operator_kecamatan") {
      if (!user.kecamatanCode || desa.kecamatanCode !== user.kecamatanCode) {
        return {
          ok: false,
          error: "Desa harus berada dalam wilayah kecamatan Anda.",
        };
      }
    }

    if (user.role === "admin" && data.kecamatanCode) {
      if (desa.kecamatanCode !== data.kecamatanCode) {
        return {
          ok: false,
          error: "Desa tidak cocok dengan kecamatan yang dipilih.",
        };
      }
    }

    let dueDate: Date | null = null;
    if (data.dueDate) {
      const d = new Date(data.dueDate);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Tanggal jatuh tempo tidak valid." };
      }
      dueDate = d;
    }

    const files = filesFromFormData(formData);
    if (files.length > 10) {
      return { ok: false, error: "Maksimal 10 lampiran." };
    }

    let saved;
    try {
      saved = await saveUploadFiles(files);
    } catch (err) {
      if (err instanceof UploadError) {
        return { ok: false, error: err.message };
      }
      throw err;
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority as TaskPriority,
        dueDate,
        status: "baru",
        kabupatenCode: desa.kecamatan.kabupatenCode || ACTIVE_KABUPATEN.code,
        kecamatanCode: desa.kecamatanCode,
        desaCode: desa.code,
        createdById: user.id,
        attachments:
          saved.length > 0
            ? {
                create: saved.map((f) => ({
                  fileName: f.fileName,
                  originalName: f.originalName,
                  mimeType: f.mimeType,
                  size: f.size,
                  path: f.path,
                })),
              }
            : undefined,
        updates: {
          create: {
            authorId: user.id,
            eventType: "status_change",
            message: "Tugas dibuat",
            fromStatus: null,
            toStatus: "baru",
          },
        },
      },
    });

    revalidatePath("/board");
    revalidatePath(`/tugas/${task.id}`);
    redirect(`/tugas/${task.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    console.error("createTask error", err);
    return { ok: false, error: "Gagal membuat tugas." };
  }
}
