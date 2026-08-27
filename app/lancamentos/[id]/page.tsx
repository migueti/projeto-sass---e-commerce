import Link from "next/link";

import { updateTransaction } from "@/app/actions/transactions";
import { requirePaidUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePaidUser();
  const { id } = await params;
  const [transaction, accounts, categories] = await Promise.all([
    prisma.transaction.findFirst({ where: { id, userId: user.id } }),
    prisma.financialAccount.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!transaction) return <main className="content-wrap"><section className="panel"><h1>Lançamento não encontrado</h1><Link className="text-button" href="/lancamentos">Voltar para lançamentos →</Link></section></main>;
  if (transaction.goalId) return <main className="content-wrap"><section className="panel"><h1>Aporte de meta</h1><p className="heading-copy">Aportes de metas não podem ser editados.</p><Link className="text-button" href="/metas">Voltar para metas →</Link></section></main>;

  const update = updateTransaction.bind(null, transaction.id);
  const date = transaction.occurredAt.toISOString().slice(0, 10);
  const amount = (transaction.cents / 100).toFixed(2).replace(".", ",");

  return <main className="content-wrap"><div className="page-heading"><div><p className="eyebrow">MOVIMENTAÇÕES</p><h1>Editar lançamento</h1><p className="heading-copy">Atualize os dados desta movimentação.</p></div></div><section className="panel edit-panel"><form action={update} className="crud-form"><label>Descrição<input name="description" defaultValue={transaction.description} required /></label><div className="form-row"><label>Valor<input name="amount" defaultValue={amount} inputMode="decimal" required /></label><label>Tipo<select name="type" defaultValue={transaction.type}><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option></select></label></div><div className="form-row"><label>Conta<select name="accountId" defaultValue={transaction.accountId}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Categoria<select name="categoryId" defaultValue={transaction.categoryId ?? ""}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><label>Data<input name="occurredAt" type="date" defaultValue={date} required /></label><label>Observações <small>(opcional)</small><textarea name="notes" rows={3} maxLength={500} defaultValue={transaction.notes ?? ""} /></label><div className="form-actions"><Link className="cancel-button" href="/lancamentos">Cancelar</Link><button className="primary-button">Salvar alterações</button></div></form></section></main>;
}
