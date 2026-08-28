"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requirePaidUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePaths } from "@/lib/revalidation";

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da categoria.")
    .max(50, "Use no máximo 50 caracteres no nome da categoria."),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Escolha uma cor válida."),
});

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
  const result = await prisma.category.deleteMany({ where: { id, userId: user.id } });
  if (result.count !== 1) throw new Error("Categoria não encontrada.");
  revalidatePaths("/categorias", "/lancamentos", "/recorrencias", "/");
}
