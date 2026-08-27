"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePaidUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBrazilianCents, parseLocalDate } from "@/lib/validation";

const MAX_ACTIVE_GOALS = 100;

const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da meta.")
    .max(100, "Use no máximo 100 caracteres no nome da meta."),
  target: z.string().min(1, "Informe o valor alvo."),
  saved: z.string().optional(),
  deadline: z.string().optional(),
  accountId: z.string().optional(),
});

const contributionSchema = z.object({
  amount: z.string().trim().min(1, "Informe o valor do aporte."),
});

export async function createGoal(formData: FormData) {
  const user = await requirePaidUser();
  const result = goalSchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? "Confira os dados.");

  const targetCents = parseBrazilianCents(result.data.target);
  const savedInput = result.data.saved?.trim();
  const savedCents = savedInput ? parseBrazilianCents(savedInput) : 0;
  if (!targetCents) throw new Error("Informe um valor alvo válido.");
  if (savedCents === null) throw new Error("Informe um valor guardado válido.");
  if (savedCents > targetCents)
    throw new Error("O valor guardado não pode superar o valor alvo.");
  const deadline = result.data.deadline
    ? parseLocalDate(result.data.deadline)
    : null;
  if (result.data.deadline && !deadline)
    throw new Error("Informe um prazo válido.");

  let accountId: string | null = null;
  if (result.data.accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: result.data.accountId, userId: user.id },
    });
    if (!account) throw new Error("Conta não encontrada.");
    accountId = account.id;
  }

  await prisma.$transaction(async (transaction) => {
    const activeGoalCount = await transaction.financialGoal.count({
      where: { userId: user.id, status: "ACTIVE" },
    });
    if (activeGoalCount >= MAX_ACTIVE_GOALS)
      throw new Error("Você atingiu o limite de metas ativas.");

    const goal = await transaction.financialGoal.create({
      data: {
        userId: user.id,
        accountId,
        name: result.data.name,
        targetCents,
        savedCents,
        deadline,
        status: savedCents === targetCents ? "COMPLETED" : "ACTIVE",
      },
    });

    if (accountId && savedCents > 0) {
      await transaction.transaction.create({
        data: {
          userId: user.id,
          accountId,
          goalId: goal.id,
          type: "EXPENSE",
          description: `Aporte inicial para meta: ${goal.name}`,
          cents: savedCents,
          occurredAt: new Date(),
        },
      });
    }
  });
  revalidatePath("/metas");
  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/lancamentos");
}

export async function deleteGoal(id: string) {
  const user = await requirePaidUser();
  const goal = await prisma.financialGoal.findFirst({
    where: { id, userId: user.id },
    select: { _count: { select: { contributions: true } } },
  });
  if (!goal) throw new Error("Meta não encontrada.");
  if (goal._count.contributions > 0)
    throw new Error("Exclua os aportes da meta antes de excluir a meta.");

  const result = await prisma.financialGoal.deleteMany({ where: { id, userId: user.id } });
  if (result.count !== 1) throw new Error("Meta não encontrada.");
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function addGoalContribution(id: string, formData: FormData) {
  const user = await requirePaidUser();
  const result = contributionSchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? "Confira o valor do aporte.");

  const cents = parseBrazilianCents(result.data.amount);
  if (!cents) throw new Error("Informe um aporte válido maior que zero.");

  await prisma.$transaction(async (transaction) => {
    const goal = await transaction.financialGoal.findFirst({
      where: { id, userId: user.id, status: "ACTIVE" },
      select: { savedCents: true, targetCents: true, accountId: true, name: true },
    });
    if (!goal) throw new Error("Meta não encontrada.");
    const savedCents = goal.savedCents + cents;
    if (savedCents > goal.targetCents)
      throw new Error("O aporte não pode superar o valor alvo.");

    const updated = await transaction.financialGoal.updateMany({
      where: {
        id,
        userId: user.id,
        status: "ACTIVE",
        savedCents: goal.savedCents,
      },
      data: {
        savedCents,
        status: savedCents === goal.targetCents ? "COMPLETED" : "ACTIVE",
      },
    });
    if (updated.count !== 1)
      throw new Error("A meta foi alterada por outro aporte. Tente novamente.");

    if (goal.accountId) {
      await transaction.transaction.create({
        data: {
          userId: user.id,
          accountId: goal.accountId,
          type: "EXPENSE",
          description: `Aporte para meta: ${goal.name}`,
          cents,
          occurredAt: new Date(),
          goalId: id,
        },
      });
    }
  });
  revalidatePath("/metas");
  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/lancamentos");
}
