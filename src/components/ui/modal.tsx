"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** sm | md | lg */
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

const EXIT_MS = 180;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(open, EXIT_MS);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    if (visible) document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);

    if (visible) {
      requestAnimationFrame(() => panelRef.current?.focus());
    }

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mounted, visible, open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      aria-hidden={!visible}
    >
      <button
        type="button"
        aria-label="Tutup dialog"
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px]",
          visible ? "anim-fade-in" : "anim-fade-out",
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative z-[81] max-h-[min(90vh,760px)] w-full overflow-y-auto rounded-3xl bg-card shadow-elevated outline-none",
          SIZE[size],
          visible ? "anim-scale-in" : "anim-scale-out",
          // mobile: slide up feel via same scale keyframes
          "sm:anim-scale-in",
          className,
        )}
      >
        <div className="sticky top-0 z-[82] flex items-start justify-between gap-3 bg-card/95 px-5 pt-5 backdrop-blur-sm sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="anim-interactive rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
