import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new Error("UNAUTHORIZED");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("UNAUTHORIZED");

  return user;
}

export async function requirePaidUser() {
  const user = await requireUser();
  if (!user.hasPaid && !isAdminUser(user)) redirect("/assinar");
  return user;
}

export async function requirePaidApiUser() {
  const user = await requireUser();
  if (!user.hasPaid && !isAdminUser(user)) throw new Error("PAYMENT_REQUIRED");
  return user;
}

export function isAdminUser(user: { role: string; email: string }) {
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return user.role === "ADMIN" || user.email.trim().toLowerCase() === configuredAdminEmail;
}

export async function requireAdminUser() {
  const user = await requireUser();
  if (!isAdminUser(user)) throw new Error("FORBIDDEN");
  return user;
}
