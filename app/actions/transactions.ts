"use server";

import { createTransaction as createTransactionUseCase } from "@/lib/application/financial/create-transaction";
import { requirePaidUser } from "@/lib/auth";
import { createPrismaTransactionRepository } from "@/lib/infrastructure/prisma-transaction-repository";
import { prisma } from "@/lib/prisma";
import { revalidateFinancialPaths, revalidatePaths } from "@/lib/revalidation";
import { accountSchema, parseBrazilianCents, parseLocalDate, transactionSchema } from "@/lib/validation";

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
