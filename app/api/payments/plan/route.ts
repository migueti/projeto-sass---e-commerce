import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getPlanPriceCents } from "@/lib/billing";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ priceCents: await getPlanPriceCents() }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    return NextResponse.json({ error: "Não foi possível consultar o plano." }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
