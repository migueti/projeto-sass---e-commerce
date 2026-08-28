import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";
import { listPluggyConnectors } from "@/lib/pluggy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    return NextResponse.json({ connectors: await listPluggyConnectors() }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acesso negado." }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && ["PLUGGY_NOT_CONFIGURED", "PLUGGY_AUTH_FAILED"].includes(error.message))
      return NextResponse.json({ error: "A integração bancária ainda não está configurada." }, { status: 503, headers: PRIVATE_NO_STORE_HEADERS });
    return NextResponse.json({ error: "Não foi possível carregar as instituições Pluggy." }, { status: 502, headers: PRIVATE_NO_STORE_HEADERS });
  }
}