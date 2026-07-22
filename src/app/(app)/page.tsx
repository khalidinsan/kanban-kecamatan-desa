import { redirect } from "next/navigation";
import { requireSession, homePathForRole } from "@/lib/authz";

export default async function HomePage() {
  const user = await requireSession();
  redirect(homePathForRole(user.role));
}
