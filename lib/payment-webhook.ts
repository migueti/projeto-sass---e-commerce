import { createHmac, timingSafeEqual } from "node:crypto";

export function webhookSignatureIsValid(
  signature: string | null,
  requestId: string | null,
  dataId: string,
  secret = process.env.MERCADOPAGO_WEBHOOK_SECRET,
) {
  if (!secret || !signature || !requestId || !dataId) return false;
  const values = Object.fromEntries(signature.split(",").map((part) => {
    const [key, value] = part.trim().split("=", 2);
    return [key, value];
  }));
  if (!values.ts || !values.v1 || !/^[a-f\d]{64}$/i.test(values.v1)) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${values.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(values.v1, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export function userIdFromExternalReference(reference: string | undefined) {
  const match = /^nuvem:user:([^:]+):[^:]+$/.exec(reference ?? "");
  return match?.[1] ?? null;
}
