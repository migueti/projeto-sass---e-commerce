import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da conta."),
  type: z.string().trim().min(2, "Informe o tipo da conta."),
  initialAmount: z.string().optional(),
});

export const transactionSchema = z.object({
  description: z.string().trim().min(2, "Informe uma descrição."),
  amount: z.string().trim().min(1, "Informe um valor."),
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Selecione uma conta."),
  categoryId: z.string().optional(),
  occurredAt: z.string().min(1, "Informe uma data."),
  notes: z
    .string()
    .trim()
    .max(500, "Use no máximo 500 caracteres nas observações.")
    .optional(),
});

export function parseBrazilianCents(value: string) {
  const raw = value.trim().replace(/^R\$\s?/, "");
  if (!raw) return null;

  const match = /^(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,3}))?$/.exec(raw);
  if (!match) return null;

  const normalized = `${match[1].replace(/\./g, "")}.${match[2] ?? "0"}`;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const cents = Math.round(amount * 100);
  return cents <= 2_147_483_647 ? cents : null;
}

export function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(`${value}T12:00:00`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}
