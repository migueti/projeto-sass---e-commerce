"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main className="error-page" role="alert">
          <div className="error-content">
            <p className="eyebrow">NUVEM.</p>
            <h1>Algo não saiu como esperado.</h1>
            <p>Não foi possível carregar esta página agora.</p>
          </div>
        </main>
      </body>
    </html>
  );
}
