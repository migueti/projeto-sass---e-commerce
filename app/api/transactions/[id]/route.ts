import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!id?.trim()) return NextResponse.json({ error: "Lançamento inválido." }, { status: 400 });

    const result = await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
    if (result.count !== 1) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    Sentry.captureException(error);
    return NextResponse.json({ error: "Não foi possível excluir o lançamento." }, { status: 500 });
  }
}
