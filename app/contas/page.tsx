import { createAccount } from "@/app/actions/transactions";
import { requirePaidUser } from "@/lib/auth";
import { summarizeAccountTransactions } from "@/lib/accounts";
import { prisma } from "@/lib/prisma";

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
          <form action={createAccount} className="crud-form">
            <label>
              Nome <small>(obrigatório)</small>
              <input name="name" placeholder="Ex.: Nubank" required aria-required="true" />
            </label>
            <label>
              Tipo <small>(obrigatório)</small>
              <select name="type" defaultValue="checking" required aria-required="true">
                <option value="checking">Conta corrente</option>
                <option value="savings">Poupança</option>
                <option value="cash">Carteira</option>
              </select>
            </label>
            <label>
              Saldo inicial
              <input name="initialAmount" inputMode="decimal" placeholder="0,00" aria-label="Saldo inicial da conta em reais" />
            </label>
            <button className="primary-button">Adicionar conta</button>
          </form>
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
      </div>
    </main>
  );
}
