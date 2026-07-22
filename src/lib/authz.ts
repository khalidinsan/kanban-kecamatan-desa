import type { Role, Task } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  kecamatanCode: string | null;
  desaCode: string | null;
  username: string;
};

export class AuthzError extends Error {
  constructor(
    message: string,
    public status: number = 403,
  ) {
    super(message);
    this.name = "AuthzError";
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user as SessionUser;
}

export async function requireRole(
  ...roles: Role[]
): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    throw new AuthzError("Anda tidak memiliki akses untuk tindakan ini.");
  }
  return user;
}

export type TaskAccessShape = Pick<
  Task,
  "id" | "kecamatanCode" | "desaCode" | "createdById" | "assignedToId" | "kabupatenCode"
>;

/**
 * Scaffolding: determine if a user can view/mutate a task based on role + wilayah.
 * Full enforcement will be used by PR3+ task APIs.
 */
export function assertTaskAccess(
  user: SessionUser,
  task: TaskAccessShape,
  action: "read" | "write" | "review" = "read",
): void {
  switch (user.role) {
    case "admin":
      return;

    case "camat":
    case "operator_kecamatan": {
      if (!user.kecamatanCode || user.kecamatanCode !== task.kecamatanCode) {
        throw new AuthzError("Tugas di luar wilayah kecamatan Anda.");
      }
      if (action === "review" && user.role === "camat") {
        // camat can review (read-focused executive); write review is kecamatan/admin
        return;
      }
      return;
    }

    case "operator_desa": {
      if (!user.desaCode || user.desaCode !== task.desaCode) {
        throw new AuthzError("Tugas di luar wilayah desa Anda.");
      }
      if (action === "review") {
        throw new AuthzError("Operator desa tidak dapat menyetujui/menolak review.");
      }
      return;
    }

    default:
      throw new AuthzError("Peran tidak dikenali.");
  }
}

export function canAccessAdmin(user: SessionUser): boolean {
  return user.role === "admin";
}

export function canAccessExecutive(user: SessionUser): boolean {
  return user.role === "admin" || user.role === "camat";
}

export function homePathForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/users";
    case "camat":
      return "/executive";
    case "operator_kecamatan":
    case "operator_desa":
    default:
      return "/board";
  }
}
