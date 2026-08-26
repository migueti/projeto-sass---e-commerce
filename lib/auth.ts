import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");

  const user = await import("@/lib/prisma").then(({ prisma }) =>
    prisma.user.findUnique({ where: { email } }),
  );
  if (!user) throw new Error("UNAUTHORIZED");

  return user;
}
