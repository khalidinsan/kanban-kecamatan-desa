import { requireSession } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();

  return (
    <AppShell
      user={{
        name: user.name,
        role: user.role,
        username: user.username,
      }}
    >
      {children}
    </AppShell>
  );
}
