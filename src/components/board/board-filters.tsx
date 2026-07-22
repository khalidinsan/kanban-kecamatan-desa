"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import type { BoardDesaOption } from "@/components/board/types";
import { SearchableSelect } from "@/components/ui/searchable-select";

const PRIORITIES = Object.keys(PRIORITY_LABELS) as TaskPriority[];
const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[];

export type BoardFiltersState = {
  search: string;
  desaCode: string;
  priority: string;
  status: string;
};

export const EMPTY_BOARD_FILTERS: BoardFiltersState = {
  search: "",
  desaCode: "",
  priority: "",
  status: "",
};

export function BoardFilters({
  filters,
  onChange,
  desaOptions,
  showDesaFilter,
}: {
  filters: BoardFiltersState;
  onChange: (next: BoardFiltersState) => void;
  desaOptions: BoardDesaOption[];
  showDesaFilter: boolean;
}) {
  const hasActive =
    filters.search.trim() !== "" ||
    filters.desaCode !== "" ||
    filters.priority !== "" ||
    filters.status !== "";

  const desaSelectOptions = useMemo(
    () => [
      { value: "", label: "Semua desa" },
      ...desaOptions.map((d) => ({
        value: d.code,
        label: d.name,
        keywords: d.code,
      })),
    ],
    [desaOptions],
  );

  const prioritySelectOptions = useMemo(
    () => [
      { value: "", label: "Semua prioritas" },
      ...PRIORITIES.map((p) => ({
        value: p,
        label: PRIORITY_LABELS[p],
      })),
    ],
    [],
  );

  const statusSelectOptions = useMemo(
    () => [
      { value: "", label: "Semua status" },
      ...STATUSES.map((s) => ({
        value: s,
        label: STATUS_LABELS[s],
      })),
    ],
    [],
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Cari judul tugas..."
          className="w-full rounded-xl bg-card py-2 pl-9 pr-3 text-sm shadow-card outline-none transition placeholder:text-muted-foreground focus:shadow-card-hover"
        />
      </label>

      {showDesaFilter ? (
        <SearchableSelect
          variant="filter"
          className="min-w-[10rem] sm:min-w-[12rem]"
          options={desaSelectOptions}
          value={filters.desaCode}
          onChange={(desaCode) => onChange({ ...filters, desaCode })}
          placeholder="Semua desa"
          searchPlaceholder="Cari desa…"
        />
      ) : null}

      <SearchableSelect
        variant="filter"
        className="min-w-[9rem] sm:min-w-[11rem]"
        options={statusSelectOptions}
        value={filters.status}
        onChange={(status) => onChange({ ...filters, status })}
        placeholder="Semua status"
        searchPlaceholder="Cari status…"
        searchable={false}
      />

      <SearchableSelect
        variant="filter"
        className="min-w-[9rem] sm:min-w-[11rem]"
        options={prioritySelectOptions}
        value={filters.priority}
        onChange={(priority) => onChange({ ...filters, priority })}
        placeholder="Semua prioritas"
        searchPlaceholder="Cari prioritas…"
        searchable={prioritySelectOptions.length > 6}
      />

      {hasActive ? (
        <button
          type="button"
          onClick={() => onChange({ ...EMPTY_BOARD_FILTERS })}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </button>
      ) : null}
    </div>
  );
}
