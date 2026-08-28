import { createHmac, timingSafeEqual } from "node:crypto";

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;
const MAX_PAYMENT_CENTS = 2_147_483_647;

export type PaymentWebhookStatus = "APPROVED" | "PENDING" | "REJECTED";

export function paymentAmountToCents(value: number | null | undefined) {
  if (!Number.isFinite(value) || value === undefined || value === null || value <= 0)
    return null;

  const [whole, fraction] = value.toFixed(2).split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction);
  return cents <= BigInt(MAX_PAYMENT_CENTS) ? Number(cents) : null;
}

export function paymentStatusFromProvider(
  status: string | null | undefined,
): PaymentWebhookStatus {
  if (status === "approved") return "APPROVED";
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(status ?? ""))
    return "REJECTED";
  return "PENDING";
}

export function webhookSignatureIsValid(
  signature: string | null,
  requestId: string | null,
  dataId: string,
  secret = process.env.MERCADOPAGO_WEBHOOK_SECRET,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!secret || !signature || !requestId || !dataId) return false;
  const values: Record<string, string> = {};
  for (const part of signature.split(",")) {
    const segments = part.trim().split("=");
    const key = segments[0];
    const value = segments[1];
    if (!key || value === undefined || segments.length !== 2 || key in values) return false;
    values[key] = value;
  }
  if (!values.ts || !/^\d+$/.test(values.ts)) return false;
  const timestamp = Number(values.ts);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS || !values.v1 || !/^[a-f\d]{64}$/i.test(values.v1)) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${values.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(values.v1, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export function userIdFromExternalReference(reference: string | undefined) {
  const match = /^nuvem:user:([^:]+):price:\d+:[^:]+$/.exec(reference ?? "");
  return match?.[1] ?? null;
}

export function priceFromExternalReference(reference: string | undefined) {
  const match = /^nuvem:user:[^:]+:price:(\d+):[^:]+$/.exec(reference ?? "");
  if (!match) return null;

  const priceCents = Number(match[1]);
  return Number.isSafeInteger(priceCents) && priceCents > 0
    ? priceCents
    : null;
}
