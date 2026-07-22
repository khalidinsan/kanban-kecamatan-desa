/**
 * Restore SQLite database + uploads/ from a backup folder.
 *
 * Usage:
 *   CONFIRM=1 npm run restore -- backups/backup-YYYYMMDD-HHMMSS
 *   npx tsx scripts/restore.ts backups/backup-YYYYMMDD-HHMMSS --force
 *
 * Overwrite is blocked unless CONFIRM=1 or --force is set.
 * Does not touch seed data under data/.
 */
import { config as loadEnv } from "dotenv";
import {
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnv({ path: path.join(rootDir, ".env") });

type Manifest = {
  createdAt?: string;
  database?: { dest?: string; present?: boolean };
  uploads?: { dest?: string; present?: boolean };
};

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

  let filePart = trimmed.slice("file:".length);
  if (filePart.startsWith("///")) {
    filePart = filePart.slice(2);
  } else if (filePart.startsWith("//")) {
    filePart = filePart.replace(/^\/\/[^/]*/, "") || filePart;
  }

  if (path.isAbsolute(filePart)) {
    return filePart;
  }

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

function parseArgs(argv: string[]): {
  backupArg: string | undefined;
  force: boolean;
} {
  const flags = new Set(["--force", "-f", "--yes", "-y"]);
  const force = argv.some((a) => flags.has(a));
  const backupArg = argv.find((a) => !a.startsWith("-"));
  return { backupArg, force };
}

function isConfirmed(forceFlag: boolean): boolean {
  if (forceFlag) return true;
  const env = process.env.CONFIRM?.trim();
  return env === "1" || env?.toLowerCase() === "true" || env?.toLowerCase() === "yes";
}

async function findDbInBackup(backupDir: string, manifest: Manifest | null): Promise<string | null> {
  if (manifest?.database?.dest) {
    const fromManifest = path.isAbsolute(manifest.database.dest)
      ? manifest.database.dest
      : path.join(rootDir, manifest.database.dest);
    // dest in manifest is relative to project root (backup-xxx/dev.db)
    if (await pathExists(fromManifest)) return fromManifest;
    // Also try as path under backupDir
    const basenamed = path.join(backupDir, path.basename(manifest.database.dest));
    if (await pathExists(basenamed)) return basenamed;
  }

  // Prefer exact basename of live DATABASE_URL target
  const liveDb = resolveDatabasePath(process.env.DATABASE_URL);
  const preferred = path.join(backupDir, path.basename(liveDb));
  if (await pathExists(preferred)) return preferred;

  // Common names
  for (const name of ["dev.db", "prod.db", "database.db"]) {
    const p = path.join(backupDir, name);
    if (await pathExists(p)) return p;
  }

  // Any .db file at top level of backup
  const entries = await readdir(backupDir);
  const dbFile = entries.find((e) => e.endsWith(".db") && !e.includes("-"));
  if (dbFile) return path.join(backupDir, dbFile);

  return null;
}

async function main(): Promise<void> {
  const { backupArg, force } = parseArgs(process.argv.slice(2));

  if (!backupArg) {
    console.error(`Usage:
  CONFIRM=1 npm run restore -- backups/backup-YYYYMMDD-HHMMSS
  npx tsx scripts/restore.ts <backup-folder> --force

Restore overwrites the live SQLite file and uploads/ directory.
Set CONFIRM=1 or pass --force to proceed.`);
    process.exit(1);
  }

  if (!isConfirmed(force)) {
    console.error(`Refusing to overwrite live data without confirmation.

Re-run with one of:
  CONFIRM=1 npm run restore -- ${backupArg}
  npx tsx scripts/restore.ts ${backupArg} --force`);
    process.exit(1);
  }

  const backupDir = path.isAbsolute(backupArg)
    ? backupArg
    : path.resolve(rootDir, backupArg);

  if (!(await pathExists(backupDir))) {
    throw new Error(`Backup folder not found: ${backupDir}`);
  }

  const backupStat = await stat(backupDir);
  if (!backupStat.isDirectory()) {
    throw new Error(`Backup path is not a directory: ${backupDir}`);
  }

  let manifest: Manifest | null = null;
  const manifestPath = path.join(backupDir, "manifest.json");
  if (await pathExists(manifestPath)) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
      console.log(
        `Reading manifest (createdAt: ${manifest.createdAt ?? "unknown"})`,
      );
    } catch {
      console.warn("⚠ Could not parse manifest.json — continuing with heuristics");
    }
  } else {
    console.warn("⚠ No manifest.json in backup — using heuristics");
  }

  const dbSource = await findDbInBackup(backupDir, manifest);
  const uploadsSource = path.join(backupDir, "uploads");
  const dbTarget = resolveDatabasePath(process.env.DATABASE_URL);
  const uploadsTarget = path.join(rootDir, "uploads");

  // Safety: never write outside project root for uploads, and never touch data/
  const dataDir = path.join(rootDir, "data");
  if (
    path.resolve(dbTarget).startsWith(dataDir + path.sep) ||
    path.resolve(uploadsTarget).startsWith(dataDir + path.sep)
  ) {
    throw new Error("Refusing to restore into data/ (seed data is protected).");
  }

  console.log(`Backup:  ${backupDir}`);
  console.log(`DB →     ${dbTarget}`);
  console.log(`Uploads → ${uploadsTarget}`);

  if (dbSource) {
    await mkdir(path.dirname(dbTarget), { recursive: true });
    await copyFile(dbSource, dbTarget);
    for (const suffix of ["-wal", "-shm", "-journal"] as const) {
      const sideSrc = `${dbSource}${suffix}`;
      const sideDst = `${dbTarget}${suffix}`;
      if (await pathExists(sideSrc)) {
        await copyFile(sideSrc, sideDst);
      } else {
        // Drop stale sidecars so SQLite doesn't mix old WAL with restored main file
        await rm(sideDst, { force: true });
      }
    }
    const size = (await stat(dbTarget)).size;
    console.log(`✓ Restored database (${size} bytes)`);
  } else {
    console.warn("⚠ No database file found in backup — skipped DB restore");
  }

  if (await pathExists(uploadsSource)) {
    const s = await stat(uploadsSource);
    if (!s.isDirectory()) {
      throw new Error(`Backup uploads path is not a directory: ${uploadsSource}`);
    }
    // Replace live uploads tree entirely so deletes in backup are reflected
    await rm(uploadsTarget, { recursive: true, force: true });
    await mkdir(path.dirname(uploadsTarget), { recursive: true });
    await cp(uploadsSource, uploadsTarget, { recursive: true });
    console.log(`✓ Restored uploads/`);
  } else {
    console.warn("⚠ No uploads/ in backup — left live uploads/ unchanged");
  }

  console.log("\nRestore complete.");
  console.log("Restart the app if it was running so it reopens the database file.");
}

main().catch((err) => {
  console.error("Restore failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
