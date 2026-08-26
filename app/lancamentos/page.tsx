import { createAccount, createTransaction } from "@/app/actions/transactions";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { type Prisma, TransactionType } from "@prisma/client";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseLocalDate } from "@/lib/validation";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ type?: string; accountId?: string; categoryId?: string; from?: string; to?: string }> }) {
  const user = await requireUser();
  const filters = await searchParams;
  const type: TransactionType | undefined = filters.type === "INCOME" || filters.type === "EXPENSE" ? filters.type : undefined;
  const accountId = filters.accountId || undefined;
  const categoryId = filters.categoryId || undefined;
  const from = filters.from && parseLocalDate(filters.from) ? filters.from : undefined;
  const to = filters.to && parseLocalDate(filters.to) ? filters.to : undefined;
  const fromDate = from ? parseLocalDate(from) : null;
  const toExclusive = to ? parseLocalDate(to) : null;
  if (toExclusive) {
    toExclusive.setDate(toExclusive.getDate() + 1);
    toExclusive.setHours(0, 0, 0, 0);
  }
  const dateFilter = fromDate || toExclusive ? { occurredAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toExclusive ? { lt: toExclusive } : {}) } } : {};
  const transactionFilters: Prisma.TransactionWhereInput = {
    userId: user.id,
    ...(type ? { type } : {}),
    ...(accountId ? { accountId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...dateFilter,
  };
  const [accounts, categories, transactions] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where: transactionFilters,
      include: { account: true, category: true },
      orderBy: { occurredAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MOVIMENTAÇÕES</p>
          <h1>Lançamentos</h1>
          <p className="heading-copy">
            Registre e acompanhe cada movimento do seu dinheiro.
          </p>
        </div>
      </div>
      <div className="crud-grid">
        <section className="panel">
          <h3>Nova conta</h3>
          <form action={createAccount} className="crud-form">
            <label>
              Nome
              <input name="name" placeholder="Ex.: Nubank" required />
            </label>
            <label>
              Tipo
              <select name="type" defaultValue="checking">
                <option value="checking">Conta corrente</option>
                <option value="savings">Poupança</option>
                <option value="cash">Carteira</option>
              </select>
            </label>
            <label>
              Saldo inicial
              <input
                name="initialAmount"
                inputMode="decimal"
                placeholder="0,00"
              />
            </label>
            <button className="primary-button">Criar conta</button>
          </form>
        </section>
        <section className="panel">
          <h3>Novo lançamento</h3>
          {accounts.length === 0 ? (
            <p className="form-error">
              Crie uma conta antes de registrar um lançamento.
            </p>
          ) : (
            <form action={createTransaction} className="crud-form">
              <label>
                Descrição
                <input
                  name="description"
                  placeholder="Ex.: Supermercado"
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  Valor
                  <input
                    name="amount"
                    inputMode="decimal"
                    placeholder="0,00"
                    required
                  />
                </label>
                <label>
                  Tipo
                  <select name="type" defaultValue="EXPENSE">
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Receita</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Conta
                  <select name="accountId" defaultValue={accounts[0].id}>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Categoria
                  <select name="categoryId" defaultValue="">
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Data
                <input name="occurredAt" type="date" required />
              </label>
              <label>
                Observações <small>(opcional)</small>
                <textarea name="notes" rows={3} maxLength={500} />
              </label>
              <button className="primary-button">Salvar lançamento</button>
            </form>
          )}
        </section>
      </div>
      <section className="panel records-panel">
        <div className="panel-header">
          <div>
            <h3>Lançamentos recentes</h3>
            <p>{transactions.length} registro(s) encontrado(s)</p>
          </div>
        </div>
        <form method="get" className="filter-form">
          <select name="type" defaultValue={type ?? ""}><option value="">Todos os tipos</option><option value="INCOME">Receitas</option><option value="EXPENSE">Despesas</option></select>
          <select name="accountId" defaultValue={accountId ?? ""}><option value="">Todas as contas</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
          <select name="categoryId" defaultValue={categoryId ?? ""}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <label className="filter-date">De <input name="from" type="date" defaultValue={from ?? ""} /></label>
          <label className="filter-date">Até <input name="to" type="date" defaultValue={to ?? ""} /></label>
          <button className="filter-button" type="submit">Filtrar</button>
          {(type || accountId || categoryId || from || to) && <Link className="clear-filter" href="/lancamentos">Limpar</Link>}
        </form>
        {transactions.length === 0 ? (
          <p className="heading-copy">Ainda não há lançamentos.</p>
        ) : (
          <div className="records">
            {transactions.map((transaction) => (
              <div className="record" key={transaction.id}>
                <div>
                  <strong>{transaction.description}</strong>
                  <small>
                    {transaction.category?.name ?? "Sem categoria"} ·{" "}
                    {transaction.account.name}
                  </small>
                </div>
                <b
                  className={
                    transaction.type === "INCOME" ? "positive" : "negative"
                  }
                >
                  {transaction.type === "INCOME" ? "+" : "−"} R${" "}
                  {(transaction.cents / 100).toFixed(2).replace(".", ",")}
                </b>
                <Link
                  className="edit-button"
                  href={`/lancamentos/${transaction.id}`}
                >
                  Editar
                </Link>
                <DeleteTransactionButton id={transaction.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
