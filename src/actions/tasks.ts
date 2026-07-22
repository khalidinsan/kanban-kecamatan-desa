"use server";

import { randomBytes } from "node:crypto";
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
  desaCodes: z
    .array(z.string().min(1))
    .min(1, "Minimal satu desa wajib dipilih."),
  kecamatanCode: z.string().optional().nullable(),
});

function canCreateTask(user: SessionUser): boolean {
  return user.role === "admin" || user.role === "operator_kecamatan";
}

/** Collect desa codes from multi-select (`desaCodes`) or repeated/single `desaCode`. */
function desaCodesFromFormData(formData: FormData): string[] {
  const multi = formData
    .getAll("desaCodes")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (multi.length > 0) {
    return [...new Set(multi)];
  }

  const singles = formData
    .getAll("desaCode")
    .map((v) => String(v).trim())
    .filter(Boolean);
  return [...new Set(singles)];
}

function newTaskGroupId(): string {
  // cuid-like token shared across multi-desa task copies
  return `c${Date.now().toString(36)}${randomBytes(10).toString("hex")}`;
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
    desaCodes: desaCodesFromFormData(formData),
    kecamatanCode: formData.get("kecamatanCode") || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Data tidak valid.";
    return { ok: false, error: first };
  }

  const data = parsed.data;

  try {
    const desas = await prisma.desa.findMany({
      where: { code: { in: data.desaCodes } },
      include: {
        kecamatan: { select: { code: true, kabupatenCode: true } },
      },
    });

    if (desas.length !== data.desaCodes.length) {
      return { ok: false, error: "Satu atau lebih desa tidak ditemukan." };
    }

    const kecamatanCodes = new Set(desas.map((d) => d.kecamatanCode));
    if (kecamatanCodes.size !== 1) {
      return {
        ok: false,
        error: "Semua desa harus berada dalam satu kecamatan yang sama.",
      };
    }

    const kecamatanCode = desas[0]!.kecamatanCode;
    const kabupatenCode =
      desas[0]!.kecamatan.kabupatenCode || ACTIVE_KABUPATEN.code;

    if (user.role === "operator_kecamatan") {
      if (!user.kecamatanCode || kecamatanCode !== user.kecamatanCode) {
        return {
          ok: false,
          error: "Desa harus berada dalam wilayah kecamatan Anda.",
        };
      }
    }

    if (user.role === "admin" && data.kecamatanCode) {
      if (kecamatanCode !== data.kecamatanCode) {
        return {
          ok: false,
          error: "Desa tidak cocok dengan kecamatan yang dipilih.",
        };
      }
    }

    let dueDate: Date | null = null;
    if (data.dueDate) {
      const raw = data.dueDate.trim();
      // Parse yyyy-MM-dd as local calendar day (avoid UTC off-by-one).
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      const d = m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Tanggal jatuh tempo tidak valid." };
      }
      const today = new Date();
      const startToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      if (d < startToday) {
        return {
          ok: false,
          error: "Jatuh tempo tidak boleh tanggal yang sudah lewat.",
        };
      }
      dueDate = d;
    }

    const files = filesFromFormData(formData);
    if (files.length > 10) {
      return { ok: false, error: "Maksimal 10 lampiran." };
    }

    let saved;
    try {
      // Save files once per create batch; attachment rows reuse the same paths.
      saved = await saveUploadFiles(files);
    } catch (err) {
      if (err instanceof UploadError) {
        return { ok: false, error: err.message };
      }
      throw err;
    }

    const isMulti = desas.length > 1;
    const taskGroupId = isMulti ? newTaskGroupId() : null;
    const attachmentCreates =
      saved.length > 0
        ? saved.map((f) => ({
            fileName: f.fileName,
            originalName: f.originalName,
            mimeType: f.mimeType,
            size: f.size,
            path: f.path,
          }))
        : [];

    const created = await prisma.$transaction(
      desas.map((desa) =>
        prisma.task.create({
          data: {
            title: data.title,
            description: data.description || null,
            priority: data.priority as TaskPriority,
            dueDate,
            status: "baru",
            taskGroupId,
            kabupatenCode,
            kecamatanCode: desa.kecamatanCode,
            desaCode: desa.code,
            createdById: user.id,
            attachments:
              attachmentCreates.length > 0
                ? { create: attachmentCreates }
                : undefined,
            updates: {
              create: {
                authorId: user.id,
                eventType: "status_change",
                message: isMulti
                  ? `Tugas dibuat (penugasan multi-desa, ${desas.length} desa)`
                  : "Tugas dibuat",
                fromStatus: null,
                toStatus: "baru",
              },
            },
          },
        }),
      ),
    );

    const first = created[0]!;
    revalidatePath("/board");
    for (const task of created) {
      revalidatePath(`/tugas/${task.id}`);
    }
    redirect(`/tugas/${first.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    console.error("createTask error", err);
    return { ok: false, error: "Gagal membuat tugas." };
  }
}
