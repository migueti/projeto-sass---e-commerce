import { z } from "zod";

const BCRYPT_MAX_PASSWORD_BYTES = 72;
const MAX_CURRENCY_INPUT_LENGTH = 32;

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= BCRYPT_MAX_PASSWORD_BYTES,
    `A senha deve ter no máximo ${BCRYPT_MAX_PASSWORD_BYTES} bytes.`,
  );

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da conta.")
    .max(80, "Use no máximo 80 caracteres no nome da conta."),
  type: z.enum(["checking", "savings", "cash"], {
    message: "Informe um tipo de conta válido.",
  }),
  initialAmount: z.string().optional(),
});

export const transactionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Informe uma descrição.")
    .max(120, "Use no máximo 120 caracteres na descrição."),
  amount: z.string().trim().min(1, "Informe um valor."),
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Selecione uma conta."),
  categoryId: z.string().optional(),
  occurredAt: z
    .string()
    .min(1, "Informe uma data.")
    .refine((value) => parseLocalDate(value) !== null, "Informe uma data válida."),
  notes: z
    .string()
    .trim()
    .max(500, "Use no máximo 500 caracteres nas observações.")
    .optional(),
});

export function parseBrazilianCents(
  value: string,
  options: { allowZero?: boolean } = {},
) {
  const { allowZero = false } = options;
  const raw = value.trim().replace(/^r\$\s?/i, "");
  if (!raw || raw.length > MAX_CURRENCY_INPUT_LENGTH) return null;

  const match = /^(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/.exec(raw);
  if (!match) return null;

  const wholeCents = BigInt(match[1].replace(/\./g, "")) * BigInt(100);
  const fractionalCents = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const cents = wholeCents + fractionalCents;
  const maxCents = BigInt(2_147_483_647);

  if (cents === BigInt(0) && !allowZero) return null;
  return cents <= maxCents ? Number(cents) : null;
}

export function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}
