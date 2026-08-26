import { addGoalContribution, createGoal, deleteGoal } from "@/app/actions/goals";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

export default async function GoalsPage() {
  const user = await requireUser();
  const [goals, accounts] = await Promise.all([
    prisma.financialGoal.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { deadline: "asc" }],
    }),
    prisma.financialAccount.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PLANEJAMENTO</p>
          <h1>Metas financeiras</h1>
          <p className="heading-copy">
            Transforme seus planos em próximos passos possíveis.
          </p>
        </div>
      </div>
      <div className="crud-grid">
        <section className="panel">
          <h3>Nova meta</h3>
          <form action={createGoal} className="crud-form">
            <label>
              Nome
              <input
                name="name"
                placeholder="Ex.: Reserva de emergência"
                required
              />
            </label>
            <div className="form-row">
              <label>
                Valor alvo
                <input
                  name="target"
                  inputMode="decimal"
                  placeholder="18.000,00"
                  required
                />
              </label>
              <label>
                Já guardado
                <input name="saved" inputMode="decimal" placeholder="0,00" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Prazo
                <input name="deadline" type="date" />
              </label>
              <label>
                Conta
                <select name="accountId" defaultValue="">
                  <option value="">Sem conta vinculada</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="primary-button">Criar meta</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Suas metas</h3>
              <p>{goals.length} meta(s) cadastrada(s)</p>
            </div>
          </div>
          <div className="records">
            {goals.length ? (
              goals.map((goal) => {
                const progress = goal.targetCents
                  ? Math.min(
                      100,
                      Math.round((goal.savedCents / goal.targetCents) * 100),
                    )
                  : 0;
                return (
                  <div className="goal-record" key={goal.id}>
                    <div className="record">
                      <div>
                        <strong>{goal.name}</strong>
                        <small>
                          {formatCurrency(goal.savedCents)} de{" "}
                          {formatCurrency(goal.targetCents)}
                        </small>
                      </div>
                      <b className="positive">{progress}%</b>
                    </div>
                    <div className="progress">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <small className="goal-date">
                      {goal.deadline
                        ? `Prazo: ${new Intl.DateTimeFormat("pt-BR").format(goal.deadline)}`
                        : "Sem prazo definido"}
                    </small>
                    {goal.status === "ACTIVE" && (
                      <form action={addGoalContribution.bind(null, goal.id)} className="goal-contribution">
                        <input name="amount" inputMode="decimal" placeholder="Aporte: 100,00" aria-label={`Valor do aporte para ${goal.name}`} required />
                        <button className="text-button" type="submit">Adicionar aporte</button>
                      </form>
                    )}
                    <form action={deleteGoal.bind(null, goal.id)}>
                      <button className="delete-button" type="submit" aria-label={`Excluir meta ${goal.name}`}>×</button>
                    </form>
                  </div>
                );
              })
            ) : (
              <p className="heading-copy">Crie sua primeira meta financeira.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
