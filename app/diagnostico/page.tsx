import { requireAdminUser } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

const date = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(value);

const accountTypes: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Carteira",
};

export default async function DiagnosticPage() {
  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") redirect("/login?callbackUrl=%2Fdiagnostico");
    if (error instanceof Error && error.message === "FORBIDDEN") notFound();
    throw error;
  }
  const [accounts, transactions, transactionCount, transactionGroups, categories, goals, recurrences, users, payments, pluggyItems] = await Promise.all([
    prisma.financialAccount.findMany({
      select: { id: true, name: true, type: true, initialCents: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      select: {
        description: true,
        type: true,
        cents: true,
        occurredAt: true,
        account: { select: { id: true, name: true } },
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

  const accountBalances = new Map(accounts.map((account) => [account.id, account.initialCents]));
  for (const transaction of transactions) {
    const signedCents = transaction.type === "INCOME" ? transaction.cents : -transaction.cents;
    accountBalances.set(
      transaction.account.id,
      (accountBalances.get(transaction.account.id) ?? 0) + signedCents,
    );
  }

  const initialCents = accounts.reduce((sum, account) => sum + account.initialCents, 0);
  const incomeGroup = transactionGroups.find((group) => group.type === "INCOME");
  const expenseGroup = transactionGroups.find((group) => group.type === "EXPENSE");
  const incomeCents = incomeGroup?._sum.cents ?? 0;
  const expenseCents = expenseGroup?._sum.cents ?? 0;
  const incomeCount = incomeGroup?._count._all ?? 0;
  const expenseCount = expenseGroup?._count._all ?? 0;
  const balanceCents = initialCents + incomeCents - expenseCents;
  const configuredIntegrations = [
    ["Banco de dados", Boolean(process.env.DATABASE_URL)],
    ["NextAuth", Boolean(process.env.NEXTAUTH_SECRET)],
    ["Mercado Pago", Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN)],
    ["Pluggy", Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET)],
  ] as const;

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DIAGNÓSTICO</p>
          <h1>Diagnóstico do sistema</h1>
          <p className="heading-copy">
            Visão operacional do ambiente e dos dados persistidos.
          </p>
        </div>
        <div className="heading-actions">
          <Link className="outline-button" href="/api/admin/diagnostico">
            ↓ Baixar raio-X
          </Link>
        </div>
      </div>

      <section className="stat-grid">
        <div className="stat-card"><span>Saldo calculado</span><strong>{money(balanceCents)}</strong><small>Inicial + receitas - despesas</small></div>
        <div className="stat-card"><span>Saldo inicial</span><strong>{money(initialCents)}</strong><small>{accounts.length} conta(s) no sistema</small></div>
        <div className="stat-card"><span>Receitas</span><strong className="positive">{money(incomeCents)}</strong><small>{incomeCount} lançamento(s)</small></div>
        <div className="stat-card"><span>Despesas</span><strong className="negative">{money(expenseCents)}</strong><small>{expenseCount} lançamento(s)</small></div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div><h3>Contas</h3><p>Saldo inicial e saldo calculado por conta.</p></div>
        </div>
        <div className="records">
          {accounts.length ? accounts.map((account) => (
            <div className="record" key={account.id}>
              <div><strong>{account.name}</strong><small>{accountTypes[account.type] ?? account.type}</small></div>
              <div><strong>{money(accountBalances.get(account.id) ?? account.initialCents)}</strong><small>Inicial: {money(account.initialCents)}</small></div>
            </div>
          )) : <p className="heading-copy">Nenhuma conta cadastrada.</p>}
        </div>
      </section>

      <section className="panel">
          <div className="panel-header"><div><h3>Lançamentos</h3><p>{transactionCount} registro(s) encontrados. Exibindo os 500 mais recentes.</p></div></div>
        <div className="records">
          {transactions.length ? transactions.map((transaction, index) => (
            <div className="record" key={`${transaction.occurredAt.toISOString()}-${transaction.description}-${index}`}>
              <div><strong>{transaction.description}</strong><small>{date(transaction.occurredAt)} · {transaction.account.name}{transaction.category ? ` · ${transaction.category.name}` : ""}</small></div>
              <strong className={transaction.type === "INCOME" ? "positive" : "negative"}>{transaction.type === "INCOME" ? "+" : "-"}{money(transaction.cents)}</strong>
            </div>
          )) : <p className="heading-copy">Nenhum lançamento cadastrado.</p>}
        </div>
      </section>

      <section className="panel diagnostic-meta">
        <h3>Outros registros</h3>
        <p>Usuários: {users} · Categorias: {categories} · Metas: {goals} · Recorrências: {recurrences} · Pagamentos: {payments} · Itens Pluggy: {pluggyItems}</p>
      </section>

      <section className="panel diagnostic-meta">
        <h3>Configurações do ambiente</h3>
        <p>{configuredIntegrations.map(([name, configured]) => `${name}: ${configured ? "configurado" : "ausente"}`).join(" · ")}</p>
      </section>
    </main>
  );
}
