"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { FileIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Client-side mirror of MAX_UPLOAD_BYTES in src/lib/uploads.ts */
export const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export const DEFAULT_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";

export type FileDropzoneProps = {
  /** Form field name — selected files are exposed as this name in FormData */
  name?: string;
  multiple?: boolean;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Controlled files (optional). When omitted, component manages its own list. */
  value?: File[];
  onChange?: (files: File[]) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileMatchesAccept(file: File, accept: string): boolean {
  if (!accept || accept === "*/*" || accept === "*") return true;
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const fileName = file.name.toLowerCase();
  const fileType = (file.type || "").toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith(".")) {
      return fileName.endsWith(token);
    }
    if (token.endsWith("/*")) {
      const prefix = token.slice(0, -1); // e.g. "image/"
      return fileType.startsWith(prefix);
    }
    return fileType === token;
  });
}

function syncInputFiles(input: HTMLInputElement | null, files: File[]) {
  if (!input) return;
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  input.files = dt.files;
}

export function FileDropzone({
  name = "files",
  multiple = true,
  accept = DEFAULT_ACCEPT,
  maxSizeBytes = DEFAULT_MAX_FILE_BYTES,
  disabled = false,
  className,
  id,
  value,
  onChange,
}: FileDropzoneProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const isControlled = value !== undefined;
  const files = isControlled ? value : internalFiles;

  const setFiles = useCallback(
    (next: File[]) => {
      if (!isControlled) {
        setInternalFiles(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  // Keep the hidden file input in sync so native FormData(form) includes files
  useEffect(() => {
    syncInputFiles(inputRef.current, files);
  }, [files]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      if (disabled) return;

      const list = Array.from(incoming);
      const accepted: File[] = [];
      let rejectedSize = 0;
      let rejectedType = 0;

      for (const file of list) {
        if (file.size > maxSizeBytes) {
          rejectedSize += 1;
          continue;
        }
        if (!fileMatchesAccept(file, accept)) {
          rejectedType += 1;
          continue;
        }
        accepted.push(file);
      }

      if (rejectedSize > 0) {
        toast.error(
          rejectedSize === 1
            ? "File melebihi batas 10 MB."
            : `${rejectedSize} file melebihi batas 10 MB.`,
        );
      }
      if (rejectedType > 0) {
        toast.error(
          rejectedType === 1
            ? "Jenis file tidak didukung."
            : `${rejectedType} file memiliki jenis yang tidak didukung.`,
        );
      }

      if (accepted.length === 0) return;

      if (multiple) {
        // Deduplicate by name+size+lastModified
        const key = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
        const existing = new Set(files.map(key));
        const merged = [...files];
        for (const f of accepted) {
          if (!existing.has(key(f))) {
            merged.push(f);
            existing.add(key(f));
          }
        }
        setFiles(merged);
      } else {
        setFiles(accepted.slice(0, 1));
      }
    },
    [accept, disabled, files, maxSizeBytes, multiple, setFiles],
  );

  function removeFile(index: number) {
    if (disabled) return;
    setFiles(files.filter((_, i) => i !== index));
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (selected?.length) {
      addFiles(selected);
    }
    // Clear so the same file can be re-selected after remove.
    // State → useEffect re-syncs input.files for FormData.
    e.target.value = "";
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
          "bg-muted/40 hover:bg-muted/60",
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary",
            isDragging && "bg-primary/20",
          )}
        >
          <Upload className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Seret &amp; lepas file di sini</p>
          <p className="text-xs text-muted-foreground">atau klik untuk pilih</p>
        </div>
        <p className="text-xs text-muted-foreground">Maks. 10 MB per file</p>

        {/*
          Real file input kept in the DOM so FormData(form) includes files under `name`.
          Visually hidden; driven by state via DataTransfer sync.
        */}
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          tabIndex={-1}
          className="sr-only"
          onChange={onInputChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm"
            >
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                aria-label={`Hapus ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
