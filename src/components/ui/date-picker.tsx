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
  /** Min/max as yyyy-MM-dd */
  min?: string;
  max?: string;
  className?: string;
  variant?: "field" | "filter";
};

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
  const { mounted: menuMounted, visible: menuVisible } = usePresence(open, 150);
  const [viewMonth, setViewMonth] = useState<Date>(
    () => selected ?? new Date(),
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const minDate = parseValue(min);
  const maxDate = parseValue(max);

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const close = useCallback(() => setOpen(false), []);

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

  function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function isDisabledDay(d: Date): boolean {
    const day = startOfDay(d).getTime();
    if (minDate && day < startOfDay(minDate).getTime()) return true;
    if (maxDate && day > startOfDay(maxDate).getTime()) return true;
    return false;
  }

  function pick(d: Date) {
    if (isDisabledDay(d)) return;
    setValue(toIso(d));
    close();
  }

  const triggerClass =
    variant === "filter"
      ? "bg-card shadow-card hover:shadow-card-hover focus:shadow-card-hover"
      : "bg-muted/60 focus:bg-card focus:shadow-card";

  const displayLabel = selected
    ? format(selected, "d MMMM yyyy", { locale: localeId })
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
          if (!open && selected) setViewMonth(selected);
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
          {displayLabel ?? placeholder}
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
          aria-label="Pilih tanggal"
          className={cn(
            "absolute z-50 mt-1.5 w-[18.5rem] origin-top rounded-2xl bg-card p-3 shadow-elevated",
            menuVisible ? "anim-pop-in" : "anim-pop-out",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold capitalize">
              {format(viewMonth, "MMMM yyyy", { locale: localeId })}
            </p>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
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

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-transparent pt-2">
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
