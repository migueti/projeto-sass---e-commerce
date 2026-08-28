import { NextResponse } from "next/server";

import { isAdminUser, requireUser } from "@/lib/auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ hasPaid: user.hasPaid || isAdminUser(user) }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    return NextResponse.json({ error: "Não foi possível consultar o pagamento." }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
