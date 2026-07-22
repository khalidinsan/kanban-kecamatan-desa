"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type KecamatanOption = { code: string; name: string };

export function KecamatanFilter({
  options,
}: {
  options: KecamatanOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("kecamatan") ?? "";

  const selectOptions = useMemo(
    () => [
      { value: "", label: "Semua kecamatan (Kab. aktif)" },
      ...options.map((k) => ({
        value: k.code,
        label: k.name,
        keywords: k.code,
      })),
    ],
    [options],
  );

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("kecamatan", value);
    } else {
      params.delete("kecamatan");
    }
    const qs = params.toString();
    router.push(qs ? `/executive?${qs}` : "/executive");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor="kecamatan-filter"
        className="text-xs font-medium text-muted-foreground"
      >
        Filter kecamatan
      </label>
      <SearchableSelect
        id="kecamatan-filter"
        variant="filter"
        className="min-w-[14rem]"
        options={selectOptions}
        value={current}
        onChange={onChange}
        placeholder="Semua kecamatan"
        searchPlaceholder="Cari kecamatan…"
      />
    </div>
  );
}
