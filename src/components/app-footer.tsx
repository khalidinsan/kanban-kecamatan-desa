import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * App chrome footer — brand expansion lives here (not the sidebar).
 */
export function AppFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "mt-auto shrink-0 border-t border-primary/10 bg-card/40 px-6 py-4",
        className,
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-foreground">
            {BRAND.name}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
            {BRAND.subtitle}
          </p>
        </div>
        <p className="shrink-0 text-[11px] text-muted-foreground sm:text-right sm:text-xs">
          {BRAND.regionLong}
          <span className="mx-1.5 text-muted-foreground/50" aria-hidden>
            ·
          </span>
          {year}
        </p>
      </div>
    </footer>
  );
}
