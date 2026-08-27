import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { consumeLoginAttempt, resetLoginAttempts } from "@/lib/login-rate-limit";
import { passwordSchema } from "@/lib/validation";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      token.id = user?.id ?? token.id ?? token.sub;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        if (!passwordSchema.safeParse(credentials.password).success) return null;
        const email = credentials.email.trim().toLowerCase();
        if (!consumeLoginAttempt(email)) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.passwordHash) return null;

        const passwordMatches = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!passwordMatches) return null;

        resetLoginAttempts(email);
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
};
