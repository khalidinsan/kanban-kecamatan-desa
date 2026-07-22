"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";

export type SelectOption = {
  value: string;
  label: string;
  /** Extra text included in search (optional) */
  keywords?: string;
};

export type SearchableSelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  /** Compact style for filters (bg-card + shadow) */
  variant?: "field" | "filter";
  className?: string;
  /** Hide search when options are few (still searchable if false) */
  searchable?: boolean;
};

export function SearchableSelect({
  options,
  value: valueProp,
  defaultValue = "",
  onChange,
  name,
  id,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyText = "Tidak ada hasil",
  disabled = false,
  required = false,
  clearable = false,
  variant = "field",
  className,
  searchable = true,
}: SearchableSelectProps) {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const triggerId = id ?? `${reactId}-trigger`;

  const isControlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const value = isControlled ? valueProp : internal;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const { mounted: menuMounted, visible: menuVisible } = usePresence(open, 150);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.keywords ?? ""} ${o.value}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlight(0);
  }, []);

  const selectOption = useCallback(
    (opt: SelectOption) => {
      setValue(opt.value);
      close();
    },
    [setValue, close],
  );

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

  useEffect(() => {
    if (!open) return;
    // Focus search after the menu has been committed.
    const frame = requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open, filtered]);

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setHighlight(0);
      setOpen(true);
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) selectOption(opt);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(Math.max(filtered.length - 1, 0));
    }
  }

  const triggerClass =
    variant === "filter"
      ? "bg-card shadow-card hover:shadow-card-hover focus:shadow-card-hover"
      : "bg-muted/60 focus:bg-card focus:shadow-card";

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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => {
            if (!o) setHighlight(0);
            return !o;
          });
        }}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "anim-interactive flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm outline-none",
          triggerClass,
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selected && "text-muted-foreground",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        {clearable && value ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Hapus pilihan"
            className="rounded-lg p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setValue("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {menuMounted ? (
        <div
          className={cn(
            "absolute z-[100] mt-1.5 w-full overflow-hidden rounded-2xl bg-card shadow-elevated origin-top",
            menuVisible ? "anim-pop-in" : "anim-pop-out",
          )}
          onKeyDown={onListKeyDown}
        >
          {searchable ? (
            <div className="relative px-2.5 pt-2.5">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-0.5 text-muted-foreground" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onListKeyDown}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl bg-muted/60 py-2 pl-8 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:bg-muted"
                autoComplete="off"
              />
            </div>
          ) : null}

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={triggerId}
            className="max-h-60 overflow-y-auto p-1.5"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </li>
            ) : (
              filtered.map((opt, index) => {
                const isSelected = opt.value === value;
                const isActive = index === highlight;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                      isActive && "bg-muted",
                      isSelected && "font-medium text-primary",
                      !isActive && "hover:bg-muted/70",
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectOption(opt);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

