import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Whitelist: images, PDF, common Office formats */
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

export type SavedUpload = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  /** Relative path under project root, e.g. uploads/2026/07/abc.pdf */
  path: string;
};

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

export function getUploadsRoot(): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
}

export function absoluteUploadPath(relativePath: string): string {
  const root = getUploadsRoot();
  // Only allow files under uploads/
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    normalized.includes("..") ||
    !normalized.startsWith("uploads/")
  ) {
    throw new UploadError("Path unggahan tidak valid.");
  }
  const resolved = path.join(/*turbopackIgnore: true*/ process.cwd(), normalized);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new UploadError("Path unggahan tidak valid.");
  }
  return resolved;
}

function sanitizeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\-()\s\u00C0-\u024F]/g, "_");
  return base.slice(0, 180) || "file";
}

function extensionFor(originalName: string, mimeType: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (ext && ext.length <= 10) return ext;
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
  };
  return map[mimeType] ?? "";
}

export function validateUploadFile(file: File): void {
  if (!file || typeof file.size !== "number") {
    throw new UploadError("File tidak valid.");
  }
  if (file.size <= 0) {
    throw new UploadError("File kosong tidak diizinkan.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Ukuran file maksimal 10 MB.");
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new UploadError(
      "Jenis file tidak diizinkan. Gunakan gambar, PDF, atau dokumen Office.",
    );
  }
}

/**
 * Persist a browser File under uploads/ with a randomized name.
 * Returns DB-ready metadata (relative path).
 */
export async function saveUploadFile(file: File): Promise<SavedUpload> {
  validateUploadFile(file);

  const mimeType = file.type || "application/octet-stream";
  const originalName = sanitizeOriginalName(file.name || "file");
  const ext = extensionFor(originalName, mimeType);
  const token = randomBytes(16).toString("hex");
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const fileName = `${token}${ext}`;
  const relativeDir = path.posix.join("uploads", yyyy, mm);
  const relativePath = path.posix.join(relativeDir, fileName);
  const absDir = path.join(/*turbopackIgnore: true*/ process.cwd(), relativeDir);
  const absPath = path.join(absDir, fileName);

  await mkdir(absDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  return {
    fileName,
    originalName,
    mimeType,
    size: buffer.length,
    path: relativePath.replace(/\\/g, "/"),
  };
}

export async function saveUploadFiles(files: File[]): Promise<SavedUpload[]> {
  const saved: SavedUpload[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    saved.push(await saveUploadFile(file));
  }
  return saved;
}

/** Extract File objects from FormData under one or more field names. */
export function filesFromFormData(
  formData: FormData,
  fieldNames: string[] = ["files", "file"],
): File[] {
  const out: File[] = [];
  for (const name of fieldNames) {
    for (const entry of formData.getAll(name)) {
      if (entry instanceof File && entry.size > 0) {
        out.push(entry);
      }
    }
  }
  return out;
}
