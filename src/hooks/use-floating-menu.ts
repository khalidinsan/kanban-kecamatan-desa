"use client";

import { useCallback, useLayoutEffect, useState } from "react";

export type FloatingMenuStyle = {
  position: "fixed";
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  zIndex: number;
};

const VIEWPORT_PAD = 8;
const GAP = 6;
const DEFAULT_MAX = 280;

/**
 * Position a floating menu relative to a trigger element (fixed + portal-friendly).
 * Flips above the trigger when there is not enough space below.
 */
export function useFloatingMenu(
  open: boolean,
  triggerEl: HTMLElement | null,
  opts?: { maxHeight?: number; zIndex?: number },
) {
  const maxHeight = opts?.maxHeight ?? DEFAULT_MAX;
  const zIndex = opts?.zIndex ?? 200;
  const [style, setStyle] = useState<FloatingMenuStyle | null>(null);

  const update = useCallback(() => {
    if (!open || !triggerEl) {
      setStyle(null);
      return;
    }
    const rect = triggerEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    const placeBelow =
      spaceBelow >= Math.min(maxHeight, 160) || spaceBelow >= spaceAbove;
    const available = placeBelow ? spaceBelow : spaceAbove;
    const height = Math.max(120, Math.min(maxHeight, available - GAP));

    const width = Math.max(rect.width, 200);
    let left = rect.left;
    if (left + width > window.innerWidth - VIEWPORT_PAD) {
      left = Math.max(VIEWPORT_PAD, window.innerWidth - VIEWPORT_PAD - width);
    }
    left = Math.max(VIEWPORT_PAD, left);

    const top = placeBelow
      ? rect.bottom + GAP
      : Math.max(VIEWPORT_PAD, rect.top - GAP - height);

    setStyle({
      position: "fixed",
      top,
      left,
      width: Math.min(width, window.innerWidth - VIEWPORT_PAD * 2),
      maxHeight: height,
      zIndex,
    });
  }, [open, triggerEl, maxHeight, zIndex]);

  useLayoutEffect(() => {
    if (!open) {
      // Clear after close without sync setState from measurement path when closed
      queueMicrotask(() => setStyle(null));
      return;
    }
    // Measure DOM after paint — required for fixed portal positioning
    const id = requestAnimationFrame(() => {
      update();
    });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return style;
}
