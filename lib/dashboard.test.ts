import { describe, expect, it } from "vitest";

import {
  getDashboardDateRange,
  getDatePartsInTimeZone,
  exceedsDashboardLimit,
  MAX_DASHBOARD_ROWS,
  normalizeHistoricalTransactions,
  parseDashboardFilters,
} from "@/lib/dashboard";
import { summarizeDashboard } from "@/lib/dashboard-summary";

const date = (value: string) => new Date(`${value}T12:00:00.000Z`);

describe("dashboard filters and periods", () => {
  it("detects dashboard periods that exceed the row limit", () => {
    expect(exceedsDashboardLimit(MAX_DASHBOARD_ROWS)).toBe(false);
    expect(exceedsDashboardLimit(MAX_DASHBOARD_ROWS + 1)).toBe(true);
  });

  it("normalizes database totals grouped by transaction type", () => {
    expect(
      normalizeHistoricalTransactions([
        { type: "INCOME", _sum: { cents: 25_000 } },
        { type: "EXPENSE", _sum: { cents: null } },
      ]),
    ).toEqual([
      { type: "INCOME", cents: 25_000 },
      { type: "EXPENSE", cents: 0 },
    ]);
  });

  it("uses the month by default and preserves optional filters", () => {
    expect(parseDashboardFilters(new URLSearchParams())).toEqual({
      period: "month",
    });
    expect(
      parseDashboardFilters(
        new URLSearchParams("period=30days&accountId=account-1&categoryId=food"),
      ),
    ).toEqual({ period: "30days", accountId: "account-1", categoryId: "food" });
    expect(
      parseDashboardFilters(
        new URLSearchParams("period=month&accountId=%20%20&categoryId=%20food%20"),
      ),
    ).toEqual({ period: "month", accountId: undefined, categoryId: "food" });
  });

  it("rejects unsupported periods", () => {
    expect(() =>
      parseDashboardFilters(new URLSearchParams("period=week")),
    ).toThrow("INVALID_PERIOD");
  });

  it("creates deterministic date ranges from a reference date", () => {
    const referenceDate = new Date("2026-03-15T16:45:00.000Z");

    expect(getDashboardDateRange("month", referenceDate)).toEqual({
      start: new Date("2026-03-01T03:00:00.000Z"),
      end: new Date("2026-03-16T02:59:59.999Z"),
    });
    expect(getDashboardDateRange("30days", referenceDate).start).toEqual(
      new Date("2026-02-14T03:00:00.000Z"),
    );
    expect(getDashboardDateRange("year", referenceDate).start).toEqual(
      new Date("2026-01-01T03:00:00.000Z"),
    );
  });

  it("keeps only numeric date parts from Intl formatting", () => {
    const parts = getDatePartsInTimeZone(new Date("2026-03-15T16:45:00.000Z"), "America/Sao_Paulo");

    expect(parts).toMatchObject({
      year: 2026,
      month: 3,
      day: 15,
      hour: 13,
      minute: 45,
      second: 0,
      millisecond: 0,
    });
    expect(Object.keys(parts)).toEqual(["year", "month", "day", "hour", "minute", "second", "millisecond"]);
  });

  it("uses the product timezone at a UTC month boundary", () => {
    const referenceDate = new Date("2026-09-01T00:30:00.000Z");

    expect(getDashboardDateRange("month", referenceDate)).toEqual({
      start: new Date("2026-08-01T03:00:00.000Z"),
      end: new Date("2026-09-01T02:59:59.999Z"),
    });
  });
});

describe("summarizeDashboard", () => {
  it("builds financial totals, sorted breakdowns, transaction previews, goals, and recurrences", () => {
    const summary = summarizeDashboard({
      accounts: [{ initialCents: 10_000 }],
      historicalTransactions: [
        { type: "INCOME", cents: 25_000 },
        { type: "EXPENSE", cents: 7_000 },
        { type: "INCOME", cents: 2_500 },
      ],
      periodTransactions: [
        { id: "t6", type: "INCOME", cents: 1_000, occurredAt: date("2026-03-31"), category: null },
        { id: "t5", type: "EXPENSE", cents: 500, occurredAt: date("2026-03-20"), category: { id: "food", name: "Alimentação", color: "#e78c7d" } },
        { id: "t4", type: "EXPENSE", cents: 250, occurredAt: date("2026-03-10"), category: { id: "transport", name: "Transporte", color: "#9284b5" } },
        { id: "t3", type: "INCOME", cents: 1_500, occurredAt: date("2026-02-28"), category: null },
        { id: "t2", type: "EXPENSE", cents: 200, occurredAt: date("2026-02-14"), category: { id: "food", name: "Alimentação", color: "#e78c7d" } },
        { id: "t1", type: "EXPENSE", cents: 50, occurredAt: date("2026-02-01"), category: null },
      ],
      goals: [
        { id: "goal-1", name: "Reserva", savedCents: 5_000, targetCents: 10_000, deadline: date("2026-12-31") },
        { id: "goal-2", name: "Viagem", savedCents: 12_000, targetCents: 10_000, deadline: null },
      ],
      nextRecurrence: {
        id: "recurrence-1",
        description: "Internet",
        cents: 12000,
        nextOccurrence: date("2026-04-05"),
        endAt: null,
      },
    });

    expect(summary).toMatchObject({
      balanceCents: 32_000,
      incomeCents: 2_500,
      expenseCents: 1_000,
      netCents: 1_500,
      monthlyFlow: [
        { month: "2026-02", incomeCents: 1_500, expenseCents: 250, netCents: 1_250 },
        { month: "2026-03", incomeCents: 1_000, expenseCents: 750, netCents: 250 },
      ],
      categories: [
        { id: "food", cents: 700, percent: 70 },
        { id: "transport", cents: 250, percent: 25 },
        { id: null, name: "Sem categoria", cents: 50, percent: 5 },
      ],
      goals: [
        { id: "goal-1", progressPercent: 50, deadline: "2026-12-31T12:00:00.000Z" },
        { id: "goal-2", progressPercent: 100, deadline: null },
      ],
      nextRecurrence: {
        id: "recurrence-1",
        nextOccurrence: "2026-04-05T12:00:00.000Z",
      },
    });
    expect(summary.transactions).toHaveLength(5);
    expect(summary.transactions.map((item) => item.id)).toEqual([
      "t6",
      "t5",
      "t4",
      "t3",
      "t2",
    ]);
  });

  it("returns no categories when the period has no expenses", () => {
    const summary = summarizeDashboard({
      accounts: [],
      historicalTransactions: [],
      periodTransactions: [
        { id: "income", type: "INCOME", cents: 500, occurredAt: date("2026-03-01"), category: null },
      ],
      goals: [],
      nextRecurrence: null,
    });

    expect(summary.categories).toEqual([]);
    expect(summary.expenseCents).toBe(0);
  });

  it("does not attribute account opening balances to a category", () => {
    const summary = summarizeDashboard({
      accounts: [],
      historicalTransactions: [{ type: "EXPENSE", cents: 1_000 }],
      periodTransactions: [],
      goals: [],
      nextRecurrence: null,
    });

    expect(summary.balanceCents).toBe(-1_000);
  });
});
