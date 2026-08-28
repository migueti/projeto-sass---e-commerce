"use client";

import { useState } from "react";

import { importTransactions } from "@/app/actions/transactions";
import type { ImportedStatementRow } from "@/lib/statement-import";

type Option = { id: string; name: string };

type StatementImportFormProps = {
  accounts: Option[];
};

function formatAmount(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function StatementImportForm({ accounts }: StatementImportFormProps) {
  const [rows, setRows] = useState<ImportedStatementRow[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function analyzeStatement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setRows([]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/statements/preview", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível analisar o extrato.");
      setRows(data.rows ?? []);
      if (!data.rows?.length) setMessage("Nenhum lançamento foi encontrado neste arquivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível analisar o extrato.");
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmImport() {
    if (!accountId || rows.length === 0) return;
    setMessage("");
    setIsSaving(true);
    try {
      const count = await importTransactions(rows, accountId);
      setRows([]);
      setMessage(`${count} lançamento(s) importado(s) com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar os lançamentos.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={analyzeStatement} className="crud-form">
        <label>
          Extrato bancário em PDF, DOCX ou XLSX
          <input
            name="file"
            type="file"
            accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={isLoading || isSaving}>
          {isLoading ? "Analisando..." : "Analisar extrato"}
        </button>
      </form>

      {message && <p className={rows.length ? "form-success" : "form-error"}>{message}</p>}

      {rows.length > 0 && (
        <section className="import-preview" aria-live="polite">
          <div className="panel-header">
            <div>
              <h3>Revisar importação</h3>
              <p>{rows.length} lançamento(s) encontrado(s)</p>
            </div>
          </div>
          <div className="form-row">
            <label>
              Conta
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
          </div>
          <div className="import-preview-list">
            {rows.map((row, index) => (
              <div className="record" key={`${row.date}-${row.description}-${row.cents}-${index}`}>
                <div>
                  <strong>{row.description}</strong>
                  <small>{row.date.split("-").reverse().join("/")}</small>
                </div>
                <b className={row.type === "INCOME" ? "positive" : "negative"}>
                  {row.type === "INCOME" ? "+" : "-"} {formatAmount(row.cents)}
                </b>
              </div>
            ))}
          </div>
          <button className="primary-button" type="button" onClick={confirmImport} disabled={!accountId || isSaving}>
            {isSaving ? "Salvando..." : `Confirmar ${rows.length} lançamento(s)`}
          </button>
        </section>
      )}
    </>
  );
}
