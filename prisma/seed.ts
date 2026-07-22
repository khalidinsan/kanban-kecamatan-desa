import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACTIVE_KABUPATEN } from "../src/config/wilayah";

const prisma = new PrismaClient();

type DesaJson = { code: string; name: string };
type KecamatanJson = { code: string; name: string; desa: DesaJson[] };
type WilayahFile = {
  kabupaten: { code: string; name: string };
  kecamatan: KecamatanJson[];
};

async function main() {
  const dataPath = path.join(
    process.cwd(),
    "data",
    `wilayah-${ACTIVE_KABUPATEN.code}.json`,
  );
  const raw = readFileSync(dataPath, "utf8");
  const wilayah = JSON.parse(raw) as WilayahFile;

  console.log(
    `Seeding kabupaten ${wilayah.kabupaten.code} (${wilayah.kabupaten.name})...`,
  );

  await prisma.kabupaten.upsert({
    where: { code: wilayah.kabupaten.code },
    create: {
      code: wilayah.kabupaten.code,
      name: wilayah.kabupaten.name,
    },
    update: {
      name: wilayah.kabupaten.name,
    },
  });

  for (const kec of wilayah.kecamatan) {
    await prisma.kecamatan.upsert({
      where: { code: kec.code },
      create: {
        code: kec.code,
        name: kec.name,
        kabupatenCode: wilayah.kabupaten.code,
      },
      update: {
        name: kec.name,
        kabupatenCode: wilayah.kabupaten.code,
      },
    });

    for (const desa of kec.desa) {
      await prisma.desa.upsert({
        where: { code: desa.code },
        create: {
          code: desa.code,
          name: desa.name,
          kecamatanCode: kec.code,
        },
        update: {
          name: desa.name,
          kecamatanCode: kec.code,
        },
      });
    }
  }

  const passwordHash = await hash("password123", 10);

  const demoUsers: Array<{
    username: string;
    name: string;
    role: Role;
    kabupatenCode?: string;
    kecamatanCode?: string;
    desaCode?: string;
  }> = [
    {
      username: "admin",
      name: "Administrator Sistem",
      role: "admin",
      kabupatenCode: ACTIVE_KABUPATEN.code,
    },
    {
      username: "camat.subang",
      name: "Camat Subang",
      role: "camat",
      kabupatenCode: ACTIVE_KABUPATEN.code,
      kecamatanCode: "32.13.03",
    },
    {
      username: "op.kec.subang",
      name: "Operator Kecamatan Subang",
      role: "operator_kecamatan",
      kabupatenCode: ACTIVE_KABUPATEN.code,
      kecamatanCode: "32.13.03",
    },
    {
      username: "op.desa.parung",
      name: "Operator Desa Parung",
      role: "operator_desa",
      kabupatenCode: ACTIVE_KABUPATEN.code,
      kecamatanCode: "32.13.03",
      desaCode: "32.13.03.1001",
    },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      create: {
        username: u.username,
        name: u.name,
        role: u.role,
        passwordHash,
        kabupatenCode: u.kabupatenCode,
        kecamatanCode: u.kecamatanCode,
        desaCode: u.desaCode,
        isActive: true,
      },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
        kabupatenCode: u.kabupatenCode,
        kecamatanCode: u.kecamatanCode,
        desaCode: u.desaCode,
        isActive: true,
      },
    });
  }

  // Sample tasks for demo board + executive charts (idempotent by title+desa)
  const opKec = await prisma.user.findUnique({
    where: { username: "op.kec.subang" },
  });

  if (opKec) {
    const now = new Date();
    const days = (n: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + n);
      return d;
    };

    type SampleTask = {
      title: string;
      description: string;
      status: "baru" | "dikerjakan" | "review" | "selesai" | "dibatalkan";
      priority: "rendah" | "sedang" | "tinggi" | "mendesak";
      desaCode: string;
      dueDate?: Date | null;
      submittedAt?: Date | null;
      completedAt?: Date | null;
    };

    const samples: SampleTask[] = [
      {
        title: "Contoh: Pendataan UMKM Desa Parung",
        description:
          "Lakukan pendataan UMKM aktif di wilayah Desa Parung dan unggah rekap sementara.",
        status: "baru",
        priority: "sedang",
        desaCode: "32.13.03.1001",
        dueDate: days(14),
      },
      {
        title: "Contoh: Perbaikan drainase Cigadung",
        description: "Bersihkan dan perbaiki saluran drainase utama Desa Cigadung.",
        status: "dikerjakan",
        priority: "tinggi",
        desaCode: "32.13.03.1002",
        dueDate: days(7),
      },
      {
        title: "Contoh: Laporan posyandu Pasirkareumbi",
        description: "Kumpulkan laporan kegiatan posyandu bulanan.",
        status: "review",
        priority: "sedang",
        desaCode: "32.13.03.1003",
        dueDate: days(3),
        submittedAt: days(-2),
      },
      {
        title: "Contoh: Pemutakhiran data RT/RW Karanganyar",
        description: "Update data kependudukan tingkat RT/RW.",
        status: "selesai",
        priority: "sedang",
        desaCode: "32.13.03.1004",
        dueDate: days(-5),
        completedAt: days(-1),
      },
      {
        title: "Contoh: Sosialisasi Bansos Soklat (terlambat)",
        description: "Jadwalkan ulang sosialisasi bantuan sosial — melewati tempo.",
        status: "dikerjakan",
        priority: "mendesak",
        desaCode: "32.13.03.1005",
        dueDate: days(-10),
      },
      {
        title: "Contoh: Inventaris aset Sukamelang",
        description: "Rekap inventaris aset desa.",
        status: "selesai",
        priority: "rendah",
        desaCode: "32.13.03.1006",
        completedAt: days(-3),
      },
      {
        title: "Contoh: Review proposal BUMDes Dangdeur",
        description: "Ajukan ringkasan proposal untuk review kecamatan.",
        status: "review",
        priority: "tinggi",
        desaCode: "32.13.03.1007",
        dueDate: days(-1),
        submittedAt: days(-4),
      },
      {
        title: "Contoh: Kegiatan dibatalkan Wanareja",
        description: "Kegiatan dibatalkan karena cuaca ekstrem.",
        status: "dibatalkan",
        priority: "rendah",
        desaCode: "32.13.03.1008",
      },
    ];

    for (const s of samples) {
      const existing = await prisma.task.findFirst({
        where: { title: s.title, desaCode: s.desaCode },
      });
      if (existing) continue;

      await prisma.task.create({
        data: {
          title: s.title,
          description: s.description,
          status: s.status,
          priority: s.priority,
          kabupatenCode: ACTIVE_KABUPATEN.code,
          kecamatanCode: "32.13.03",
          desaCode: s.desaCode,
          createdById: opKec.id,
          dueDate: s.dueDate ?? null,
          submittedAt: s.submittedAt ?? null,
          completedAt: s.completedAt ?? null,
          updates: {
            create: {
              authorId: opKec.id,
              eventType:
                s.status === "review"
                  ? "submitted_review"
                  : s.status === "selesai"
                    ? "approved"
                    : s.status === "dibatalkan"
                      ? "cancelled"
                      : "status_change",
              message: "Tugas contoh dari seed (dashboard)",
              toStatus: s.status,
            },
          },
        },
      });
      console.log(`  Sample task created: ${s.title}`);
    }
  }

  const kecCount = await prisma.kecamatan.count({
    where: { kabupatenCode: ACTIVE_KABUPATEN.code },
  });
  const desaCount = await prisma.desa.count({
    where: { kecamatan: { kabupatenCode: ACTIVE_KABUPATEN.code } },
  });
  const userCount = await prisma.user.count();
  const taskCount = await prisma.task.count();

  console.log("Seed complete:");
  console.log(`  Kecamatan: ${kecCount}`);
  console.log(`  Desa: ${desaCount}`);
  console.log(`  Users: ${userCount}`);
  console.log(`  Tasks: ${taskCount}`);
  console.log("  Demo logins (password: password123):");
  for (const u of demoUsers) {
    console.log(`    - ${u.username} (${u.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
