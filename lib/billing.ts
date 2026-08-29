import { prisma } from "@/lib/prisma";

const DEFAULT_PLAN_PRICE_CENTS = 2990;
const MAX_PLAN_PRICE_CENTS = 2_147_483_647;

function parsePlanPriceInput(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const cents =
    BigInt(match[1]) * BigInt(100) +
    BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  return cents > BigInt(0) && cents <= BigInt(MAX_PLAN_PRICE_CENTS) ? Number(cents) : null;
}

export function initialPlanPriceCents(value = process.env.NUVEM_PLAN_PRICE) {
  return parsePlanPriceInput(value) ?? DEFAULT_PLAN_PRICE_CENTS;
}

export async function getPlanPriceCents() {
  const settings = await prisma.appSettings.upsert({
    where: { id: "global" },
    create: { id: "global", planPriceCents: initialPlanPriceCents() },
    update: {},
  });
  return settings.planPriceCents;
}
