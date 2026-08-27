import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new Error("UNAUTHORIZED");

  const user = await import("@/lib/prisma").then(({ prisma }) =>
    prisma.user.findUnique({ where: { id: userId } }),
  );
  if (!user) throw new Error("UNAUTHORIZED");

  return user;
}
