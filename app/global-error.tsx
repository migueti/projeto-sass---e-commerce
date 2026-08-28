"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Erro global não tratado na aplicação", error);
  }, [error]);

  return (
    <html lang="pt-BR" data-theme="light">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const stored = localStorage.getItem("nuvem-theme");
              if (stored === "dark" || stored === "light") document.documentElement.dataset.theme = stored;
            `,
          }}
        />
      </head>
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
