/**
 * Backup SQLite database + uploads/ into backups/backup-YYYYMMDD-HHMMSS/
 *
 * Usage:
 *   npm run backup
 *   npx tsx scripts/backup.ts
 *
 * Reads DATABASE_URL from .env (Prisma file: URLs are relative to prisma/).
 */
import { config as loadEnv } from "dotenv";
import {
  copyFile,
  cp,
  mkdir,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnv({ path: path.join(rootDir, ".env") });

type Manifest = {
  createdAt: string;
  backupDir: string;
  database: {
    source: string;
    dest: string;
    sizeBytes: number;
    present: boolean;
  };
  uploads: {
    source: string;
    dest: string;
    sizeBytes: number;
    fileCount: number;
    present: boolean;
  };
  totalSizeBytes: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timestampFolderName(d = new Date()): string {
  return [
    "backup-",
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "-",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("");
}

/**
 * Resolve SQLite path from DATABASE_URL.
 * Prisma treats relative file: URLs as relative to the prisma/ directory.
 */
function resolveDatabasePath(databaseUrl: string | undefined): string {
  const fallback = path.join(rootDir, "prisma", "dev.db");
  if (!databaseUrl) return fallback;

  const trimmed = databaseUrl.trim();
  if (!trimmed.startsWith("file:")) {
    console.warn(
      `DATABASE_URL is not a file: URL (${trimmed}). Falling back to prisma/dev.db.`,
    );
    return fallback;
  }

  // file:./dev.db | file:dev.db | file:/abs/path.db | file:../data/app.db
  let filePart = trimmed.slice("file:".length);
  // Strip optional triple-slash form file:///abs → /abs, keep file://./rel as ./rel-ish
  if (filePart.startsWith("///")) {
    filePart = filePart.slice(2); // keep leading /
  } else if (filePart.startsWith("//")) {
    // file://host/path — uncommon for SQLite; treat path after host if any
    filePart = filePart.replace(/^\/\/[^/]*/, "") || filePart;
  }

  if (path.isAbsolute(filePart)) {
    return filePart;
  }

  // Relative to prisma/ (Prisma convention)
  return path.resolve(rootDir, "prisma", filePart);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function directorySizeAndCount(
  dir: string,
): Promise<{ sizeBytes: number; fileCount: number }> {
  let sizeBytes = 0;
  let fileCount = 0;

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const s = await stat(full);
        sizeBytes += s.size;
        fileCount += 1;
      }
    }
  }

  await walk(dir);
  return { sizeBytes, fileCount };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function main(): Promise<void> {
  const dbSource = resolveDatabasePath(process.env.DATABASE_URL);
  const uploadsSource = path.join(rootDir, "uploads");
  const backupsRoot = path.join(rootDir, "backups");
  const folderName = timestampFolderName();
  const backupDir = path.join(backupsRoot, folderName);

  await mkdir(backupDir, { recursive: true });

  const dbPresent = await pathExists(dbSource);
  const dbDestName = path.basename(dbSource) || "dev.db";
  const dbDest = path.join(backupDir, dbDestName);
  let dbSize = 0;

  if (dbPresent) {
    await copyFile(dbSource, dbDest);
    // Also copy SQLite WAL/SHM sidecars if present (hot-ish copy safety)
    for (const suffix of ["-wal", "-shm", "-journal"] as const) {
      const side = `${dbSource}${suffix}`;
      if (await pathExists(side)) {
        await copyFile(side, `${dbDest}${suffix}`);
      }
    }
    dbSize = (await stat(dbDest)).size;
    console.log(`✓ Database: ${dbSource} → ${dbDest} (${formatBytes(dbSize)})`);
  } else {
    console.warn(`⚠ Database not found at ${dbSource} — skipped`);
  }

  const uploadsPresent = await pathExists(uploadsSource);
  const uploadsDest = path.join(backupDir, "uploads");
  let uploadsSize = 0;
  let uploadsCount = 0;

  if (uploadsPresent) {
    const uploadsStat = await stat(uploadsSource);
    if (!uploadsStat.isDirectory()) {
      throw new Error(`uploads path exists but is not a directory: ${uploadsSource}`);
    }
    await cp(uploadsSource, uploadsDest, { recursive: true });
    const info = await directorySizeAndCount(uploadsDest);
    uploadsSize = info.sizeBytes;
    uploadsCount = info.fileCount;
    console.log(
      `✓ Uploads:  ${uploadsSource} → ${uploadsDest} (${uploadsCount} files, ${formatBytes(uploadsSize)})`,
    );
  } else {
    // Create empty marker so restore knows the tree was intentionally empty/missing
    await mkdir(uploadsDest, { recursive: true });
    console.warn(`⚠ uploads/ not found — created empty uploads/ in backup`);
  }

  const createdAt = new Date().toISOString();
  const manifest: Manifest = {
    createdAt,
    backupDir: path.relative(rootDir, backupDir),
    database: {
      source: path.relative(rootDir, dbSource),
      dest: path.relative(rootDir, dbDest),
      sizeBytes: dbSize,
      present: dbPresent,
    },
    uploads: {
      source: "uploads",
      dest: path.relative(rootDir, uploadsDest),
      sizeBytes: uploadsSize,
      fileCount: uploadsCount,
      present: uploadsPresent,
    },
    totalSizeBytes: dbSize + uploadsSize,
  };

  const manifestPath = path.join(backupDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`✓ Manifest: ${manifestPath}`);
  console.log(
    `\nBackup complete: ${path.relative(rootDir, backupDir)} (${formatBytes(manifest.totalSizeBytes)})`,
  );
}

main().catch((err) => {
  console.error("Backup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
