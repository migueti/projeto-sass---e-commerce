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
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

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
    mocks.transactionClient.payment.findUnique.mockResolvedValue({ status: "APPROVED" });

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
});