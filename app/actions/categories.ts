"use server";

import { Prisma } from "@prisma/client";

import { requirePaidUser } from "@/lib/auth";
import { requireOwnedCategory } from "@/lib/ownership";
import { categoryForImportedTransaction } from "@/lib/import-categories";
import { prisma } from "@/lib/prisma";
import { revalidatePaths } from "@/lib/revalidation";
import { categorySchema } from "@/lib/validation";

export async function createCategory(formData: FormData) {
  const user = await requirePaidUser();
  const result = categorySchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? "Confira os dados.");

  const existing = await prisma.category.findFirst({
    where: { userId: user.id, name: result.data.name },
  });
  if (existing) throw new Error("Você já possui uma categoria com esse nome.");

  try {
    await prisma.category.create({ data: { ...result.data, userId: user.id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new Error("Você já possui uma categoria com esse nome.");
    throw error;
  }
  revalidatePaths("/categorias", "/");
}

export async function deleteCategory(id: string) {
  const user = await requirePaidUser();
  await requireOwnedCategory(id, user.id);
  const result = await prisma.category.deleteMany({ where: { id, userId: user.id } });
  if (result.count !== 1) throw new Error("Categoria não encontrada.");
  revalidatePaths("/categorias", "/lancamentos", "/recorrencias", "/");
}

export async function autoCategorizeTransactions() {
  const user = await requirePaidUser();
  
  // Buscar todas as transações sem categoria
  const uncategorizedTransactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      categoryId: null,
    },
    select: {
      id: true,
      description: true,
      type: true,
    },
  });

  if (uncategorizedTransactions.length === 0) {
    return { message: "Nenhuma transação para categorizar.", categorizedCount: 0 };
  }

  const result = await prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, string>();
    const updates: Array<{ id: string; categoryId: string }> = [];

    // Para cada transação, gerar a sugestão de categoria
    for (const transaction of uncategorizedTransactions) {
      const suggestion = categoryForImportedTransaction({
        description: transaction.description,
        type: transaction.type,
        date: new Date().toISOString().split("T")[0],
        cents: 0,
      });

      // Criar ou buscar a categoria sugerida
      if (!categoryIds.has(suggestion.name)) {
        const savedCategory = await tx.category.upsert({
          where: { userId_name: { userId: user.id, name: suggestion.name } },
          create: { userId: user.id, name: suggestion.name, color: suggestion.color },
          update: {},
          select: { id: true },
        });
        categoryIds.set(suggestion.name, savedCategory.id);
      }

      // Preparar atualização
      updates.push({
        id: transaction.id,
        categoryId: categoryIds.get(suggestion.name)!,
      });
    }

    // Atualizar todas as transações em paralelo
    for (const update of updates) {
      await tx.transaction.update({
        where: { id: update.id },
        data: { categoryId: update.categoryId },
      });
    }

    return updates.length;
  });

  revalidatePaths("/", "/lancamentos", "/categorias");
  return {
    message: `${result} transações foram categorizadas automaticamente.`,
    categorizedCount: result,
  };
}
