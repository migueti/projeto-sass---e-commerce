import { describe, expect, it } from "vitest";

import {
  exceedsExportLimit,
  MAX_EXPORT_ROWS,
} from "@/app/api/reports/export/route";

describe("export row limit", () => {
  it("accepts the maximum and rejects larger exports", () => {
    expect(exceedsExportLimit(MAX_EXPORT_ROWS)).toBe(false);
    expect(exceedsExportLimit(MAX_EXPORT_ROWS + 1)).toBe(true);
  });
});