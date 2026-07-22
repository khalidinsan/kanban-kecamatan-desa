import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/app-topbar";
import {
  CreateTaskForm,
  type KecamatanWithDesa,
} from "@/components/tasks/create-task-form";
import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ACTIVE_KABUPATEN } from "@/config/wilayah";

export default async function TugasBaruPage() {
  const user = await requireSession();

  if (user.role !== "admin" && user.role !== "operator_kecamatan") {
    redirect("/board");
  }

  if (user.role === "admin") {
    const kecamatan = await prisma.kecamatan.findMany({
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
    });

    const kecamatanList: KecamatanWithDesa[] = kecamatan.map((k) => ({
      code: k.code,
      name: k.name,
      desa: k.desa,
    }));

    return (
      <>
        <AppTopbar
          title="Tugas Baru"
          subtitle="Buat tugas dan tugaskan ke desa"
        />
        <div className="flex flex-1 flex-col px-6 pb-8">
          <div className="mx-auto w-full max-w-2xl rounded-3xl bg-card p-6 shadow-card sm:p-8">
            <CreateTaskForm mode="admin" kecamatanList={kecamatanList} />
          </div>
        </div>
      </>
    );
  }

  // operator_kecamatan
  if (!user.kecamatanCode) {
    return (
      <>
        <AppTopbar title="Tugas Baru" />
        <div className="px-6 pb-8">
          <div className="rounded-3xl bg-card p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">
              Akun Anda belum terikat ke kecamatan.
            </p>
          </div>
        </div>
      </>
    );
  }

  const desaList = await prisma.desa.findMany({
    where: { kecamatanCode: user.kecamatanCode },
    orderBy: { name: "asc" },
    select: { code: true, name: true },
  });

  const kecamatan = await prisma.kecamatan.findUnique({
    where: { code: user.kecamatanCode },
    select: { name: true },
  });

  return (
    <>
      <AppTopbar
        title="Tugas Baru"
        subtitle={`Kecamatan ${kecamatan?.name ?? user.kecamatanCode}`}
      />
      <div className="flex flex-1 flex-col px-6 pb-8">
        <div className="mx-auto w-full max-w-2xl rounded-3xl bg-card p-6 shadow-card sm:p-8">
          <CreateTaskForm
            mode="operator_kecamatan"
            fixedKecamatanCode={user.kecamatanCode}
            desaList={desaList}
          />
        </div>
      </div>
    </>
  );
}
