"use client";

import { useState } from "react";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("Não foi possível excluir.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <span className="delete-confirmation">
        <span>Excluir?</span>
        <button className="text-button" type="button" onClick={handleDelete} disabled={pending}>
          {pending ? "Excluindo..." : "Confirmar"}
        </button>
        <button className="cancel-button" type="button" onClick={() => setConfirming(false)} disabled={pending}>
          Cancelar
        </button>
        {error && <span className="form-error" role="alert">{error}</span>}
      </span>
    );
  }

  return <button className="delete-button" type="button" onClick={() => { setError(""); setConfirming(true); }} disabled={pending} aria-label="Excluir lançamento">×</button>;
}
