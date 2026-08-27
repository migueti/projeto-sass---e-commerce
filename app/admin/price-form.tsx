"use client";

import { useActionState } from "react";

import { updatePlanPrice, type AdminPriceState } from "@/app/actions/admin";

export function PriceForm({ price }: { price: string }) {
  const [state, action, pending] = useActionState<AdminPriceState, FormData>(updatePlanPrice, {});

  return (
    <form action={action} className="crud-form">
      <label>
        Preço do acesso
        <input name="price" inputMode="decimal" defaultValue={price} required />
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">Preço atualizado com sucesso.</p>}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar preço"}
      </button>
    </form>
  );
}
