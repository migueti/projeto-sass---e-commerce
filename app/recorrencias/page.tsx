import { createRecurrence, deleteRecurrence, processRecurrence, toggleRecurrence } from "@/app/actions/recurrences";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
const frequencyLabel = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

export default async function RecurrencesPage() {
  const user = await requireUser();
  const [accounts, categories, recurrences] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId: user.id },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { nextOccurrence: "asc" },
    }),
  ]);

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">AUTOMAÇÃO</p>
          <h1>Contas recorrentes</h1>
          <p className="heading-copy">
            Nunca perca uma cobrança ou uma entrada importante.
          </p>
        </div>
      </div>
      <div className="crud-grid">
        <section className="panel">
          <h3>Nova recorrência</h3>
          {accounts.length === 0 ? (
            <p className="form-error">
              Crie uma conta antes de cadastrar uma recorrência.
            </p>
          ) : (
            <form action={createRecurrence} className="crud-form">
              <label>
                Descrição
                <input
                  name="description"
                  placeholder="Ex.: Internet"
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  Valor
                  <input
                    name="amount"
                    inputMode="decimal"
                    placeholder="119,90"
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
                  Frequência
                  <select name="frequency" defaultValue="MONTHLY">
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </label>
                <label>
                  Próxima data
                  <input name="nextOccurrence" type="date" required />
                </label>
              </div>
              <label>
                Finaliza em <small>(opcional)</small>
                <input name="endAt" type="date" />
              </label>
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
              <button className="primary-button">Cadastrar recorrência</button>
            </form>
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Suas recorrências</h3>
              <p>{recurrences.length} cobrança(s) programada(s)</p>
            </div>
          </div>
          <div className="records">
            {recurrences.length ? (
              recurrences.map((recurrence) => (
                <div className="record recurrence-record" key={recurrence.id}>
                  <div>
                    <strong>{recurrence.description}</strong>
                    <small>
                      {frequencyLabel[recurrence.frequency]} ·{" "}
                      {recurrence.category?.name ?? "Sem categoria"} ·{" "}
                      {recurrence.account.name}
                    </small>
                  </div>
                  <div className="recurrence-value">
                    <b
                      className={
                        recurrence.type === "INCOME" ? "positive" : "negative"
                      }
                    >
                      {recurrence.type === "INCOME" ? "+" : "−"}
                      {money(recurrence.cents)}
                    </b>
                    <small>
                      próxima:{" "}
                      {new Intl.DateTimeFormat("pt-BR").format(
                        recurrence.nextOccurrence,
                      )}
                    </small>
                  </div>
                  <div className="recurrence-actions">
                    <form action={toggleRecurrence.bind(null, recurrence.id)}><button className="text-button" type="submit">{recurrence.active ? "Pausar" : "Retomar"}</button></form>
                    <form action={deleteRecurrence.bind(null, recurrence.id)}><button className="delete-button" type="submit" aria-label={`Excluir ${recurrence.description}`}>×</button></form>
                  </div>
                  {recurrence.active && recurrence.nextOccurrence <= new Date() && (
                    <form action={processRecurrence.bind(null, recurrence.id)}>
                      <button className="text-button" type="submit">
                        Processar pendências
                      </button>
                    </form>
                  )}
                </div>
              ))
            ) : (
              <p className="heading-copy">Nenhuma recorrência cadastrada.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
