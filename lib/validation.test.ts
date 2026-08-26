import { describe, expect, it } from "vitest";

import {
  accountSchema,
  parseBrazilianCents,
  transactionSchema,
} from "@/lib/validation";

describe("parseBrazilianCents", () => {
  it("converts Brazilian currency formats into cents", () => {
    expect(parseBrazilianCents("R$ 1.234,56")).toBe(123456);
    expect(parseBrazilianCents("10,005")).toBe(1001);
    expect(parseBrazilianCents("25")).toBe(2500);
  });

  it("rejects empty, non-numeric, zero, and negative amounts", () => {
    expect(parseBrazilianCents("")).toBeNull();
    expect(parseBrazilianCents("abc")).toBeNull();
    expect(parseBrazilianCents("0")).toBeNull();
    expect(parseBrazilianCents("-12,50")).toBeNull();
  });
});

describe("form schemas", () => {
  it("normalizes valid account names and rejects incomplete transactions", () => {
    expect(
      accountSchema.parse({
        name: "  Conta principal  ",
        type: "checking",
        initialAmount: "",
      }),
    ).toMatchObject({ name: "Conta principal" });
    expect(
      transactionSchema.safeParse({
        description: "Compra",
        amount: "50,00",
        type: "EXPENSE",
        accountId: "",
        occurredAt: "2026-03-01",
      }).success,
    ).toBe(false);
  });
});
