import { describe, expect, it } from "vitest";

import { initialPlanPriceCents } from "@/lib/billing";

describe("initialPlanPriceCents", () => {
  it("converts a valid BRL configuration to integer cents", () => {
    expect(initialPlanPriceCents("29.90")).toBe(2990);
    expect(initialPlanPriceCents("  49.99  ")).toBe(4999);
  });

  it("falls back for missing, invalid, zero, or negative values", () => {
    expect(initialPlanPriceCents()).toBe(2990);
    expect(initialPlanPriceCents("not-a-price")).toBe(2990);
    expect(initialPlanPriceCents("0")).toBe(2990);
    expect(initialPlanPriceCents("-10")).toBe(2990);
    expect(initialPlanPriceCents("1e3")).toBe(2990);
  });

  it("falls back when the value cannot fit in a Prisma Int", () => {
    expect(initialPlanPriceCents("21474836.48")).toBe(2990);
  });

  it("keeps large configured prices exact", () => {
    expect(initialPlanPriceCents("20000000.01")).toBe(2_000_000_001);
  });
});
