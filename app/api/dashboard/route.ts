import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { isAdminUser, requireUser } from "@/lib/auth";
import { getDashboard, parseDashboardFilters } from "@/lib/dashboard";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (!user.hasPaid && !isAdminUser(user))
      return NextResponse.json({ error: "Pagamento necessário." }, { status: 402, headers: PRIVATE_NO_STORE_HEADERS });
    const filters = parseDashboardFilters(new URL(request.url).searchParams);
    return NextResponse.json(await getDashboard(user.id, filters), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "INVALID_PERIOD") return NextResponse.json({ error: "Período inválido." }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "DASHBOARD_TOO_LARGE") return NextResponse.json({ error: "Reduza o período ou aplique filtros para carregar o dashboard." }, { status: 413, headers: PRIVATE_NO_STORE_HEADERS });
    Sentry.captureException(error);
    return NextResponse.json({ error: "Não foi possível carregar o dashboard." }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
