"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const registrationSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export async function registerUser(_state: { error?: string; success?: boolean }, formData: FormData) {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) return { error: "Este e-mail já está cadastrado." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      categories: {
        create: [
          { name: "Casa", color: "#5d8e63" },
          { name: "Alimentação", color: "#e78c7d" },
          { name: "Transporte", color: "#9284b5" },
          { name: "Lazer", color: "#e0c98f" },
        ],
      },
    },
  });

  return { success: true };
}
