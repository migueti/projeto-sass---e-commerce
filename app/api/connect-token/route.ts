import { NextResponse } from "next/server";

import { requirePaidApiUser } from "@/lib/auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";
import { createPluggyConnectToken } from "@/lib/pluggy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requirePaidApiUser();
    const connectToken = await createPluggyConnectToken(user.id);
    return NextResponse.json({ accessToken: connectToken.accessToken }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "PAYMENT_REQUIRED")
      return NextResponse.json({ error: "É necessário ativar o acesso antes de conectar uma conta." }, { status: 402, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && ["PLUGGY_NOT_CONFIGURED", "PLUGGY_AUTH_FAILED"].includes(error.message))
      return NextResponse.json({ error: "A integração bancária ainda não está configurada." }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
    return NextResponse.json({ error: "Não foi possível iniciar a conexão bancária." }, { status: 502, headers: PRIVATE_NO_STORE_HEADERS });
  }
}