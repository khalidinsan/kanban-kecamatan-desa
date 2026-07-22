import { auth, signIn, signOut } from "@/auth";

export { auth, signIn, signOut };

export async function getCurrentSession() {
  return auth();
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
