import { prisma } from "@/lib/prisma";
import { summarizeDashboard } from "@/lib/dashboard-summary";

export type DashboardPeriod = "month" | "30days" | "year";

export type DashboardFilters = {
  period: DashboardPeriod;
  accountId?: string;
  categoryId?: string;
};

export function getDashboardDateRange(
  period: DashboardPeriod,
  referenceDate = new Date(),
) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);

  if (period === "30days") start.setDate(start.getDate() - 29);
  else if (period === "year") start.setMonth(0, 1);
  else start.setDate(1);

  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function getDashboard(userId: string, filters: DashboardFilters) {
  const { start, end } = getDashboardDateRange(filters.period);
  const scopedWhere = {
    userId,
    occurredAt: { gte: start, lte: end },
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };
  const historicalWhere = {
    userId,
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
  };

  const [accounts, periodTransactions, historicalTransactions, goals, nextRecurrence] = await prisma.$transaction([
    prisma.financialAccount.findMany({ where: { userId, ...(filters.accountId ? { id: filters.accountId } : {}) }, select: { initialCents: true } }),
    prisma.transaction.findMany({
      where: scopedWhere,
      include: { account: { select: { id: true, name: true } }, category: { select: { id: true, name: true, color: true } } },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.transaction.findMany({ where: historicalWhere, select: { type: true, cents: true } }),
    prisma.financialGoal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: [{ deadline: "asc" }, { createdAt: "desc" }] }),
    prisma.recurringTransaction.findFirst({
      where: { userId, active: true, ...(filters.accountId ? { accountId: filters.accountId } : {}), ...(filters.categoryId ? { categoryId: filters.categoryId } : {}) },
      include: { account: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
      orderBy: { nextOccurrence: "asc" },
    }),
  ]);

  const summary = summarizeDashboard({
    accounts,
    periodTransactions,
    historicalTransactions,
    goals,
    nextRecurrence,
  });

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    ...summary,
  };
}

export function parseDashboardFilters(searchParams: URLSearchParams): DashboardFilters {
  const period = searchParams.get("period") ?? "month";
  if (period !== "month" && period !== "30days" && period !== "year") throw new Error("INVALID_PERIOD");
  return { period, accountId: searchParams.get("accountId") || undefined, categoryId: searchParams.get("categoryId") || undefined };
}
