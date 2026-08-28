import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    payment: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: { updateMany: vi.fn() },
  };

  return {
    getMercadoPagoPayment: vi.fn(),
    prisma: {
      $transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
        callback(transactionClient),
      ),
    },
    transactionClient,
  };
});

vi.mock("@/lib/mercado-pago", () => ({ getMercadoPagoPayment: mocks.getMercadoPagoPayment }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
import { POST } from "@/app/api/payments/webhook/route";

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "webhook-secret";
  });

  it("does not downgrade an already approved payment", async () => {
    const dataId = "payment-123";
    const requestId = "request-456";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const externalReference = "nuvem:user:user-123:price:2990:checkout-456";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const hash = createHmac("sha256", "webhook-secret").update(manifest).digest("hex");

    mocks.getMercadoPagoPayment.mockResolvedValue({
      id: dataId,
      external_reference: externalReference,
      transaction_amount: 29.9,
      status: "rejected",
    });
    mocks.transactionClient.payment.findUnique.mockResolvedValue({
      status: "APPROVED",
      userId: "user-123",
      externalReference,
      amountCents: 2_990,
    });

    const response = await POST(new Request(
      `http://localhost/api/payments/webhook?data.id=${dataId}`,
      { headers: { "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${hash}` } },
    ));

    expect(response.status).toBe(200);
    expect(mocks.transactionClient.payment.upsert).not.toHaveBeenCalled();
    expect(mocks.transactionClient.user.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before accessing payment data", async () => {
    const response = await POST(new Request(
      "http://localhost/api/payments/webhook?data.id=payment-123",
      { headers: { "x-request-id": "request-456", "x-signature": "ts=invalid,v1=invalid" } },
    ));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Webhook não autorizado." });
    expect(mocks.getMercadoPagoPayment).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("keeps pending payments pending without granting access", async () => {
    const dataId = "payment-pending";
    const requestId = "request-pending";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const externalReference = "nuvem:user:user-123:price:2990:checkout-pending";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const hash = createHmac("sha256", "webhook-secret").update(manifest).digest("hex");

    mocks.getMercadoPagoPayment.mockResolvedValue({
      id: dataId,
      external_reference: externalReference,
      transaction_amount: 29.9,
      status: "pending",
    });
    mocks.transactionClient.payment.findUnique.mockResolvedValue(null);
    mocks.transactionClient.payment.upsert.mockResolvedValue({});

    const response = await POST(new Request(
      `http://localhost/api/payments/webhook?data.id=${dataId}`,
      { headers: { "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${hash}` } },
    ));

    expect(response.status).toBe(200);
    expect(mocks.transactionClient.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ status: "PENDING", approvedAt: null }),
      update: { status: "PENDING", approvedAt: null },
    }));
    expect(mocks.transactionClient.user.updateMany).not.toHaveBeenCalled();
  });

  it("ignores a provider payment whose stored identity does not match", async () => {
    const dataId = "payment-reused";
    const requestId = "request-reused";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const externalReference = "nuvem:user:user-123:price:2990:checkout-reused";
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const hash = createHmac("sha256", "webhook-secret").update(manifest).digest("hex");

    mocks.getMercadoPagoPayment.mockResolvedValue({
      id: dataId,
      external_reference: externalReference,
      transaction_amount: 29.9,
      status: "approved",
    });
    mocks.transactionClient.payment.findUnique.mockResolvedValue({
      status: "PENDING",
      userId: "another-user",
      externalReference: "nuvem:user:another-user:price:2990:checkout-other",
      amountCents: 2_990,
    });

    const response = await POST(new Request(
      `http://localhost/api/payments/webhook?data.id=${dataId}`,
      { headers: { "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${hash}` } },
    ));

    expect(response.status).toBe(200);
    expect(mocks.transactionClient.payment.upsert).not.toHaveBeenCalled();
    expect(mocks.transactionClient.user.updateMany).not.toHaveBeenCalled();
  });
});