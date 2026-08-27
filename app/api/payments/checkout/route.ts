import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createCheckoutPreference } from "@/lib/mercado-pago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser();
    if (user.hasPaid) return NextResponse.json({ alreadyPaid: true });
    const { checkoutUrl } = await createCheckoutPreference(user.id, user.email);
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (error instanceof Error && error.message === "MERCADOPAGO_NOT_CONFIGURED")
      return NextResponse.json({ error: "O pagamento ainda não está configurado." }, { status: 503 });
    Sentry.captureException(error);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
