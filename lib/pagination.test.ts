import { describe, expect, it } from "vitest";

import { MAX_TRANSACTION_PAGE, parsePage } from "@/lib/pagination";

describe("parsePage", () => {
  it("normalizes invalid values and caps large offsets", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
    expect(parsePage("not-a-number")).toBe(1);
    expect(parsePage(String(MAX_TRANSACTION_PAGE + 1))).toBe(MAX_TRANSACTION_PAGE);
  });
});