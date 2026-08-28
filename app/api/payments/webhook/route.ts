import { MPNotFoundError } from "mercadopago";
import { NextResponse } from "next/server";

import { getMercadoPagoPayment } from "@/lib/mercado-pago";
import { prisma } from "@/lib/prisma";
import { paymentAmountToCents, paymentStatusFromProvider, priceFromExternalReference, userIdFromExternalReference, webhookSignatureIsValid } from "@/lib/payment-webhook";
import { withTransactionRetry } from "@/lib/recurrence";

export const runtime = "nodejs";

const WEBHOOK_NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";
    if (!webhookSignatureIsValid(request.headers.get("x-signature"), request.headers.get("x-request-id"), dataId))
      return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401, headers: WEBHOOK_NO_STORE_HEADERS });

    let payment;
    try {
      payment = await getMercadoPagoPayment(dataId);
    } catch (error) {
      if (error instanceof MPNotFoundError) return NextResponse.json({ received: true }, { headers: WEBHOOK_NO_STORE_HEADERS });
      throw error;
    }
    const userId = userIdFromExternalReference(payment.external_reference);
    const amountCents = paymentAmountToCents(payment.transaction_amount);
    if (!userId || amountCents === null || amountCents !== priceFromExternalReference(payment.external_reference)) return NextResponse.json({ received: true }, { headers: WEBHOOK_NO_STORE_HEADERS });
    const status = paymentStatusFromProvider(payment.status);

    await withTransactionRetry(() => prisma.$transaction(async (transaction) => {
      const existingPayment = await transaction.payment.findUnique({
        where: { providerPaymentId: String(payment.id) },
        select: { status: true, userId: true, externalReference: true, amountCents: true },
      });
      if (existingPayment?.status === "APPROVED") return;
      if (
        existingPayment &&
        (existingPayment.userId !== userId ||
          existingPayment.externalReference !== payment.external_reference ||
          existingPayment.amountCents !== amountCents)
      )
        return;

      await transaction.payment.upsert({
        where: { providerPaymentId: String(payment.id) },
        create: {
          userId,
          providerPaymentId: String(payment.id),
          externalReference: payment.external_reference ?? `nuvem:user:${userId}`,
          amountCents,
          status,
          approvedAt: status === "APPROVED" ? new Date() : null,
        },
        update: {
          status,
          approvedAt: status === "APPROVED" ? new Date() : null,
        },
      });
      if (status === "APPROVED") {
        await transaction.user.updateMany({ where: { id: userId }, data: { hasPaid: true } });
      }
    }));
    return NextResponse.json({ received: true }, { headers: WEBHOOK_NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Não foi possível processar o webhook." }, { status: 500, headers: WEBHOOK_NO_STORE_HEADERS });
  }
}
