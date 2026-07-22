"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Client button that hits GET /api/export/executive (optionally with kecamatan filter).
 */
export function ExecutiveExportButton({
  kecamatanCode,
  className,
}: {
  /** Admin optional kecamatan filter; camat ignores (server uses session scope). */
  kecamatanCode?: string | null;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  const handleExport = useCallback(async () => {
    setPending(true);
    try {
      const params = new URLSearchParams();
      if (kecamatanCode) params.set("kecamatan", kecamatanCode);
      const qs = params.toString();
      const url = qs ? `/api/export/executive?${qs}` : "/api/export/executive";

      const res = await fetch(url, { method: "GET", credentials: "same-origin" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Gagal mengekspor (${res.status})`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] ?? "executive-tugas.csv";

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Gagal mengekspor CSV.");
    } finally {
      setPending(false);
    }
  }, [kecamatanCode]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-card transition hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {pending ? "Mengekspor…" : "Export CSV"}
    </button>
  );
}
