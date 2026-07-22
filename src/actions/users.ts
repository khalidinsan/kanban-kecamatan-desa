"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { AuthzError, requireRole } from "@/lib/authz";
import { ACTIVE_KABUPATEN } from "@/config/wilayah";
import { prisma } from "@/lib/prisma";

export type UserActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const ROLES = [
  "admin",
  "operator_kecamatan",
  "operator_desa",
  "camat",
] as const satisfies readonly Role[];

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter.")
  .max(40, "Username maksimal 40 karakter.")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username hanya huruf, angka, titik, underscore, atau strip.",
  );

const nameSchema = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(100, "Nama maksimal 100 karakter.");

const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(100, "Password terlalu panjang.");

function wilayahRefine(
  data: {
    role: Role;
    kecamatanCode?: string | null;
    desaCode?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  const needsKec =
    data.role === "camat" ||
    data.role === "operator_kecamatan" ||
    data.role === "operator_desa";
  if (needsKec && !data.kecamatanCode) {
    ctx.addIssue({
      code: "custom",
      path: ["kecamatanCode"],
      message: "Kecamatan wajib diisi untuk peran ini.",
    });
  }
  if (data.role === "operator_desa" && !data.desaCode) {
    ctx.addIssue({
      code: "custom",
      path: ["desaCode"],
      message: "Desa wajib diisi untuk operator desa.",
    });
  }
}

const createUserSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    name: nameSchema,
    role: z.enum(ROLES, { message: "Peran tidak valid." }),
    kecamatanCode: z.string().trim().optional().nullable(),
    desaCode: z.string().trim().optional().nullable(),
  })
  .superRefine(wilayahRefine);

const updateUserSchema = z
  .object({
    id: z.string().min(1),
    username: usernameSchema,
    name: nameSchema,
    role: z.enum(ROLES, { message: "Peran tidak valid." }),
    password: z.string().optional().nullable(),
    kecamatanCode: z.string().trim().optional().nullable(),
    desaCode: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    wilayahRefine(data, ctx);
    const pw = data.password?.trim() ?? "";
    if (pw.length > 0 && pw.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password minimal 8 karakter.",
      });
    }
    if (pw.length > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password terlalu panjang.",
      });
    }
  });

async function resolveWilayah(data: {
  role: Role;
  kecamatanCode?: string | null;
  desaCode?: string | null;
}): Promise<
  | {
      ok: true;
      kabupatenCode: string | null;
      kecamatanCode: string | null;
      desaCode: string | null;
    }
  | { ok: false; error: string }
> {
  if (data.role === "admin") {
    return {
      ok: true,
      kabupatenCode: ACTIVE_KABUPATEN.code,
      kecamatanCode: null,
      desaCode: null,
    };
  }

  if (data.role === "camat" || data.role === "operator_kecamatan") {
    const kec = await prisma.kecamatan.findUnique({
      where: { code: data.kecamatanCode! },
    });
    if (!kec || kec.kabupatenCode !== ACTIVE_KABUPATEN.code) {
      return {
        ok: false,
        error: "Kecamatan tidak ditemukan di kabupaten aktif.",
      };
    }
    return {
      ok: true,
      kabupatenCode: ACTIVE_KABUPATEN.code,
      kecamatanCode: kec.code,
      desaCode: null,
    };
  }

  // operator_desa
  const desa = await prisma.desa.findUnique({
    where: { code: data.desaCode! },
    include: { kecamatan: true },
  });
  if (!desa) {
    return { ok: false, error: "Desa tidak ditemukan." };
  }
  if (desa.kecamatan.kabupatenCode !== ACTIVE_KABUPATEN.code) {
    return { ok: false, error: "Desa di luar kabupaten aktif." };
  }
  if (data.kecamatanCode && desa.kecamatanCode !== data.kecamatanCode) {
    return {
      ok: false,
      error: "Desa tidak cocok dengan kecamatan yang dipilih.",
    };
  }
  return {
    ok: true,
    kabupatenCode: ACTIVE_KABUPATEN.code,
    kecamatanCode: desa.kecamatanCode,
    desaCode: desa.code,
  };
}

