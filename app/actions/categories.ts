"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria."),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Escolha uma cor válida."),
});

export async function createCategory(formData: FormData) {
  const user = await requireUser();
  const result = categorySchema.safeParse(Object.fromEntries(formData));
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? "Confira os dados.");

  const existing = await prisma.category.findFirst({
    where: { userId: user.id, name: result.data.name },
  });
  if (existing) throw new Error("Você já possui uma categoria com esse nome.");

  await prisma.category.create({ data: { ...result.data, userId: user.id } });
  revalidatePath("/categorias");
  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  const user = await requireUser();
  const result = await prisma.category.deleteMany({ where: { id, userId: user.id } });
  if (result.count !== 1) throw new Error("Categoria não encontrada.");
  revalidatePath("/categorias");
  revalidatePath("/lancamentos");
  revalidatePath("/");
}
