"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBrazilianCents, parseLocalDate } from "@/lib/validation";

const goalSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da meta."),
  target: z.string().min(1, "Informe o valor alvo."),
  saved: z.string().optional(),
  deadline: z.string().optional(),
  accountId: z.string().optional(),
});

export async function createGoal(formData: FormData) {
  const user = await requireUser();
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

  await prisma.financialGoal.create({
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
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function deleteGoal(id: string) {
  const user = await requireUser();
  const result = await prisma.financialGoal.deleteMany({ where: { id, userId: user.id } });
  if (result.count !== 1) throw new Error("Meta não encontrada.");
  revalidatePath("/metas");
  revalidatePath("/");
}
