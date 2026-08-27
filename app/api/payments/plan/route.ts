import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getPlanPriceCents } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ priceCents: await getPlanPriceCents() });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    return NextResponse.json({ error: "Não foi possível consultar o plano." }, { status: 500 });
  }
}
