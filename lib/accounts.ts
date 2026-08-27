type AccountTransactionGroup = {
  accountId: string;
  type: "INCOME" | "EXPENSE";
  _sum: { cents: number | null };
  _count: { _all: number };
};

export function summarizeAccountTransactions(
  accounts: Array<{ id: string; initialCents: number }>,
  groups: AccountTransactionGroup[],
) {
  const summaries = new Map(
    accounts.map((account) => [
      account.id,
      { balanceCents: account.initialCents, transactionCount: 0 },
    ]),
  );

  for (const group of groups) {
    const summary = summaries.get(group.accountId);
    if (!summary) continue;
    summary.balanceCents += group.type === "INCOME" ? group._sum.cents ?? 0 : -(group._sum.cents ?? 0);
    summary.transactionCount += group._count._all;
  }

  return summaries;
}