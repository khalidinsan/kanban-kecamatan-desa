"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  collapsed,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn(
        "anim-interactive inline-flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed
          ? "h-10 w-10 justify-center"
          : "w-full gap-2 px-3 py-2",
        className,
      )}
      title={collapsed ? "Keluar" : undefined}
      aria-label="Keluar"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {!collapsed ? <span>Keluar</span> : null}
    </button>
  );
}
