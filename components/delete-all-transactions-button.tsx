"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteAllTransactions } from "@/app/actions/transactions";

function getDeleteErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "GOAL_CONTRIBUTION_INVALID")
    return "Não foi possível recalcular uma meta. Nenhum lançamento foi excluído.";
  if (error instanceof Error && error.message === "GOAL_CONTRIBUTION_CONFLICT")
    return "Uma meta foi alterada durante a exclusão. Atualize a página e tente novamente.";
  return "Não foi possível excluir os lançamentos.";
}

export function DeleteAllTransactionsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleDelete() {
    if (!window.confirm("Excluir todas as receitas e despesas? Esta ação não pode ser desfeita.")) return;
    setMessage("");
    startTransition(async () => {
      try {
        const count = await deleteAllTransactions();
        setMessage(`${count} lançamento(s) excluído(s).`);
        router.refresh();
      } catch (error) {
        setMessage(getDeleteErrorMessage(error));
      }
    });
  }

  return (
    <div>
      <button className="outline-button danger-button" type="button" onClick={handleDelete} disabled={isPending}>
        {isPending ? "Excluindo..." : "Excluir todos"}
      </button>
      {message && <p className="heading-copy">{message}</p>}
    </div>
  );
}