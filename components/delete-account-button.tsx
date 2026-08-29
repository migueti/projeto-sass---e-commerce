"use client";

type DeleteAccountAction = (formData: FormData) => void | Promise<void>;

type DeleteAccountButtonProps = {
  action: DeleteAccountAction;
  accountName: string;
};

export function DeleteAccountButton({ action, accountName }: DeleteAccountButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Tem certeza que deseja excluir a conta "${accountName}"? Essa ação remove os lançamentos e recorrências relacionados.`)) {
          event.preventDefault();
        }
      }}
    >
      <button className="delete-button" type="submit" aria-label={`Excluir conta ${accountName}`}>
        ×
      </button>
    </form>
  );
}
