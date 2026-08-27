import { describe, expect, it } from "vitest";

import {
  exceedsExportLimit,
  MAX_EXPORT_ROWS,
  sanitizeSpreadsheetText,
} from "@/app/api/reports/export/route";

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
});