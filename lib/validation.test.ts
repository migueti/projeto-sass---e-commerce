import { describe, expect, it } from "vitest";

import {
  accountSchema,
  passwordSchema,
  parseLocalDate,
  parseBrazilianCents,
  transactionSchema,
} from "@/lib/validation";

describe("parseLocalDate", () => {
  it("keeps civil dates stable as UTC dates", () => {
    const parsed = parseLocalDate("2026-03-01");

    expect(parsed?.toISOString()).toBe("2026-03-01T12:00:00.000Z");
  });

  it("rejects impossible calendar dates", () => {
    expect(parseLocalDate("2026-02-30")).toBeNull();
  });
});

describe("parseBrazilianCents", () => {
  it("converts Brazilian currency formats into cents", () => {
    expect(parseBrazilianCents("R$ 1.234,56")).toBe(123456);
    expect(parseBrazilianCents("r$ 1.234,56")).toBe(123456);
    expect(parseBrazilianCents("25")).toBe(2500);
  });

  it("rejects empty, non-numeric, zero, and negative amounts", () => {
    expect(parseBrazilianCents("")).toBeNull();
    expect(parseBrazilianCents("abc")).toBeNull();
    expect(parseBrazilianCents("1e3")).toBeNull();
    expect(parseBrazilianCents("10,00,5")).toBeNull();
    expect(parseBrazilianCents("10,005")).toBeNull();
    expect(parseBrazilianCents("1.23,45")).toBeNull();
    expect(parseBrazilianCents("0")).toBeNull();
    expect(parseBrazilianCents("-12,50")).toBeNull();
  });

  it("allows zero only when explicitly requested", () => {
    expect(parseBrazilianCents("0")).toBeNull();
    expect(parseBrazilianCents("0", { allowZero: true })).toBe(0);
  });

  it("rejects amounts outside the database integer range", () => {
    expect(parseBrazilianCents("21.474.836,47")).toBe(2_147_483_647);
    expect(parseBrazilianCents("21.474.836,48")).toBeNull();
  });

  it("keeps large amounts exact while converting to integer cents", () => {
    expect(parseBrazilianCents("20.000.000,01")).toBe(2_000_000_001);
  });

  it("rejects excessively long inputs before numeric conversion", () => {
    expect(parseBrazilianCents("1".repeat(33))).toBeNull();
  });
});

describe("form schemas", () => {
  it("limits passwords to bcrypt's 72-byte input", () => {
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse(`${"a".repeat(72)}b`).success).toBe(false);
      expect(passwordSchema.safeParse("a".repeat(10_000)).success).toBe(false);
    expect(passwordSchema.safeParse("á".repeat(36)).success).toBe(true);
    expect(passwordSchema.safeParse("á".repeat(37)).success).toBe(false);
  });

  it("normalizes valid account names and rejects incomplete transactions", () => {
    expect(
      accountSchema.parse({
        name: "  Conta principal  ",
        type: "checking",
        initialAmount: "",
      }),
    ).toMatchObject({ name: "Conta principal" });

    expect(
      accountSchema.safeParse({
        name: "a".repeat(81),
        type: "checking",
        initialAmount: "0",
      }).success,
    ).toBe(false);

    expect(
      accountSchema.safeParse({
        name: "Cartão",
        type: "credit",
        initialAmount: "",
      }).success,
    ).toBe(false);

    expect(
      transactionSchema.safeParse({
        description: "Compra",
        amount: "50,00",
        type: "EXPENSE",
        accountId: "",
        occurredAt: "2026-03-01",
      }).success,
    ).toBe(false);

    expect(
      transactionSchema.safeParse({
        description: "Compra",
        amount: "50,00",
        type: "EXPENSE",
        accountId: "account-1",
        occurredAt: "2026-02-30",
      }).success,
    ).toBe(false);
  });
});
