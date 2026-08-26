"use client";

import { useState } from "react";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Excluir este lançamento? Essa ação não pode ser desfeita.")) return;
    setPending(true);
    const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!response.ok) window.alert("Não foi possível excluir o lançamento.");
    else window.location.reload();
    setPending(false);
  }

  return <button className="delete-button" type="button" onClick={handleDelete} disabled={pending} aria-label="Excluir lançamento">{pending ? "..." : "×"}</button>;
}
