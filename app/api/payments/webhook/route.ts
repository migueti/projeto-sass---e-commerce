import * as Sentry from "@sentry/nextjs";
import { MPNotFoundError } from "mercadopago";
import { NextResponse } from "next/server";

import { getMercadoPagoPayment } from "@/lib/mercado-pago";
import { prisma } from "@/lib/prisma";
import { priceFromExternalReference, userIdFromExternalReference, webhookSignatureIsValid } from "@/lib/payment-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";
    if (!webhookSignatureIsValid(request.headers.get("x-signature"), request.headers.get("x-request-id"), dataId))
      return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401 });

    let payment;
    try {
      payment = await getMercadoPagoPayment(dataId);
    } catch (error) {
      if (error instanceof MPNotFoundError) return NextResponse.json({ received: true });
      throw error;
    }
    const userId = userIdFromExternalReference(payment.external_reference);
    const amountCents = Math.round((payment.transaction_amount ?? 0) * 100);
    if (!userId || amountCents !== priceFromExternalReference(payment.external_reference)) return NextResponse.json({ received: true });

    await prisma.$transaction(async (transaction) => {
      const existingPayment = await transaction.payment.findUnique({
        where: { providerPaymentId: String(payment.id) },
        select: { status: true },
      });
      if (existingPayment?.status === "APPROVED") return;

      await transaction.payment.upsert({
        where: { providerPaymentId: String(payment.id) },
        create: {
          userId,
          providerPaymentId: String(payment.id),
          externalReference: payment.external_reference ?? `nuvem:user:${userId}`,
          amountCents,
          status: payment.status === "approved" ? "APPROVED" : "REJECTED",
          approvedAt: payment.status === "approved" ? new Date() : null,
        },
        update: {
          status: payment.status === "approved" ? "APPROVED" : "REJECTED",
          approvedAt: payment.status === "approved" ? new Date() : null,
        },
      });
      if (payment.status === "approved") {
        await transaction.user.updateMany({ where: { id: userId }, data: { hasPaid: true } });
      }
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Não foi possível processar o webhook." }, { status: 500 });
  }
}
