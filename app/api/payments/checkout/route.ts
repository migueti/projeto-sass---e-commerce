import { NextResponse } from "next/server";

import { isAdminUser, requireUser } from "@/lib/auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";
import { createCheckoutPreference } from "@/lib/mercado-pago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser();
    if (user.hasPaid || isAdminUser(user)) return NextResponse.json({ alreadyPaid: true }, { headers: PRIVATE_NO_STORE_HEADERS });
    const { checkoutUrl } = await createCheckoutPreference(user.id, user.email);
    return NextResponse.json({ checkoutUrl }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "MERCADOPAGO_NOT_CONFIGURED")
      return NextResponse.json({ error: "O pagamento ainda não está configurado." }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "MERCADOPAGO_INVALID_BASE_URL")
      return NextResponse.json({ error: "A URL pública do pagamento não está configurada corretamente." }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "MERCADOPAGO_ENVIRONMENT_MISMATCH")
      return NextResponse.json({ error: "As credenciais do Mercado Pago não correspondem ao ambiente configurado." }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
