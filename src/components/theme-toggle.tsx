"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribeHydration = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground",
          className,
        )}
        aria-label="Ganti tema"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-foreground transition hover:bg-muted",
        className,
      )}
      aria-label={isDark ? "Mode terang" : "Mode gelap"}
      title={isDark ? "Mode terang" : "Mode gelap"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
