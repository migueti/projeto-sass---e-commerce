import { prisma } from "@/lib/prisma";

const DEFAULT_PLAN_PRICE_CENTS = 2990;
const MAX_PLAN_PRICE_CENTS = 2_147_483_647;

export function initialPlanPriceCents(value = process.env.NUVEM_PLAN_PRICE) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value?.trim() ?? "");
  if (!match) return DEFAULT_PLAN_PRICE_CENTS;

  const cents =
    BigInt(match[1]) * BigInt(100) +
    BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const maxCents = BigInt(MAX_PLAN_PRICE_CENTS);
  return cents > BigInt(0) && cents <= maxCents
    ? Number(cents)
    : DEFAULT_PLAN_PRICE_CENTS;
}

export async function getPlanPriceCents() {
  const settings = await prisma.appSettings.upsert({
    where: { id: "global" },
    create: { id: "global", planPriceCents: initialPlanPriceCents() },
    update: {},
  });
  return settings.planPriceCents;
}
