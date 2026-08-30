"use server";

import { createTransaction as createTransactionUseCase } from "@/lib/application/financial/create-transaction";
import { requirePaidUser } from "@/lib/auth";
import { requireOwnedAccount, requireOwnedCategory, requireOwnedTransaction } from "@/lib/ownership";
import { createPrismaTransactionRepository } from "@/lib/infrastructure/prisma-transaction-repository";
import { categoryForImportedTransaction } from "@/lib/import-categories";
import { prisma } from "@/lib/prisma";
import { withTransactionRetry } from "@/lib/recurrence";
import { revalidateFinancialPaths, revalidatePaths } from "@/lib/revalidation";
import { accountSchema, parseBrazilianCents, parseLocalDate, transactionSchema, importedTransactionSchema, importedTransactionsSchema } from "@/lib/validation";

export type AccountActionState = { message: string };

function normalizeTransactionId(id: string) {
  if (typeof id !== "string" || !id.trim()) throw new Error("Lançamento inválido.");
  return id.trim();
}

export async function createAccount(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requirePaidUser();
  const result = accountSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { message: result.error.issues[0]?.message ?? "Confira os dados." };

  const initialInput = result.data.initialAmount?.trim();
  const initialCents = initialInput
    ? parseBrazilianCents(initialInput, { allowZero: true })
    : 0;
  if (initialCents === null) return { message: "Informe um saldo inicial válido." };
  await prisma.financialAccount.create({ data: { name: result.data.name, type: result.data.type, initialCents, userId: user.id } });
  revalidateFinancialPaths();
  return { message: "Conta adicionada com sucesso." };
}

export async function createTransaction(formData: FormData) {
  const user = await requirePaidUser();
  const result = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Confira os dados.");

  const cents = parseBrazilianCents(result.data.amount);
  if (!cents) throw new Error("Informe um valor válido maior que zero.");
  const occurredAt = parseLocalDate(result.data.occurredAt);
  if (!occurredAt) throw new Error("Informe uma data válida.");

  const account = await requireOwnedAccount(result.data.accountId, user.id);
  if (result.data.categoryId) {
    await requireOwnedCategory(result.data.categoryId, user.id);
  }

  await createTransactionUseCase(
    {
      userId: user.id,
      accountId: account.id,
      categoryId: result.data.categoryId || null,
      description: result.data.description,
      type: result.data.type,
      cents,
      occurredAt,
      notes: result.data.notes || null,
    },
    createPrismaTransactionRepository(prisma),
  );
  revalidatePaths("/", "/contas", "/lancamentos");
}

export async function importTransactions(
  rows: unknown,
  accountId: string,
) {
  const user = await requirePaidUser();
  const parsedRows = importedTransactionsSchema.safeParse(rows);
  if (!parsedRows.success) throw new Error("Os dados do extrato são inválidos.");

  const transactions = parsedRows.data.map((row) => {
    const occurredAt = parseLocalDate(row.date);
    if (!occurredAt) throw new Error("O extrato contém uma data inválida.");
    return {
      userId: user.id,
      description: row.description,
      type: row.type,
      cents: row.cents,
      occurredAt,
      category: categoryForImportedTransaction(row),
    };
  });

  const account = await requireOwnedAccount(accountId, user.id);

  const result = await prisma.$transaction(async (transactionClient) => {
    const categoryIds = new Map<string, string>();
    for (const importedTransaction of transactions) {
      const category = importedTransaction.category;
      if (categoryIds.has(category.name)) continue;
      const savedCategory = await transactionClient.category.upsert({
        where: { userId_name: { userId: user.id, name: category.name } },
        create: { userId: user.id, name: category.name, color: category.color },
        update: {},
        select: { id: true },
      });
      categoryIds.set(category.name, savedCategory.id);
    }

    return transactionClient.transaction.createMany({
      data: transactions.map((importedTransaction) => ({
        userId: importedTransaction.userId,
        description: importedTransaction.description,
        type: importedTransaction.type,
        cents: importedTransaction.cents,
        occurredAt: importedTransaction.occurredAt,
        accountId: account.id,
        categoryId: categoryIds.get(importedTransaction.category.name) ?? null,
      })),
    });
  });
  revalidatePaths("/", "/contas", "/lancamentos");
  return result.count;
}

type GoalContributionClient = {
  financialGoal: {
    findFirst: typeof prisma.financialGoal.findFirst;
    updateMany: typeof prisma.financialGoal.updateMany;
  };
};

