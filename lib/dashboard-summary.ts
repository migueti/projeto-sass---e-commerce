export type DashboardTransaction = {
  type: "INCOME" | "EXPENSE";
  cents: number;
  occurredAt: Date;
  category: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  account?: {
    type?: string | null;
    pluggyAccountId?: string | null;
  };
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
  allCategories,
}: {
  accounts: Array<{ initialCents: number; type?: string | null; pluggyAccountId?: string | null }>;
  periodTransactions: TTransaction[];
  historicalTransactions: Array<Pick<DashboardTransaction, "type" | "cents">>;
  goals: TGoal[];
  nextRecurrence: TRecurrence | null;
  allCategories: Array<{ id: string; name: string; color: string | null }>;
}) {
  const historicalCents = historicalTransactions.reduce(
    (sum, item) => sum + (item.type === "INCOME" ? item.cents : -item.cents),
    0,
  );
  const cashAccounts = accounts.filter((account) => account.type !== "credit");
  const initialCents = cashAccounts.reduce(
    (sum, account) => sum + account.initialCents,
    0,
  );
  const categoryTotals = new Map<
    string,
    { name: string; color: string | null; cents: number }
  >();
  
  // Initialize categoryTotals with all user categories
  for (const category of allCategories) {
    categoryTotals.set(category.id, {
      name: category.name,
      color: category.color,
      cents: 0,
    });
  }
  
  const monthlyFlow = new Map<
    string,
    { month: string; incomeCents: number; expenseCents: number }
  >();
  let incomeCents = 0;
  let expenseCents = 0;

  for (const transaction of periodTransactions) {
    const month = transaction.occurredAt.toISOString().slice(0, 7);
    const current = monthlyFlow.get(month) ?? {
      month,
      incomeCents: 0,
      expenseCents: 0,
    };
    if (transaction.type === "INCOME") {
      incomeCents += transaction.cents;
      current.incomeCents += transaction.cents;
    } else {
      expenseCents += transaction.cents;
      current.expenseCents += transaction.cents;
      const key = transaction.category?.id ?? "uncategorized";
      let category = categoryTotals.get(key);
      if (!category) {
        // Only create a new category entry if it's uncategorized
        category = {
          name: transaction.category?.name ?? "Sem categoria",
          color: transaction.category?.color ?? "#b8a6ce",
          cents: 0,
        };
        categoryTotals.set(key, category);
      }
      category.cents += transaction.cents;
    }
    monthlyFlow.set(month, current);
  }

  const hasConnectedAccount = cashAccounts.some((account) => account.pluggyAccountId);
  const balanceCents = hasConnectedAccount
    ? initialCents
    : initialCents + historicalCents + incomeCents - expenseCents;

  return {
    balanceCents,
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
