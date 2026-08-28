import { requirePaidUser } from "@/lib/auth";
import { summarizeAccountTransactions } from "@/lib/accounts";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "@/components/account-form";
import { OpenFinanceConnect } from "@/components/open-finance-connect";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
const labels: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Carteira",
};

export default async function AccountsPage() {
  const user = await requirePaidUser();
  const accounts = await prisma.financialAccount.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, type: true, initialCents: true },
    orderBy: { name: "asc" },
  });
  const transactionTotals = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { userId: user.id },
    _sum: { cents: true },
    _count: { _all: true },
    orderBy: { accountId: "asc" },
  });
  const accountSummaries = summarizeAccountTransactions(accounts, transactionTotals);

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PATRIMÔNIO</p>
          <h1>Minhas contas</h1>
          <p className="heading-copy">
            Tenha uma visão clara de onde seu dinheiro está.
          </p>
        </div>
      </div>
      <div className="crud-grid">
        <section className="panel">
          <h3>Nova conta</h3>
          <AccountForm />
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Contas cadastradas</h3>
              <p>{accounts.length} conta(s) ativa(s)</p>
            </div>
          </div>
          <div className="records">
            {accounts.length ? (
              accounts.map((account) => {
                const summary = accountSummaries.get(account.id);
                return (
                  <div className="record" key={account.id}>
                    <div>
                      <strong>{account.name}</strong>
                      <small>
                        {labels[account.type] ?? account.type} ·{" "}
                        {summary?.transactionCount ?? 0} lançamento(s)
                      </small>
                    </div>
                    <b className={(summary?.balanceCents ?? 0) >= 0 ? "positive" : "negative"}>
                      {money(summary?.balanceCents ?? account.initialCents)}
                    </b>
                  </div>
                );
              })
            ) : (
              <p className="heading-copy">Adicione sua primeira conta.</p>
            )}
          </div>
        </section>
        <section className="panel">
          <h3>Conectar conta bancária</h3>
          <p className="heading-copy">Use o Open Finance para conectar uma instituição com segurança.</p>
          <OpenFinanceConnect />
        </section>
      </div>
    </main>
  );
}
