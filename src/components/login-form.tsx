"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  function flashError(message: string) {
    setError(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const user = username.trim();
    if (!user) {
      flashError("Username wajib diisi.");
      return;
    }
    if (!password) {
      flashError("Password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username: user,
        password,
        redirect: false,
      });

      if (result?.error) {
        flashError(
          "Username atau password salah. Periksa kembali dan coba lagi.",
        );
        setLoading(false);
        return;
      }

      if (result?.ok === false) {
        flashError("Gagal masuk. Coba lagi beberapa saat.");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      flashError("Terjadi kesalahan jaringan. Periksa koneksi lalu coba lagi.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("space-y-4", shake && "anim-shake")}
      noValidate
    >
      {error ? (
        <div
          id="login-error"
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium text-foreground">
          Username
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            className="w-full rounded-xl bg-muted/60 py-2.5 pl-10 pr-3 text-sm text-foreground outline-none ring-0 transition placeholder:text-muted-foreground focus:bg-card focus:shadow-card"
            placeholder="Masukkan username"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            className="w-full rounded-xl bg-muted/60 py-2.5 pl-10 pr-11 text-sm text-foreground outline-none ring-0 transition placeholder:text-muted-foreground focus:bg-card focus:shadow-card"
            placeholder="Masukkan password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Masuk...
          </>
        ) : (
          "Masuk"
        )}
      </button>
    </form>
  );
}
