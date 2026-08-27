"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextRecurrenceDate } from "@/lib/recurrence";
import { parseBrazilianCents, parseLocalDate } from "@/lib/validation";

const recurrenceSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Informe uma descrição.")
    .max(120, "Use no máximo 120 caracteres na descrição."),
  amount: z.string().min(1, "Informe um valor."),
  type: z.enum(["INCOME", "EXPENSE"]),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  accountId: z.string().min(1, "Selecione uma conta."),
  categoryId: z.string().optional(),
  nextOccurrence: z.string().min(1, "Informe a próxima ocorrência."),
  endAt: z.string().optional(),
});

export async function createRecurrence(formData: FormData) {
  const user = await requireUser();
  const result = recurrenceSchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? "Confira os dados.");
  const cents = parseBrazilianCents(result.data.amount);
  if (!cents) throw new Error("Informe um valor válido maior que zero.");
  const nextOccurrence = parseLocalDate(result.data.nextOccurrence);
  if (!nextOccurrence) throw new Error("Informe uma próxima data válida.");
  const endAt = result.data.endAt
    ? parseLocalDate(result.data.endAt)
    : null;
  if (result.data.endAt && !endAt)
    throw new Error("Informe uma data final válida.");
  if (endAt && endAt < nextOccurrence)
    throw new Error("A data final deve ser posterior ou igual à próxima ocorrência.");

  const account = await prisma.financialAccount.findFirst({
    where: { id: result.data.accountId, userId: user.id },
  });
  if (!account) throw new Error("Conta não encontrada.");
  if (result.data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: result.data.categoryId, userId: user.id },
    });
    if (!category) throw new Error("Categoria não encontrada.");
  }

  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      categoryId: result.data.categoryId || null,
      description: result.data.description,
      cents,
      type: result.data.type,
      frequency: result.data.frequency,
      dayOfMonth:
        result.data.frequency === "WEEKLY" ? null : nextOccurrence.getUTCDate(),
      nextOccurrence,
      endAt,
    },
  });
  revalidatePath("/recorrencias");
  revalidatePath("/");
}

export async function processRecurrence(id: string) {
  const user = await requireUser();
  const recurrence = await prisma.recurringTransaction.findFirst({
    where: { id, userId: user.id, active: true },
  });
  const now = new Date();
  if (!recurrence || recurrence.nextOccurrence > now)
    throw new Error("Esta recorrência ainda não está vencida.");

  const occurrences: Date[] = [];
  let nextOccurrence = recurrence.nextOccurrence;
  while (
    nextOccurrence <= now &&
    (!recurrence.endAt || nextOccurrence <= recurrence.endAt)
  ) {
    occurrences.push(nextOccurrence);
    if (occurrences.length > 1_200)
      throw new Error("Há muitas ocorrências pendentes para processar de uma vez.");
    nextOccurrence = getNextRecurrenceDate(
      nextOccurrence,
      recurrence.frequency,
      recurrence.dayOfMonth ?? undefined,
    );
  }
  const shouldFinish = Boolean(
    recurrence.endAt && nextOccurrence > recurrence.endAt,
  );
  const updated = await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.recurringTransaction.updateMany({
      where: {
        id,
        userId: user.id,
        active: true,
        nextOccurrence: recurrence.nextOccurrence,
      },
      data: shouldFinish ? { active: false } : { nextOccurrence },
    });
    if (claimed.count !== 1) return false;
    if (occurrences.length) {
      await transaction.transaction.createMany({
        data: occurrences.map((occurredAt) => ({
          userId: user.id,
          accountId: recurrence.accountId,
          categoryId: recurrence.categoryId,
          description: recurrence.description,
          cents: recurrence.cents,
          type: recurrence.type,
          occurredAt,
        })),
      });
    }
    return true;
  });
  if (!updated) throw new Error("A recorrência já foi processada.");
  revalidatePath("/recorrencias");
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
  revalidatePath("/");
}

export async function toggleRecurrence(id: string) {
  const user = await requireUser();
  const recurrence = await prisma.recurringTransaction.findFirst({ where: { id, userId: user.id } });
  if (!recurrence) throw new Error("Recorrência não encontrada.");
  const updated = await prisma.recurringTransaction.updateMany({
    where: { id, userId: user.id, active: recurrence.active },
    data: { active: !recurrence.active },
  });
  if (updated.count !== 1) throw new Error("A recorrência foi alterada. Atualize a página e tente novamente.");
  revalidatePath("/recorrencias");
  revalidatePath("/");
}

export async function deleteRecurrence(id: string) {
  const user = await requireUser();
  const result = await prisma.recurringTransaction.deleteMany({ where: { id, userId: user.id } });
  if (result.count !== 1) throw new Error("Recorrência não encontrada.");
  revalidatePath("/recorrencias");
  revalidatePath("/");
}
