"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Erro não tratado na aplicação", error);
  }, [error]);

  return (
    <main className="error-page" role="alert">
      <div className="error-content">
        <p className="eyebrow">NUVEM.</p>
        <h1>Algo não saiu como esperado.</h1>
        <p>Não foi possível carregar esta página agora.</p>
        <button className="primary-button" type="button" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
