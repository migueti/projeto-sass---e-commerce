export type DashboardTransaction = {
  type: "INCOME" | "EXPENSE";
  cents: number;
  occurredAt: Date;
  category: {
    id: string;
    name: string;
    color: string | null;
  } | null;
};

type DashboardGoal = {
  savedCents: number;
  targetCents: number;
  deadline: Date | null;
};

type DashboardRecurrence = {
  nextOccurrence: Date;
  endAt: Date | null;
};

export function summarizeDashboard<
  TTransaction extends DashboardTransaction,
  TGoal extends DashboardGoal,
  TRecurrence extends DashboardRecurrence,
>({
  accounts,
  periodTransactions,
  historicalTransactions,
  goals,
  nextRecurrence,
}: {
  accounts: Array<{ initialCents: number }>;
  periodTransactions: TTransaction[];
  historicalTransactions: Array<Pick<DashboardTransaction, "type" | "cents">>;
  goals: TGoal[];
  nextRecurrence: TRecurrence | null;
}) {
  const incomeCents = periodTransactions
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.cents, 0);
  const expenseCents = periodTransactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.cents, 0);
  const historicalCents = historicalTransactions.reduce(
    (sum, item) => sum + (item.type === "INCOME" ? item.cents : -item.cents),
    0,
  );
  const initialCents = accounts.reduce(
    (sum, account) => sum + account.initialCents,
    0,
  );
  const categoryTotals = new Map<
    string,
    { name: string; color: string | null; cents: number }
  >();

  for (const transaction of periodTransactions.filter(
    (item) => item.type === "EXPENSE",
  )) {
    const key = transaction.category?.id ?? "uncategorized";
    const current = categoryTotals.get(key) ?? {
      name: transaction.category?.name ?? "Sem categoria",
      color: transaction.category?.color ?? "#b8a6ce",
      cents: 0,
    };
    current.cents += transaction.cents;
    categoryTotals.set(key, current);
  }

  const monthlyFlow = new Map<
    string,
    { month: string; incomeCents: number; expenseCents: number }
  >();
  for (const transaction of periodTransactions) {
    const month = transaction.occurredAt.toISOString().slice(0, 7);
    const current = monthlyFlow.get(month) ?? {
      month,
      incomeCents: 0,
      expenseCents: 0,
    };
    if (transaction.type === "INCOME") current.incomeCents += transaction.cents;
    else current.expenseCents += transaction.cents;
    monthlyFlow.set(month, current);
  }

  return {
    balanceCents: initialCents + historicalCents + incomeCents - expenseCents,
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    monthlyFlow: [...monthlyFlow.values()]
      .sort((first, second) => first.month.localeCompare(second.month))
      .map((item) => ({
        ...item,
        netCents: item.incomeCents - item.expenseCents,
      })),
    categories: [...categoryTotals.entries()]
      .sort(([, first], [, second]) => second.cents - first.cents)
      .map(([id, item]) => ({
        id: id === "uncategorized" ? null : id,
        ...item,
        percent: expenseCents
          ? Math.round((item.cents / expenseCents) * 1000) / 10
          : 0,
      })),
    transactions: periodTransactions
      .slice(0, 5)
      .map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString() })),
    goals: goals.map((goal) => ({
      ...goal,
      deadline: goal.deadline?.toISOString() ?? null,
      progressPercent: goal.targetCents
        ? Math.min(100, Math.round((goal.savedCents / goal.targetCents) * 100))
        : 0,
    })),
    nextRecurrence: nextRecurrence
      ? {
          ...nextRecurrence,
          nextOccurrence: nextRecurrence.nextOccurrence.toISOString(),
          endAt: nextRecurrence.endAt?.toISOString() ?? null,
        }
      : null,
  };
}
