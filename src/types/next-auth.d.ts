import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      role: Role;
      kecamatanCode: string | null;
      desaCode: string | null;
      username: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name: string;
    role: Role;
    kecamatanCode: string | null;
    desaCode: string | null;
    username: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    role: Role;
    kecamatanCode: string | null;
    desaCode: string | null;
    username: string;
  }
}
