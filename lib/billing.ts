import { prisma } from "@/lib/prisma";

const DEFAULT_PLAN_PRICE_CENTS = 2990;

function initialPlanPriceCents() {
  const configured = Number(process.env.NUVEM_PLAN_PRICE ?? "");
  return Number.isFinite(configured) && configured > 0
    ? Math.round(configured * 100)
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
