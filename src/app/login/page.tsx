import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full items-center justify-center px-4 py-10">
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
              Kanban Kecamatan Desa
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Kabupaten Subang — masuk untuk mengelola tugas wilayah
            </p>
          </div>

          <Suspense
            fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}
          >
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Demo: admin / password123
          </p>
        </div>
      </div>
    </div>
  );
}
