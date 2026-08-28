import { NextResponse } from "next/server";

import { isAdminUser, requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ hasPaid: user.hasPaid || isAdminUser(user) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    return NextResponse.json({ error: "Não foi possível consultar o pagamento." }, { status: 500 });
  }
}
