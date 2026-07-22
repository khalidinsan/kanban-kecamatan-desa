import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.isActive) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          kecamatanCode: user.kecamatanCode,
          desaCode: user.desaCode,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.name = user.name ?? "";
        token.role = user.role as Role;
        token.kecamatanCode = user.kecamatanCode ?? null;
        token.desaCode = user.desaCode ?? null;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) ?? "";
        session.user.role = token.role as Role;
        session.user.kecamatanCode = (token.kecamatanCode as string | null) ?? null;
        session.user.desaCode = (token.desaCode as string | null) ?? null;
        session.user.username = (token.username as string) ?? "";
      }
      return session;
    },
  },
  trustHost: true,
});
