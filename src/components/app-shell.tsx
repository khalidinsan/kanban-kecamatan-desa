"use client";

import type { Role } from "@prisma/client";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/sidebar-context";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: Role; username: string };
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <AppSidebar user={user} />
        <main className="flex min-h-svh min-w-0 flex-1 flex-col overflow-x-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
