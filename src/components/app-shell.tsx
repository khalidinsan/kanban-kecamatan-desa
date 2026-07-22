"use client";

import type { Role } from "@prisma/client";
import type { ActionBadges } from "@/lib/action-badges";
import { AppFooter } from "@/components/app-footer";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { SidebarProvider } from "@/components/sidebar-context";

export function AppShell({
  user,
  badges,
  children,
}: {
  user: { name: string; role: Role; username: string };
  badges?: ActionBadges;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <AppSidebar user={user} badges={badges} />
        <main className="flex min-h-svh min-w-0 flex-1 flex-col overflow-x-hidden pb-20 md:pb-0">
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <AppFooter />
        </main>
        <MobileNav user={user} badges={badges} />
      </div>
    </SidebarProvider>
  );
}
