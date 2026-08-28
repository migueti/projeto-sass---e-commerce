import { describe, expect, it, vi } from "vitest";

import { createTransaction } from "@/lib/application/financial/create-transaction";
import { Money } from "@/lib/domain/financial/money";
import { Transaction } from "@/lib/domain/financial/transaction";

describe("Financial transaction domain", () => {
  it("keeps money as integer cents and normalizes description", async () => {
    const save = vi.fn();

    const transaction = await createTransaction(
      {
        userId: "user-1",
        accountId: "account-1",
        type: "EXPENSE",
        description: "  Mercado  ",
        cents: 12345,
        occurredAt: new Date("2026-08-28T12:00:00.000Z"),
      },
      { save },
    );

    expect(transaction.cents).toBe(12345);
    expect(transaction.props.description).toBe("Mercado");
    expect(save).toHaveBeenCalledWith(transaction);
  });

  it("rejects invalid monetary values", () => {
    expect(() => Money.fromCents(10.5)).toThrow("MONEY_INVALID");
    expect(() => Money.fromCents(-1)).toThrow("MONEY_INVALID");
  });

  it("rejects transactions without a description", () => {
    expect(() =>
      Transaction.create({
        userId: "user-1",
        accountId: "account-1",
        type: "INCOME",
        description: "   ",
        amount: Money.fromCents(100),
        occurredAt: new Date(),
      }),
    ).toThrow("TRANSACTION_DESCRIPTION_REQUIRED");
  });
});