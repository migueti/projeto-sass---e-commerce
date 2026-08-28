import Link from "next/link";

import { StatementImportForm } from "@/components/statement-import-form";
import { requirePaidUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ImportStatementPage() {
  const user = await requirePaidUser();
  const accounts = await prisma.financialAccount.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">IMPORTAÇÃO INTELIGENTE</p>
          <h1>Importar extrato</h1>
          <p className="heading-copy">Envie o PDF e revise os lançamentos encontrados antes de adicionar qualquer dado.</p>
        </div>
      </div>
      <section className="panel">
        {accounts.length === 0 ? (
          <p className="form-error">Crie uma conta antes de importar lançamentos.</p>
        ) : (
          <StatementImportForm accounts={accounts} />
        )}
        <p className="heading-copy">A análise cria apenas uma prévia. Nenhum lançamento é salvo automaticamente.</p>
        <Link className="text-button" href="/lancamentos">Voltar para lançamentos</Link>
      </section>
    </main>
  );
}