"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Users,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { useSidebar } from "@/components/sidebar-context";
import { BrandLogo } from "@/components/brand-logo";
import type { Role } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/transitions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/board", label: "Board", icon: LayoutDashboard },
  {
    href: "/tugas/baru",
    label: "Tugas Baru",
    icon: PlusCircle,
    roles: ["admin", "operator_kecamatan"],
  },
  {
    href: "/executive",
    label: "Executive",
    icon: BarChart3,
    roles: ["admin", "camat"],
  },
  {
    href: "/admin/users",
    label: "Admin Users",
    icon: Users,
    roles: ["admin"],
  },
];

export function AppSidebar({
  user,
}: {
  user: {
    name: string;
    role: Role;
    username: string;
  };
}) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 flex h-svh shrink-0 flex-col",
        "bg-sidebar text-sidebar-foreground shadow-sidebar",
        "transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Brand + collapse */}
      <div
        className={cn(
          "flex shrink-0 py-4",
          collapsed
            ? "flex-col items-center gap-2 px-0"
            : "items-center gap-2 px-3",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "min-w-0 flex-1 gap-3",
          )}
        >
          <BrandLogo size={40} className="h-10 w-10" priority />
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight">
                Kanban Desa
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Kab. Subang
              </p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          className="anim-interactive inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto py-2",
          collapsed ? "items-center px-0" : "px-2",
        )}
      >
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "anim-interactive inline-flex items-center rounded-xl text-sm font-medium",
                collapsed
                  ? "h-10 w-10 justify-center"
                  : "w-full gap-3 px-3 py-2.5",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "mt-auto flex flex-col gap-2 py-4",
          collapsed ? "items-center px-0" : "px-3",
        )}
      >
        {collapsed ? (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary"
            title={`${user.name} (@${user.username}) · ${ROLE_LABELS[user.role]}`}
          >
            {initials}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/50 px-3 py-3">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              @{user.username}
            </p>
            <p className="mt-1 text-xs font-medium text-primary">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        )}

        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
