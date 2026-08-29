import { NextResponse } from "next/server";

import { isAdminUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const user = await requireUser();
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403, headers: noStore });
    }

    const [accounts, transactions, transactionCount, transactionGroups, categories, goals, recurrences, users, payments, pluggyItems] = await Promise.all([
      prisma.financialAccount.findMany({
        select: { name: true, type: true, initialCents: true },
        orderBy: { name: "asc" },
      }),
      prisma.transaction.findMany({
        select: {
          description: true,
          type: true,
          cents: true,
          occurredAt: true,
          account: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 500,
      }),
      prisma.transaction.count(),
      prisma.transaction.groupBy({
        by: ["type"],
        _count: { _all: true },
        _sum: { cents: true },
      }),
      prisma.category.count(),
      prisma.financialGoal.count(),
      prisma.recurringTransaction.count(),
      prisma.user.count(),
      prisma.payment.count(),
      prisma.pluggyItem.count(),
    ]);

    const initialCents = accounts.reduce((sum, account) => sum + account.initialCents, 0);
    const incomeGroup = transactionGroups.find((group) => group.type === "INCOME");
    const expenseGroup = transactionGroups.find((group) => group.type === "EXPENSE");

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      scope: "sistema",
      totals: {
        users,
        accounts: accounts.length,
        categories,
        goals,
        recurrences,
        payments,
        pluggyItems,
        transactions: transactionCount,
        incomeCents: incomeGroup?._sum.cents ?? 0,
        incomeCount: incomeGroup?._count._all ?? 0,
        expenseCents: expenseGroup?._sum.cents ?? 0,
        expenseCount: expenseGroup?._count._all ?? 0,
        initialCents,
        balanceCents: initialCents + (incomeGroup?._sum.cents ?? 0) - (expenseGroup?._sum.cents ?? 0),
      },
      accounts,
      recentTransactions: transactions.map((transaction) => ({
        ...transaction,
        occurredAt: transaction.occurredAt.toISOString(),
      })),
      environment: {
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        nextAuthConfigured: Boolean(process.env.NEXTAUTH_SECRET),
        mercadoPagoConfigured: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
        pluggyConfigured: Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET),
      },
    }, {
      headers: {
        ...noStore,
        "Content-Disposition": `attachment; filename="diagnostico-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: noStore });
    }
    return NextResponse.json({ error: "Não foi possível gerar o diagnóstico." }, { status: 500, headers: noStore });
  }
}
