"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createTask, type ActionResult } from "@/actions/tasks";
import type { TaskPriority } from "@prisma/client";
import { PRIORITY_LABELS } from "@/lib/labels";
import {
  DEFAULT_ACCEPT,
  FileDropzone,
} from "@/components/ui/file-dropzone";
import { DatePicker } from "@/components/ui/date-picker";
import {
  SearchableMultiSelect,
  SearchableSelect,
} from "@/components/ui/searchable-select";

export type WilayahOption = { code: string; name: string };
export type KecamatanWithDesa = WilayahOption & { desa: WilayahOption[] };

const PRIORITIES = Object.keys(PRIORITY_LABELS) as TaskPriority[];

export function CreateTaskForm({
  mode,
  kecamatanList,
  fixedKecamatanCode,
  desaList,
}: {
  mode: "admin" | "operator_kecamatan";
  kecamatanList?: KecamatanWithDesa[];
  fixedKecamatanCode?: string;
  desaList?: WilayahOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>("sedang");
  const [dueDate, setDueDate] = useState("");
  const [kecamatanCode, setKecamatanCode] = useState(
    mode === "admin" ? (kecamatanList?.[0]?.code ?? "") : (fixedKecamatanCode ?? ""),
  );

  const availableDesa = useMemo(() => {
    if (mode === "operator_kecamatan") return desaList ?? [];
    const kec = kecamatanList?.find((k) => k.code === kecamatanCode);
    return kec?.desa ?? [];
  }, [mode, desaList, kecamatanList, kecamatanCode]);

  const [desaCodes, setDesaCodes] = useState<string[]>([]);

  // Derive valid selection when available desa list changes (no effect/setState).
  const validDesaCodes = useMemo(() => {
    const allowed = new Set(availableDesa.map((d) => d.code));
    return desaCodes.filter((c) => allowed.has(c));
  }, [desaCodes, availableDesa]);

  const kecamatanOptions = useMemo(
    () =>
      (kecamatanList ?? []).map((k) => ({
        value: k.code,
        label: k.name,
        keywords: k.code,
      })),
    [kecamatanList],
  );

  const desaOptions = useMemo(
    () =>
      availableDesa.map((d) => ({
        value: d.code,
        label: d.name,
        keywords: d.code,
      })),
    [availableDesa],
  );

  const priorityOptions = useMemo(
    () =>
      PRIORITIES.map((p) => ({
        value: p,
        label: PRIORITY_LABELS[p],
      })),
    [],
  );

  function onKecamatanChange(code: string) {
    setKecamatanCode(code);
    setDesaCodes([]);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (validDesaCodes.length === 0) {
      setError("Minimal satu desa wajib dipilih.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    // Ensure multi-select values are present even if hidden inputs race
    formData.delete("desaCodes");
    formData.delete("desaCode");
    for (const code of validDesaCodes) {
      formData.append("desaCodes", code);
    }

    startTransition(async () => {
      const result = (await createTask(formData)) as ActionResult | void;
      // redirect() never returns; only errors return ActionResult
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Judul tugas <span className="text-danger">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
          placeholder="Contoh: Perbaikan drainase RT 03"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Deskripsi
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          className="w-full resize-y rounded-xl bg-muted/60 px-3 py-2.5 text-sm outline-none transition focus:bg-card focus:shadow-card"
          placeholder="Uraian singkat pekerjaan yang harus diselesaikan desa..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="priority" className="text-sm font-medium">
            Prioritas
          </label>
          <SearchableSelect
            id="priority"
            name="priority"
            options={priorityOptions}
            value={priority}
            onChange={(v) => setPriority(v as TaskPriority)}
            placeholder="Pilih prioritas"
            searchPlaceholder="Cari prioritas…"
            searchable={false}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="dueDate" className="text-sm font-medium">
            Jatuh tempo
          </label>
          <DatePicker
            id="dueDate"
            name="dueDate"
            value={dueDate}
            onChange={setDueDate}
            placeholder="Pilih tanggal"
          />
        </div>
      </div>

      {mode === "admin" ? (
        <div className="space-y-2">
          <label htmlFor="kecamatanCode" className="text-sm font-medium">
            Kecamatan <span className="text-danger">*</span>
          </label>
          <SearchableSelect
            id="kecamatanCode"
            name="kecamatanCode"
            required
            options={kecamatanOptions}
            value={kecamatanCode}
            onChange={onKecamatanChange}
            placeholder="Pilih kecamatan"
            searchPlaceholder="Cari kecamatan…"
          />
        </div>
      ) : (
        <input type="hidden" name="kecamatanCode" value={fixedKecamatanCode ?? ""} />
      )}

      <div className="space-y-2">
        <label htmlFor="desaCodes" className="text-sm font-medium">
          Desa tujuan <span className="text-danger">*</span>
        </label>
        <SearchableMultiSelect
          id="desaCodes"
          name="desaCodes"
          required
          options={desaOptions}
          value={validDesaCodes}
          onChange={setDesaCodes}
          placeholder={
            availableDesa.length === 0
              ? "Tidak ada desa"
              : "Pilih satu atau lebih desa"
          }
          searchPlaceholder="Cari desa…"
          emptyText="Desa tidak ditemukan"
          disabled={availableDesa.length === 0}
        />
        <p className="text-xs text-muted-foreground">
          Bisa memilih beberapa desa dalam kecamatan yang sama. Setiap desa
          mendapat salinan tugas terpisah.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="files" className="text-sm font-medium">
          Lampiran (opsional)
        </label>
        <FileDropzone
          id="files"
          name="files"
          multiple
          accept={DEFAULT_ACCEPT}
        />
      </div>

      {error ? (
        <div className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={pending || availableDesa.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : validDesaCodes.length > 1 ? (
            `Buat Tugas (${validDesaCodes.length} desa)`
          ) : (
            "Buat Tugas"
          )}
        </button>
      </div>
    </form>
  );
}
