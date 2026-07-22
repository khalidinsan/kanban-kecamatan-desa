"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import type { ActionBadges } from "@/lib/action-badges";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  /** Key into ActionBadges for "perlu aksi" count */
  badgeKey?: keyof ActionBadges;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/board",
    label: "Board",
    icon: LayoutDashboard,
    badgeKey: "board",
  },
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
    badgeKey: "executive",
  },
  {
    href: "/admin/users",
    label: "Admin",
    icon: Users,
    roles: ["admin"],
  },
];

function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function MobileNav({
  user,
  badges,
}: {
  user: {
    name: string;
    role: Role;
    username: string;
  };
  badges?: ActionBadges;
}) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-primary/10 bg-card/95 text-card-foreground backdrop-blur-md",
        "shadow-[0_-4px_16px_-8px_rgb(18_32_24_/_0.12)]",
        "pb-safe",
      )}
    >
      <ul className="flex items-stretch justify-around gap-1 px-1 pt-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const badgeCount =
            item.badgeKey && badges ? (badges[item.badgeKey] ?? 0) : 0;
          const showBadge = badgeCount > 0;
          const badgeLabel = showBadge
            ? `${item.label}: ${badgeCount} perlu aksi`
            : item.label;

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={showBadge ? badgeLabel : undefined}
                className={cn(
                  "anim-interactive flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium leading-tight",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex h-8 w-8 items-center justify-center rounded-xl",
                    active ? "bg-primary/10" : "bg-transparent",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {showBadge ? (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white"
                      aria-hidden
                    >
                      {formatBadgeCount(badgeCount)}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
