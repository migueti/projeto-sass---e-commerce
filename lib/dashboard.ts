import { prisma } from "@/lib/prisma";
import { summarizeDashboard } from "@/lib/dashboard-summary";

export type DashboardPeriod = "month" | "30days" | "year";

export type DashboardFilters = {
  period: DashboardPeriod;
  accountId?: string;
  categoryId?: string;
};

export const MAX_DASHBOARD_ROWS = 10_000;
export const DASHBOARD_TIME_ZONE = "America/Sao_Paulo";

export function exceedsDashboardLimit(rowCount: number) {
  return rowCount > MAX_DASHBOARD_ROWS;
}

type HistoricalTransactionGroup = {
  type: "INCOME" | "EXPENSE";
  _sum?: { cents?: number | null } | null;
};

export function normalizeHistoricalTransactions(
  groups: HistoricalTransactionGroup[],
) {
  return groups.map(({ type, _sum }) => ({ type, cents: _sum?.cents ?? 0 }));
}

export function getDashboardDateRange(
  period: DashboardPeriod,
  referenceDate = new Date(),
) {
  const localDate = getDatePartsInTimeZone(referenceDate, DASHBOARD_TIME_ZONE);
  const endParts = { ...localDate, hour: 23, minute: 59, second: 59, millisecond: 999 };
  const startParts = { ...localDate, hour: 0, minute: 0, second: 0, millisecond: 0 };

  if (period === "30days") shiftCalendarDate(startParts, -29);
  else if (period === "year") {
    startParts.month = 1;
    startParts.day = 1;
  } else startParts.day = 1;

  const start = zonedPartsToDate(startParts, DASHBOARD_TIME_ZONE);
  const end = zonedPartsToDate(endParts, DASHBOARD_TIME_ZONE);
  return { start, end };
}

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

export function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.flatMap(({ type, value }) => {
      if (!["year", "month", "day", "hour", "minute", "second"].includes(type)) {
        return [];
      }

      return [[type, Number.parseInt(value, 10)]];
    }),
  );

  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
    millisecond: date.getUTCMilliseconds(),
  };
}

function shiftCalendarDate(parts: DateParts, days: number) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  parts.year = shifted.getUTCFullYear();
  parts.month = shifted.getUTCMonth() + 1;
  parts.day = shifted.getUTCDate();
}

function zonedPartsToDate(parts: DateParts, timeZone: string) {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
  const guess = new Date(desired);
  const actual = getDatePartsInTimeZone(guess, timeZone);
  const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, actual.millisecond);
  return new Date(desired + (desired - actualAsUtc));
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
    occurredAt: { lt: start },
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };

  const [accounts, periodTransactions, historicalTransactions, goals, nextRecurrence, allCategories] = await prisma.$transaction([
    prisma.financialAccount.findMany({ where: { userId, ...(filters.accountId ? { id: filters.accountId } : {}) }, select: { initialCents: true, type: true, pluggyAccountId: true } }),
    prisma.transaction.findMany({
      where: scopedWhere,
      include: { account: { select: { id: true, name: true, type: true, pluggyAccountId: true } }, category: { select: { id: true, name: true, color: true } } },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: MAX_DASHBOARD_ROWS + 1,
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: historicalWhere,
      orderBy: { type: "asc" },
      _sum: { cents: true },
    }),
    prisma.financialGoal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: [{ deadline: "asc" }, { createdAt: "desc" }] }),
    prisma.recurringTransaction.findFirst({
      where: { userId, active: true, ...(filters.accountId ? { accountId: filters.accountId } : {}), ...(filters.categoryId ? { categoryId: filters.categoryId } : {}) },
      include: { account: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
      orderBy: { nextOccurrence: "asc" },
    }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
  ]);

  if (exceedsDashboardLimit(periodTransactions.length))
    throw new Error("DASHBOARD_TOO_LARGE");

  const summary = summarizeDashboard({
    accounts: filters.categoryId ? [] : accounts,
    periodTransactions,
    historicalTransactions: normalizeHistoricalTransactions(historicalTransactions),
    goals,
    nextRecurrence,
    allCategories: filters.categoryId ? [] : allCategories,
  });

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    ...summary,
  };
}

function normalizeOptionalFilter(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseDashboardFilters(searchParams: URLSearchParams): DashboardFilters {
  const period = normalizeOptionalFilter(searchParams.get("period")) ?? "month";
  if (period !== "month" && period !== "30days" && period !== "year") throw new Error("INVALID_PERIOD");

  return {
    period,
    accountId: normalizeOptionalFilter(searchParams.get("accountId")),
    categoryId: normalizeOptionalFilter(searchParams.get("categoryId")),
  };
}
