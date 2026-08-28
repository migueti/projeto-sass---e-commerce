import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { paymentStatusFromProvider, priceFromExternalReference, userIdFromExternalReference, webhookSignatureIsValid } from "@/lib/payment-webhook";

describe("payment webhook", () => {
  it("maps provider statuses without treating pending as rejected", () => {
    expect(paymentStatusFromProvider("approved")).toBe("APPROVED");
    expect(paymentStatusFromProvider("pending")).toBe("PENDING");
    expect(paymentStatusFromProvider("rejected")).toBe("REJECTED");
    expect(paymentStatusFromProvider("cancelled")).toBe("REJECTED");
    expect(paymentStatusFromProvider("refunded")).toBe("REJECTED");
    expect(paymentStatusFromProvider("charged_back")).toBe("REJECTED");
    expect(paymentStatusFromProvider("in_process")).toBe("PENDING");
    expect(paymentStatusFromProvider("future_status")).toBe("PENDING");
  });

  it("accepts a valid Mercado Pago x-signature", () => {
    const secret = "webhook-secret";
    const dataId = "payment-123";
    const requestId = "request-456";
    const timestamp = "1710000000";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const hash = createHmac("sha256", secret).update(manifest).digest("hex");

    expect(webhookSignatureIsValid(`ts=${timestamp},v1=${hash}`, requestId, dataId, secret, 1710000000)).toBe(true);
    expect(webhookSignatureIsValid(`ts=${timestamp},v1=${hash}`, requestId, "other", secret)).toBe(false);
  });

  it("rejects signatures outside the replay protection window", () => {
    const secret = "webhook-secret";
    const dataId = "payment-123";
    const requestId = "request-456";
    const timestamp = "1710000000";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const hash = createHmac("sha256", secret).update(manifest).digest("hex");
    const signature = `ts=${timestamp},v1=${hash}`;

    expect(webhookSignatureIsValid(signature, requestId, dataId, secret, 1710000300)).toBe(true);
    expect(webhookSignatureIsValid(signature, requestId, dataId, secret, 1710000301)).toBe(false);
    expect(webhookSignatureIsValid(signature, requestId, dataId, secret, 1709999699)).toBe(false);
  });

  it("rejects non-decimal webhook timestamps", () => {
    const secret = "webhook-secret";
    const dataId = "payment-123";
    const requestId = "request-456";
    const timestamp = "0x65e9c680";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const hash = createHmac("sha256", secret).update(manifest).digest("hex");

    expect(webhookSignatureIsValid(`ts=${timestamp},v1=${hash}`, requestId, dataId, secret)).toBe(false);
  });

  it("extracts only the expected user reference format", () => {
    expect(userIdFromExternalReference("nuvem:user:user-123:price:2990:checkout-456")).toBe("user-123");
    expect(priceFromExternalReference("nuvem:user:user-123:price:2990:checkout-456")).toBe(2990);
    expect(userIdFromExternalReference("nuvem:user:user-123")).toBe(null);
    expect(userIdFromExternalReference(undefined)).toBe(null);
    expect(priceFromExternalReference("nuvem:user:user-123:price:0:checkout-456")).toBe(null);
    expect(priceFromExternalReference(`nuvem:user:user-123:price:${Number.MAX_SAFE_INTEGER}0:checkout-456`)).toBe(null);
  });
});
