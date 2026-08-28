import Link from "next/link";

import { requirePaidUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImportStatementPage() {
  await requirePaidUser();

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
        <form action="/api/statements/preview" method="post" encType="multipart/form-data" className="crud-form">
          <label>
            Extrato bancário em PDF, DOCX ou XLSX
            <input name="file" type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" required />
          </label>
          <button className="primary-button" type="submit">Analisar extrato</button>
        </form>
        <p className="heading-copy">A análise cria apenas uma prévia. Nenhum lançamento é salvo automaticamente.</p>
        <Link className="text-button" href="/lancamentos">Voltar para lançamentos</Link>
      </section>
    </main>
  );
}