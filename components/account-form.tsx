"use client";

import { useActionState } from "react";

import { createAccount, type AccountActionState } from "@/app/actions/transactions";

const initialState: AccountActionState = { message: "" };

export function AccountForm() {
  const [state, formAction, pending] = useActionState(createAccount, initialState);

  return (
    <form action={formAction} className="crud-form">
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
      {state.message && <p role="status" aria-live="polite">{state.message}</p>}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar conta"}
      </button>
    </form>
  );
}