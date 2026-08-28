"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { consumeRegistrationAttempt, resetLoginAttempts } from "@/lib/login-rate-limit";
import { passwordSchema } from "@/lib/validation";

const registrationSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80, "Use no máximo 80 caracteres no nome."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: passwordSchema,
});

export async function registerUser(_state: { error?: string; success?: boolean }, formData: FormData) {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  if (!consumeRegistrationAttempt(parsed.data.email))
    return { error: "Muitas tentativas de cadastro. Tente novamente mais tarde." };

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) return { error: "Não foi possível criar sua conta agora." };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.email === process.env.ADMIN_EMAIL?.trim().toLowerCase() ? "ADMIN" : "USER",
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return { error: "Este e-mail já está cadastrado." };
    return { error: "Não foi possível criar sua conta agora." };
  }

  resetLoginAttempts(`registration:${parsed.data.email}`);
  return { success: true };
}
