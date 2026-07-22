import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND } from "@/config/brand";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md anim-page-in">
        <div className="rounded-3xl bg-card p-8 shadow-elevated">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 p-1.5">
              <BrandLogo size={56} className="h-14 w-14" priority />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {BRAND.name}
            </h1>
            <p className="mt-2 max-w-sm text-sm font-medium leading-snug text-foreground/85">
              {BRAND.subtitle}
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-primary">
              {BRAND.regionLong}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{BRAND.tagline}</p>
          </div>

          <Suspense
            fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <p className="mt-8 max-w-md text-center text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground/80">{BRAND.name}</span>
        {" — "}
        {BRAND.subtitle}
      </p>
    </div>
  );
}
