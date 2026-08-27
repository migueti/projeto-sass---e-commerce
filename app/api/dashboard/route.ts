import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getDashboard, parseDashboardFilters } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const filters = parseDashboardFilters(new URL(request.url).searchParams);
    return NextResponse.json(await getDashboard(user.id, filters));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (error instanceof Error && error.message === "INVALID_PERIOD") return NextResponse.json({ error: "Período inválido." }, { status: 400 });
    if (error instanceof Error && error.message === "DASHBOARD_TOO_LARGE") return NextResponse.json({ error: "Reduza o período ou aplique filtros para carregar o dashboard." }, { status: 413 });
    Sentry.captureException(error);
    return NextResponse.json({ error: "Não foi possível carregar o dashboard." }, { status: 500 });
  }
}