export async function createUser(formData: FormData): Promise<UserActionResult> {
  try {
    await requireRole("admin");
  } catch (err) {
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const parsed = createUserSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    name: formData.get("name"),
    role: formData.get("role"),
    kecamatanCode: formData.get("kecamatanCode") || null,
    desaCode: formData.get("desaCode") || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Data tidak valid.";
    return { ok: false, error: first };
  }

  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { username: data.username.toLowerCase() },
  });
  if (existing) {
    return { ok: false, error: "Username sudah digunakan." };
  }

  const wilayah = await resolveWilayah(data);
  if (!wilayah.ok) return wilayah;

  const passwordHash = await hash(data.password, 10);

  await prisma.user.create({
    data: {
      username: data.username.toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
      isActive: true,
      kabupatenCode: wilayah.kabupatenCode,
      kecamatanCode: wilayah.kecamatanCode,
      desaCode: wilayah.desaCode,
    },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(formData: FormData): Promise<UserActionResult> {
  try {
    await requireRole("admin");
  } catch (err) {
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    username: formData.get("username"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
    kecamatanCode: formData.get("kecamatanCode") || null,
    desaCode: formData.get("desaCode") || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Data tidak valid.";
    return { ok: false, error: first };
  }

  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: data.id } });
  if (!target) {
    return { ok: false, error: "Pengguna tidak ditemukan." };
  }

  const username = data.username.toLowerCase();
  if (username !== target.username) {
    const clash = await prisma.user.findUnique({ where: { username } });
    if (clash) {
      return { ok: false, error: "Username sudah digunakan." };
    }
  }

  const wilayah = await resolveWilayah(data);
  if (!wilayah.ok) return wilayah;

  const newPassword = data.password?.trim() ?? "";
  const passwordHash =
    newPassword.length > 0 ? await hash(newPassword, 10) : undefined;

  await prisma.user.update({
    where: { id: data.id },
    data: {
      username,
      name: data.name,
      role: data.role,
      kabupatenCode: wilayah.kabupatenCode,
      kecamatanCode: wilayah.kecamatanCode,
      desaCode: wilayah.desaCode,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<UserActionResult> {
  try {
    const admin = await requireRole("admin");

    if (admin.id === userId && !isActive) {
      return {
        ok: false,
        error: "Anda tidak dapat menonaktifkan akun sendiri.",
      };
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return { ok: false, error: "Pengguna tidak ditemukan." };
    }

    if (target.isActive === isActive) {
      return { ok: true };
    }

    // Keep at least one active admin
    if (!isActive && target.role === "admin") {
      const activeAdmins = await prisma.user.count({
        where: { role: "admin", isActive: true },
      });
      if (activeAdmins <= 1) {
        return {
          ok: false,
          error: "Tidak dapat menonaktifkan admin aktif terakhir.",
        };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}

export async function deactivateUser(
  userId: string,
): Promise<UserActionResult> {
  return setUserActive(userId, false);
}

export async function reactivateUser(
  userId: string,
): Promise<UserActionResult> {
  return setUserActive(userId, true);
}

export async function deleteUser(userId: string): Promise<UserActionResult> {
  try {
    const admin = await requireRole("admin");

    if (admin.id === userId) {
      return { ok: false, error: "Anda tidak dapat menghapus akun sendiri." };
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return { ok: false, error: "Pengguna tidak ditemukan." };
    }

    if (target.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin" },
      });
      if (adminCount <= 1) {
        return {
          ok: false,
          error: "Tidak dapat menghapus admin terakhir di sistem.",
        };
      }
    }

    // Block delete if user still has task history references that would break
    // Use soft checks — Prisma relations: createdTasks, assignedTasks, updates
    const [createdCount, assignedCount, updateCount] = await Promise.all([
      prisma.task.count({ where: { createdById: userId } }),
      prisma.task.count({ where: { assignedToId: userId } }),
      prisma.taskUpdate.count({ where: { authorId: userId } }),
    ]);

    if (createdCount + assignedCount + updateCount > 0) {
      // Soft-delete path: deactivate instead of hard delete when history exists
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      revalidatePath("/admin/users");
      return {
        ok: true,
        message:
          "Pengguna punya riwayat tugas/progres — akun dinonaktifkan (bukan dihapus permanen).",
      };
    }

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin/users");
    return { ok: true, message: "Pengguna dihapus permanen." };
  } catch (err) {
    if (err instanceof AuthzError) {
      return { ok: false, error: err.message };
    }
    console.error("deleteUser", err);
    return {
      ok: false,
      error: "Gagal menghapus pengguna. Nonaktifkan saja jika masih terikat data.",
    };
  }
}
