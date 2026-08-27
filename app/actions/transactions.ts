"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountSchema, parseBrazilianCents, parseLocalDate, transactionSchema } from "@/lib/validation";

export async function createAccount(formData: FormData) {
  const user = await requireUser();
  const result = accountSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Confira os dados.");

  const initialInput = result.data.initialAmount?.trim();
  const initialCents = initialInput
    ? parseBrazilianCents(initialInput, { allowZero: true })
    : 0;
  if (initialCents === null) throw new Error("Informe um saldo inicial válido.");
  await prisma.financialAccount.create({ data: { name: result.data.name, type: result.data.type, initialCents, userId: user.id } });
  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/lancamentos");
}

export async function createTransaction(formData: FormData) {
  const user = await requireUser();
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

  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      categoryId: result.data.categoryId || null,
      description: result.data.description,
      type: result.data.type,
      cents,
      occurredAt,
      notes: result.data.notes || null,
    },
  });
  revalidatePath("/");
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  if (!id.trim()) throw new Error("Lançamento inválido.");

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    select: { goalId: true },
  });
  if (!transaction) throw new Error("Lançamento não encontrado.");
  if (transaction.goalId) throw new Error("Aportes de metas devem ser excluídos pela tela de metas.");

  const result = await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  if (result.count !== 1) throw new Error("Lançamento não encontrado.");

  revalidatePath("/");
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
}

export async function updateTransaction(id: string, formData: FormData) {
  const user = await requireUser();
  const current = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
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
    where: { id, userId: user.id },
    data: { description: result.data.description, cents, type: result.data.type, accountId: account.id, categoryId: result.data.categoryId || null, occurredAt, notes: result.data.notes || null },
  });
  if (updated.count !== 1) throw new Error("Lançamento não encontrado.");
  revalidatePath("/");
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
}
