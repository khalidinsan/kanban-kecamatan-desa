import { AppTopbar } from "@/components/app-topbar";
import {
  UsersManagement,
  type AdminUserRow,
} from "@/components/admin/users-management";
import type { KecamatanWithDesa } from "@/components/admin/user-form-fields";
import { ACTIVE_KABUPATEN } from "@/config/wilayah";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const admin = await requireRole("admin");

  const [users, kecamatan] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        kecamatanCode: true,
        desaCode: true,
        kecamatan: { select: { name: true } },
        desa: { select: { name: true } },
        kabupaten: { select: { name: true } },
      },
    }),
    prisma.kecamatan.findMany({
      where: { kabupatenCode: ACTIVE_KABUPATEN.code },
      orderBy: { name: "asc" },
      select: {
        code: true,
        name: true,
        desa: {
          orderBy: { name: "asc" },
          select: { code: true, name: true },
        },
      },
    }),
  ]);

  const kecamatanList: KecamatanWithDesa[] = kecamatan.map((k) => ({
    code: k.code,
    name: k.name,
    desa: k.desa,
  }));

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    kecamatanCode: u.kecamatanCode,
    desaCode: u.desaCode,
    kecamatanName: u.kecamatan?.name ?? null,
    desaName: u.desa?.name ?? null,
    kabupatenName: u.kabupaten?.name ?? null,
  }));

  return (
    <>
      <AppTopbar
        title="Manajemen Pengguna"
        subtitle={`Kab. ${ACTIVE_KABUPATEN.name} · kelola peran & wilayah`}
      />
      <UsersManagement
        users={rows}
        currentUserId={admin.id}
        kecamatanList={kecamatanList}
      />
    </>
  );
}
