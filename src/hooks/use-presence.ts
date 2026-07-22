"use client";

import { useEffect, useState } from "react";

/**
 * Keep component mounted during exit animation.
 * Always starts closed so enter keyframes can run on first open.
 *
 * @param open - desired open state
 * @param durationMs - should match CSS exit duration
 */
export function usePresence(open: boolean, durationMs = 200) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Defer mounting to the next frame, then reveal one frame later so the
      // browser paints the initial animation styles before the enter state.
      let visibleFrame = 0;
      const mountFrame = requestAnimationFrame(() => {
        setMounted(true);
        visibleFrame = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(mountFrame);
        cancelAnimationFrame(visibleFrame);
      };
    }

    const hideFrame = requestAnimationFrame(() => setVisible(false));
    if (!mounted) return () => cancelAnimationFrame(hideFrame);
    const t = window.setTimeout(() => setMounted(false), durationMs);
    return () => {
      cancelAnimationFrame(hideFrame);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to open
  }, [open, durationMs]);

  return { mounted, visible };
}
