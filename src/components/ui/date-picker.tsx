"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";

export type DatePickerProps = {
  /** ISO date string yyyy-MM-dd (form-friendly) */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  /** Min/max as yyyy-MM-dd. Overridden by disablePast for min when true. */
  min?: string;
  max?: string;
  /**
   * Block dates before today (local). Default false for generic use;
   * create-task due date should pass true.
   */
  disablePast?: boolean;
  /** Show quick period chips (due-date UX). Default true. */
  showPresets?: boolean;
  className?: string;
  variant?: "field" | "filter";
};

type Preset = {
  id: string;
  label: string;
  /** Days from today (0 = today). */
  days: number;
};

/** Operational due-date shortcuts for kecamatan → desa tasks. */
const DUE_PRESETS: Preset[] = [
  { id: "today", label: "Hari ini", days: 0 },
  { id: "d1", label: "1 hari", days: 1 },
  { id: "d3", label: "3 hari", days: 3 },
  { id: "w1", label: "1 minggu", days: 7 },
  { id: "w2", label: "2 minggu", days: 14 },
  { id: "m1", label: "1 bulan", days: 30 },
  { id: "m3", label: "3 bulan", days: 90 },
  { id: "m6", label: "6 bulan", days: 180 },
];

function parseValue(v: string | undefined): Date | null {
  if (!v) return null;
  try {
    const d = parseISO(v);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function toIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function todayIso(): string {
  return toIso(new Date());
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function DatePicker({
  value: valueProp,
  defaultValue = "",
  onChange,
  name,
  id,
  placeholder = "Pilih tanggal",
  disabled = false,
  required = false,
  clearable = true,
  min,
  max,
  disablePast = false,
  showPresets = true,
  className,
  variant = "field",
}: DatePickerProps) {
  const reactId = useId();
  const triggerId = id ?? `${reactId}-trigger`;

  const isControlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const value = isControlled ? valueProp : internal;
  const selected = parseValue(value);

  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { mounted: menuMounted, visible: menuVisible } = usePresence(open, 150);
  const [viewMonth, setViewMonth] = useState<Date>(
    () => selected ?? new Date(),
  );

  const rootRef = useRef<HTMLDivElement>(null);

  const effectiveMin = disablePast ? (min && min > todayIso() ? min : todayIso()) : min;
  const minDate = parseValue(effectiveMin);
  const maxDate = parseValue(max);

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setShowCalendar(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  function isDisabledDay(d: Date): boolean {
    const day = startOfLocalDay(d).getTime();
    if (minDate && day < startOfLocalDay(minDate).getTime()) return true;
    if (maxDate && day > startOfLocalDay(maxDate).getTime()) return true;
    return false;
  }

  function pick(d: Date) {
    if (isDisabledDay(d)) return;
    setValue(toIso(d));
    close();
  }

  function pickPreset(daysFromToday: number) {
    const target = addDays(startOfLocalDay(new Date()), daysFromToday);
    if (isDisabledDay(target)) return;
    setValue(toIso(target));
    setViewMonth(target);
    close();
  }

  function canGoPrevMonth(): boolean {
    if (!minDate) return true;
    const prevMonthEnd = endOfMonth(subMonths(viewMonth, 1));
    return startOfLocalDay(prevMonthEnd).getTime() >= startOfLocalDay(minDate).getTime();
  }

  function canGoNextMonth(): boolean {
    if (!maxDate) return true;
    const nextMonthStart = startOfMonth(addMonths(viewMonth, 1));
    return startOfLocalDay(nextMonthStart).getTime() <= startOfLocalDay(maxDate).getTime();
  }

  const activePresetId = useMemo(() => {
    if (!selected) return null;
    const today = startOfLocalDay(new Date());
    for (const p of DUE_PRESETS) {
      if (isSameDay(selected, addDays(today, p.days))) return p.id;
    }
    return "custom";
  }, [selected]);

  const triggerClass =
    variant === "filter"
      ? "bg-card shadow-card hover:shadow-card-hover focus:shadow-card-hover"
      : "bg-muted/60 focus:bg-card focus:shadow-card";

  const displayLabel = selected
    ? format(selected, "d MMMM yyyy", { locale: localeId })
    : null;

  const presetHint =
    activePresetId && activePresetId !== "custom"
      ? DUE_PRESETS.find((p) => p.id === activePresetId)?.label
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
          disabled={disabled}
        />
      ) : null}

      <button
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          if (!open) {
            if (selected) setViewMonth(selected);
            else setViewMonth(new Date());
            // Open on presets first; show calendar if already a custom date
            setShowCalendar(activePresetId === "custom" || !showPresets);
          }
          setOpen((o) => !o);
        }}
        className={cn(
          "anim-interactive flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm outline-none",
          triggerClass,
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !displayLabel && "text-muted-foreground",
          )}
        >
          {displayLabel ? (
            <>
              {displayLabel}
              {presetHint ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  · {presetHint}
                </span>
              ) : null}
            </>
          ) : (
            placeholder
          )}
        </span>
        {clearable && value ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Hapus tanggal"
            className="rounded-lg p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setValue("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>

      {menuMounted ? (
        <div
          role="dialog"
          aria-label="Pilih tanggal jatuh tempo"
          className={cn(
            "absolute z-50 mt-1.5 w-[19.5rem] origin-top rounded-2xl bg-card p-3 shadow-elevated",
            menuVisible ? "anim-pop-in" : "anim-pop-out",
          )}
        >
          {showPresets ? (
            <div className="mb-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pilih cepat
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DUE_PRESETS.map((p) => {
                  const target = addDays(startOfLocalDay(new Date()), p.days);
                  const presetDisabled = isDisabledDay(target);
                  const active = activePresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={presetDisabled}
                      onClick={() => pickPreset(p.days)}
                      className={cn(
                        "anim-interactive rounded-full px-2.5 py-1 text-xs font-semibold transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-card"
                          : "bg-muted/70 text-foreground hover:bg-muted",
                        presetDisabled && "cursor-not-allowed opacity-40",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {showPresets ? (
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Atau pilih tanggal
              </p>
              <button
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition",
                  showCalendar || activePresetId === "custom"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/70 text-foreground hover:bg-muted",
                )}
              >
                {showCalendar ? "Sembunyikan" : "Kalender"}
              </button>
            </div>
          ) : null}

          {(showCalendar || !showPresets) ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!canGoPrevMonth()}
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold capitalize">
                  {format(viewMonth, "MMMM yyyy", { locale: localeId })}
                </p>
                <button
                  type="button"
                  disabled={!canGoNextMonth()}
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const selectedDay = selected ? isSameDay(day, selected) : false;
                  const today = isToday(day);
                  const dayDisabled = isDisabledDay(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={dayDisabled}
                      onClick={() => pick(day)}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-xl text-sm transition",
                        !inMonth && "text-muted-foreground/40",
                        inMonth && !selectedDay && "text-foreground hover:bg-muted",
                        today && !selectedDay && "font-semibold text-primary",
                        selectedDay &&
                          "bg-primary font-semibold text-primary-foreground shadow-card",
                        dayDisabled && "cursor-not-allowed opacity-30",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-muted/50 pt-2">
            {disablePast ? (
              <p className="text-[11px] text-muted-foreground">
                Tanggal mundur tidak diizinkan
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  if (!isDisabledDay(t)) {
                    setValue(toIso(t));
                    setViewMonth(t);
                    close();
                  }
                }}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
              >
                Hari ini
              </button>
            )}
            {clearable ? (
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  close();
                }}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Hapus
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
