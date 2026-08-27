import { describe, expect, it } from "vitest";

import { summarizeAccountTransactions } from "@/lib/accounts";

describe("summarizeAccountTransactions", () => {
  it("combines opening balances and grouped transactions", () => {
    const summaries = summarizeAccountTransactions(
      [{ id: "account-1", initialCents: 10_000 }],
      [
        { accountId: "account-1", type: "INCOME", _sum: { cents: 2_500 }, _count: { _all: 2 } },
        { accountId: "account-1", type: "EXPENSE", _sum: { cents: 1_000 }, _count: { _all: 1 } },
      ],
    );

    expect(summaries.get("account-1")).toEqual({
      balanceCents: 11_500,
      transactionCount: 3,
    });
  });
});