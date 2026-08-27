import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { userIdFromExternalReference, webhookSignatureIsValid } from "@/lib/payment-webhook";

describe("payment webhook", () => {
  it("accepts a valid Mercado Pago x-signature", () => {
    const secret = "webhook-secret";
    const dataId = "payment-123";
    const requestId = "request-456";
    const timestamp = "1710000000";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const hash = createHmac("sha256", secret).update(manifest).digest("hex");

    expect(webhookSignatureIsValid(`ts=${timestamp},v1=${hash}`, requestId, dataId, secret)).toBe(true);
    expect(webhookSignatureIsValid(`ts=${timestamp},v1=${hash}`, requestId, "other", secret)).toBe(false);
  });

  it("extracts only the expected user reference format", () => {
    expect(userIdFromExternalReference("nuvem:user:user-123:checkout-456")).toBe("user-123");
    expect(userIdFromExternalReference("nuvem:user:user-123")).toBe(null);
    expect(userIdFromExternalReference(undefined)).toBe(null);
  });
});