async function reconcileGoalContributions(
  transactionClient: GoalContributionClient,
  userId: string,
  transactions: Array<{ cents: number; goalId: string | null }>,
) {
  const contributionsByGoal = new Map<string, number>();
  for (const current of transactions) {
    if (!current.goalId) continue;
    contributionsByGoal.set(current.goalId, (contributionsByGoal.get(current.goalId) ?? 0) + current.cents);
  }

  for (const [goalId, cents] of contributionsByGoal) {
    const goal = await transactionClient.financialGoal.findFirst({
      where: { id: goalId, userId },
      select: { savedCents: true, status: true },
    });
    if (!goal || goal.savedCents < cents) throw new Error("GOAL_CONTRIBUTION_INVALID");

    const updated = await transactionClient.financialGoal.updateMany({
      where: { id: goalId, userId, savedCents: goal.savedCents },
      data: {
        savedCents: { decrement: cents },
        status: goal.status === "COMPLETED" ? "ACTIVE" : goal.status,
      },
    });
    if (updated.count !== 1) throw new Error("GOAL_CONTRIBUTION_CONFLICT");
  }
}

export async function deleteAllTransactions() {
  const user = await requirePaidUser();

  const deletedCount = await withTransactionRetry(() => prisma.$transaction(async (transaction) => {
    const transactions = await transaction.transaction.findMany({
      where: { userId: user.id },
      select: { cents: true, goalId: true },
    });

    await reconcileGoalContributions(transaction, user.id, transactions);
    const deleted = await transaction.transaction.deleteMany({ where: { userId: user.id } });
    return deleted.count;
  }));
  revalidatePaths("/", "/contas", "/lancamentos", "/metas");
  return deletedCount;
}

export async function deleteAccount(id: string) {
  const user = await requirePaidUser();
  const accountId = normalizeTransactionId(id);

  await withTransactionRetry(() => prisma.$transaction(async (transaction) => {
    // Note: In transaction context, we use prisma directly since requireOwnedAccount uses top-level prisma
    const account = await transaction.financialAccount.findFirst({
      where: { id: accountId, userId: user.id },
      select: { id: true },
    });
    if (!account) throw new Error("Conta não encontrada.");

    const transactions = await transaction.transaction.findMany({
      where: { accountId: account.id, userId: user.id },
      select: { cents: true, goalId: true },
    });

    await reconcileGoalContributions(transaction, user.id, transactions);
    await transaction.recurringTransaction.deleteMany({ where: { accountId: account.id, userId: user.id } });
    await transaction.transaction.deleteMany({ where: { accountId: account.id, userId: user.id } });

    const deleted = await transaction.financialAccount.deleteMany({ where: { id: account.id, userId: user.id } });
    if (deleted.count !== 1) throw new Error("Conta não encontrada.");
  }));

  revalidateFinancialPaths();
}

export async function deleteTransaction(id: string) {
  const user = await requirePaidUser();
  const transactionId = normalizeTransactionId(id);

  const txn = await requireOwnedTransaction(transactionId, user.id);
  if (txn.goalId) throw new Error("Aportes de metas devem ser excluídos pela tela de metas.");

  const result = await prisma.transaction.deleteMany({ where: { id: transactionId, userId: user.id } });
  if (result.count !== 1) throw new Error("Lançamento não encontrado.");

  revalidatePaths("/", "/contas", "/lancamentos");
}

export async function updateTransaction(id: string, formData: FormData) {
  const user = await requirePaidUser();
  const transactionId = normalizeTransactionId(id);
  const current = await requireOwnedTransaction(transactionId, user.id);
  if (current.goalId) throw new Error("Aportes de metas não podem ser editados.");

  const result = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Confira os dados.");

  const cents = parseBrazilianCents(result.data.amount);
  if (!cents) throw new Error("Informe um valor válido maior que zero.");
  const occurredAt = parseLocalDate(result.data.occurredAt);
  if (!occurredAt) throw new Error("Informe uma data válida.");
  const account = await prisma.financialAccount.findFirst({ where: { id: result.data.accountId, userId: user.id } });
  if (!account) throw new Error("Conta não encontrada.");
  if (result.data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: result.data.categoryId, userId: user.id } });
    if (!category) throw new Error("Categoria não encontrada.");
  }

  const updated = await prisma.transaction.updateMany({
    where: { id: transactionId, userId: user.id },
    data: { description: result.data.description, cents, type: result.data.type, accountId: account.id, categoryId: result.data.categoryId || null, occurredAt, notes: result.data.notes || null },
  });
  if (updated.count !== 1) throw new Error("Lançamento não encontrado.");
  revalidatePaths("/", "/lancamentos", "/contas");
}
