"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBrazilianCents } from "@/lib/validation";

const priceSchema = z.object({
  price: z.string().trim().min(1, "Informe um preço."),
});

export type AdminPriceState = { error?: string; success?: boolean };

export async function updatePlanPrice(
  _state: AdminPriceState,
  formData: FormData,
): Promise<AdminPriceState> {
  await requireAdminUser();
  const result = priceSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Confira o preço." };

  const priceCents = parseBrazilianCents(result.data.price);
  if (!priceCents) return { error: "Informe um preço válido maior que zero." };

  await prisma.appSettings.upsert({
    where: { id: "global" },
    create: { id: "global", planPriceCents: priceCents },
    update: { planPriceCents: priceCents },
  });
  revalidatePath("/admin");
  revalidatePath("/assinar");
  return { success: true };
}
