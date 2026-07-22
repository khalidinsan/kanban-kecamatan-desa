"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";
import { useFloatingMenu } from "@/hooks/use-floating-menu";

export type SelectOption = {
  value: string;
  label: string;
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
  variant?: "field" | "filter";
  className?: string;
  searchable?: boolean;
};

export type SearchableMultiSelectProps = {
  options: SelectOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  variant?: "field" | "filter";
  className?: string;
  searchable?: boolean;
};

function filterOptions(options: SelectOption[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => {
    const hay = `${o.label} ${o.keywords ?? ""} ${o.value}`.toLowerCase();
    return hay.includes(q);
  });
}

const triggerField =
  "bg-muted/60 focus:bg-card focus:shadow-card";
const triggerFilter =
  "bg-card shadow-card hover:shadow-card-hover focus:shadow-card-hover";

/** Multi-select with search + checkbox list (hidden inputs for FormData). */
export function SearchableMultiSelect({
  options,
  value: valueProp,
  defaultValue = [],
  onChange,
  name,
  id,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyText = "Tidak ada hasil",
  disabled = false,
  required = false,
  variant = "field",
  className,
  searchable = true,
}: SearchableMultiSelectProps) {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const triggerId = id ?? `${reactId}-trigger`;

  const isControlled = valueProp !== undefined;
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const values = isControlled ? valueProp : internal;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const { mounted: menuMounted, visible: menuVisible } = usePresence(open, 150);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);

  const floating = useFloatingMenu(open && menuMounted, triggerEl, {
    maxHeight: 280,
    zIndex: 200,
  });

  const selectedOptions = useMemo(
    () => options.filter((o) => values.includes(o.value)),
    [options, values],
  );
  const filtered = useMemo(
    () => filterOptions(options, query),
    [options, query],
  );

  const setValues = useCallback(
    (next: string[]) => {
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

  const toggleOption = useCallback(
    (opt: SelectOption) => {
      if (values.includes(opt.value)) {
        setValues(values.filter((v) => v !== opt.value));
      } else {
        setValues([...values, opt.value]);
      }
    },
    [setValues, values],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
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
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) toggleOption(opt);
    }
  }

  const triggerClass = variant === "filter" ? triggerFilter : triggerField;
  const summary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length <= 2
        ? selectedOptions.map((o) => o.label).join(", ")
        : `${selectedOptions.length} dipilih`;

  const menu =
    menuMounted && floating && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            style={{
              position: floating.position,
              top: floating.top,
              left: floating.left,
              width: floating.width,
              maxHeight: floating.maxHeight,
              zIndex: floating.zIndex,
            }}
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl bg-card shadow-elevated origin-top",
              menuVisible ? "anim-pop-in" : "anim-pop-out",
            )}
            onKeyDown={onListKeyDown}
          >
            {searchable ? (
              <div className="relative shrink-0 px-2.5 pt-2.5">
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

            <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 text-xs text-muted-foreground">
              <span>{values.length} dipilih</span>
              {filtered.length > 0 ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      const ids = new Set([
                        ...values,
                        ...filtered.map((o) => o.value),
                      ]);
                      setValues([...ids]);
                    }}
                  >
                    Pilih semua
                  </button>
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => setValues([])}
                  >
                    Kosongkan
                  </button>
                </div>
              ) : null}
            </div>

            <ul
              ref={listRef}
              role="listbox"
              aria-multiselectable
              aria-labelledby={triggerId}
              className="min-h-0 flex-1 overflow-y-auto p-1.5"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyText}
                </li>
              ) : (
                filtered.map((opt, index) => {
                  const isSelected = values.includes(opt.value);
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
                        toggleOption(opt);
                      }}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name
        ? values.map((v) => (
            <input key={v} type="hidden" name={name} value={v} />
          ))
        : null}
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={values[0] ?? ""}
          required
          onChange={() => {}}
        />
      ) : null}

      <button
        ref={(el) => {
          triggerRef.current = el;
          setTriggerEl(el);
        }}
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
            selectedOptions.length === 0 && "text-muted-foreground",
          )}
        >
          {summary}
        </span>
        {values.length > 0 ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Hapus semua pilihan"
            className="rounded-lg p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setValues([]);
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

      {selectedOptions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
            >
              {opt.label}
              <button
                type="button"
                aria-label={`Hapus ${opt.label}`}
                className="rounded p-0.5 hover:bg-primary/15"
                onClick={() =>
                  setValues(values.filter((v) => v !== opt.value))
                }
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {menu}
    </div>
  );
}

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
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);

  const floating = useFloatingMenu(open && menuMounted, triggerEl, {
    maxHeight: 280,
    zIndex: 200,
  });

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );
  const filtered = useMemo(
    () => filterOptions(options, query),
    [options, query],
  );

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
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
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
    }
  }

  const triggerClass = variant === "filter" ? triggerFilter : triggerField;

  const menu =
    menuMounted && floating && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: floating.position,
              top: floating.top,
              left: floating.left,
              width: floating.width,
              maxHeight: floating.maxHeight,
              zIndex: floating.zIndex,
            }}
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl bg-card shadow-elevated origin-top",
              menuVisible ? "anim-pop-in" : "anim-pop-out",
            )}
            onKeyDown={onListKeyDown}
          >
            {searchable ? (
              <div className="relative shrink-0 px-2.5 pt-2.5">
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
              className="min-h-0 flex-1 overflow-y-auto p-1.5"
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
          </div>,
          document.body,
        )
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
        ref={(el) => setTriggerEl(el)}
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

      {menu}
    </div>
  );
}
