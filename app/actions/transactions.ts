"use server";

import { z } from "zod";

import { createTransaction as createTransactionUseCase } from "@/lib/application/financial/create-transaction";
import { requirePaidUser } from "@/lib/auth";
import { createPrismaTransactionRepository } from "@/lib/infrastructure/prisma-transaction-repository";
import { categoryForImportedTransaction } from "@/lib/import-categories";
import { prisma } from "@/lib/prisma";
import { withTransactionRetry } from "@/lib/recurrence";
import { revalidateFinancialPaths, revalidatePaths } from "@/lib/revalidation";
import { accountSchema, parseBrazilianCents, parseLocalDate, transactionSchema } from "@/lib/validation";

export type AccountActionState = { message: string };

const importedTransactionSchema = z.object({
  date: z.string(),
  description: z.string().trim().min(2).max(120),
  cents: z.number().int().positive().max(2_147_483_647),
  type: z.enum(["INCOME", "EXPENSE"]),
});

const importedTransactionsSchema = z.array(importedTransactionSchema).min(1).max(500);

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

  const account = await prisma.financialAccount.findFirst({ where: { id: result.data.accountId, userId: user.id } });
  if (!account) throw new Error("Conta não encontrada.");
  if (result.data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: result.data.categoryId, userId: user.id } });
    if (!category) throw new Error("Categoria não encontrada.");
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

  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId: user.id },
    select: { id: true },
  });
  if (!account) throw new Error("Conta não encontrada.");

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

export async function deleteAllTransactions() {
  const user = await requirePaidUser();

  const deletedCount = await withTransactionRetry(() => prisma.$transaction(async (transaction) => {
    const transactions = await transaction.transaction.findMany({
      where: { userId: user.id },
      select: { cents: true, goalId: true },
    });
    const contributionsByGoal = new Map<string, number>();
    for (const current of transactions) {
      if (current.goalId)
        contributionsByGoal.set(current.goalId, (contributionsByGoal.get(current.goalId) ?? 0) + current.cents);
    }

    for (const [goalId, cents] of contributionsByGoal) {
      const goal = await transaction.financialGoal.findFirst({
        where: { id: goalId, userId: user.id },
        select: { savedCents: true, status: true },
      });
      if (!goal || goal.savedCents < cents) throw new Error("GOAL_CONTRIBUTION_INVALID");
      const updated = await transaction.financialGoal.updateMany({
        where: { id: goalId, userId: user.id, savedCents: goal.savedCents },
        data: {
          savedCents: { decrement: cents },
          status: goal.status === "COMPLETED" ? "ACTIVE" : goal.status,
        },
      });
      if (updated.count !== 1) throw new Error("GOAL_CONTRIBUTION_CONFLICT");
    }

    const deleted = await transaction.transaction.deleteMany({ where: { userId: user.id } });
    return deleted.count;
  }));
  revalidatePaths("/", "/contas", "/lancamentos", "/metas");
  return deletedCount;
}

export async function deleteTransaction(id: string) {
  const user = await requirePaidUser();
  const transactionId = normalizeTransactionId(id);

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: user.id },
    select: { goalId: true },
  });
  if (!transaction) throw new Error("Lançamento não encontrado.");
  if (transaction.goalId) throw new Error("Aportes de metas devem ser excluídos pela tela de metas.");

  const result = await prisma.transaction.deleteMany({ where: { id: transactionId, userId: user.id } });
  if (result.count !== 1) throw new Error("Lançamento não encontrado.");

  revalidatePaths("/", "/contas", "/lancamentos");
}

export async function updateTransaction(id: string, formData: FormData) {
  const user = await requirePaidUser();
  const transactionId = normalizeTransactionId(id);
  const current = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: user.id },
    select: { goalId: true },
  });
  if (!current) throw new Error("Lançamento não encontrado.");
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
