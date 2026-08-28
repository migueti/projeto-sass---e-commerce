import { describe, expect, it } from "vitest";

import {
  buildExportWhere,
  exceedsExportLimit,
  MAX_EXPORT_ROWS,
  sanitizeSpreadsheetText,
} from "@/app/api/reports/export/route";

const start = new Date("2026-01-01T03:00:00.000Z");
const end = new Date("2026-02-01T02:59:59.999Z");

describe("export row limit", () => {
  it("accepts the maximum and rejects larger exports", () => {
    expect(exceedsExportLimit(MAX_EXPORT_ROWS)).toBe(false);
    expect(exceedsExportLimit(MAX_EXPORT_ROWS + 1)).toBe(true);
  });

  it("prefixes formula-like values before writing spreadsheet cells", () => {
    for (const value of ["=SUM(A1:A2)", "+cmd", "-cmd", "@cmd", "  =cmd"]) {
      expect(sanitizeSpreadsheetText(value)).toBe(`'${value}`);
    }
    expect(sanitizeSpreadsheetText("Compra comum")).toBe("Compra comum");
  });

  it("always scopes exports to the authenticated user", () => {
    expect(buildExportWhere("user-1", { period: "month" }, start, end)).toEqual({
      userId: "user-1",
      occurredAt: { gte: start, lte: end },
    });
    expect(buildExportWhere("user-1", { period: "month", accountId: "account-1", categoryId: "category-1" }, start, end)).toEqual({
      userId: "user-1",
      accountId: "account-1",
      categoryId: "category-1",
      occurredAt: { gte: start, lte: end },
    });
  });
});