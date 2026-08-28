import { prisma } from "@/lib/prisma";

const DEFAULT_PLAN_PRICE_CENTS = 2990;
const MAX_PLAN_PRICE_CENTS = 2_147_483_647;

export function initialPlanPriceCents(value = process.env.NUVEM_PLAN_PRICE) {
  const configured = Number(value ?? "");
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_PLAN_PRICE_CENTS;

  const cents = Math.round(configured * 100);
  return cents > 0 && cents <= MAX_PLAN_PRICE_CENTS
    ? cents
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
