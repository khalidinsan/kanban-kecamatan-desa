import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type NamedCode = { code: string; name: string };

type ApiListResponse = {
  data: NamedCode[];
};

type Desa = NamedCode;

type Kecamatan = NamedCode & {
  desa: Desa[];
};

type WilayahFile = {
  kabupaten: NamedCode;
  kecamatan: Kecamatan[];
  fetchedAt: string;
  source: "wilayah.id";
};

const FALLBACK_KABUPATEN = {
  code: "32.13",
  name: "Subang",
} as const;

async function loadActiveKabupaten(): Promise<NamedCode> {
  try {
    const mod = await import("../src/config/wilayah");
    const active = mod.ACTIVE_KABUPATEN;
    return { code: active.code, name: active.name };
  } catch {
    return { ...FALLBACK_KABUPATEN };
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function main() {
  const kabupaten = await loadActiveKabupaten();
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outPath = path.join(rootDir, "data", `wilayah-${kabupaten.code}.json`);

  console.log(`Fetching districts for kabupaten ${kabupaten.code} (${kabupaten.name})...`);

  const districtsRes = await fetchJson<ApiListResponse>(
    `https://wilayah.id/api/districts/${kabupaten.code}.json`,
  );

  const districts = districtsRes.data ?? [];
  if (districts.length === 0) {
    throw new Error(`No districts returned for ${kabupaten.code}`);
  }

  const kecamatan: Kecamatan[] = [];

  for (const district of districts) {
    console.log(`  Fetching villages for ${district.code} ${district.name}...`);
    const villagesRes = await fetchJson<ApiListResponse>(
      `https://wilayah.id/api/villages/${district.code}.json`,
    );
    const desa = (villagesRes.data ?? []).map((v) => ({
      code: v.code,
      name: v.name,
    }));

    kecamatan.push({
      code: district.code,
      name: district.name,
      desa,
    });
  }

  const payload: WilayahFile = {
    kabupaten: {
      code: kabupaten.code,
      name: kabupaten.name,
    },
    kecamatan,
    fetchedAt: new Date().toISOString(),
    source: "wilayah.id",
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const totalDesa = kecamatan.reduce((sum, k) => sum + k.desa.length, 0);
  const emptyDesa = kecamatan.filter((k) => k.desa.length === 0).length;

  console.log("");
  console.log(`Wrote ${outPath}`);
  console.log(`Kecamatan: ${kecamatan.length}`);
  console.log(`Total desa: ${totalDesa}`);
  console.log(`Kecamatan with empty desa: ${emptyDesa}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
