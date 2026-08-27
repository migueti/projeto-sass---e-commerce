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
    if (!user.hasPaid) return NextResponse.json({ error: "Pagamento necessário." }, { status: 402 });
    const { id } = await context.params;
    if (!id?.trim()) return NextResponse.json({ error: "Lançamento inválido." }, { status: 400 });

    await prisma.$transaction(async (transaction) => {
      const current = await transaction.transaction.findFirst({
        where: { id, userId: user.id },
        select: { cents: true, goalId: true },
      });
      if (!current) throw new Error("TRANSACTION_NOT_FOUND");

      if (current.goalId) {
        const goal = await transaction.financialGoal.findFirst({
          where: { id: current.goalId, userId: user.id },
          select: { savedCents: true, status: true },
        });
        if (!goal || goal.savedCents < current.cents) {
          throw new Error("GOAL_CONTRIBUTION_INVALID");
        }

        const updatedGoal = await transaction.financialGoal.updateMany({
          where: {
            id: current.goalId,
            userId: user.id,
            savedCents: goal.savedCents,
          },
          data: {
            savedCents: { decrement: current.cents },
            status: goal.status === "COMPLETED" ? "ACTIVE" : goal.status,
          },
        });
        if (updatedGoal.count !== 1) throw new Error("GOAL_CONTRIBUTION_CONFLICT");
      }

      const deleted = await transaction.transaction.deleteMany({ where: { id, userId: user.id } });
      if (deleted.count !== 1) throw new Error("TRANSACTION_NOT_FOUND");
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "TRANSACTION_NOT_FOUND") {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "GOAL_CONTRIBUTION_INVALID") {
      return NextResponse.json({ error: "Não foi possível reverter o aporte da meta." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "GOAL_CONTRIBUTION_CONFLICT") {
      return NextResponse.json({ error: "A meta foi alterada por outro aporte. Tente novamente." }, { status: 409 });
    }
    Sentry.captureException(error);
    return NextResponse.json({ error: "Não foi possível excluir o lançamento." }, { status: 500 });
  }
}
