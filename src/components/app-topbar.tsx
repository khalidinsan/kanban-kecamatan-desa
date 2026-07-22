"use client";

import { ThemeToggle } from "@/components/theme-toggle";

export function AppTopbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4">
      <div key={title} className="min-w-0 anim-page-in">
        <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <ThemeToggle />
    </header>
  );
}
