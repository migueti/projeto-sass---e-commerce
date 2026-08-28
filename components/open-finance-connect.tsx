"use client";

import { PluggyConnect } from "react-pluggy-connect";
import { useEffect, useState } from "react";

export function OpenFinanceConnect() {
  const [connectToken, setConnectToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/connect-token", { method: "POST", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { accessToken?: string; error?: string };
        if (!response.ok || !data.accessToken) throw new Error(data.error ?? "Não foi possível iniciar a conexão.");
        setConnectToken(data.accessToken);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setError(reason instanceof Error ? reason.message : "Não foi possível iniciar a conexão.");
      });
    return () => controller.abort();
  }, []);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!connectToken) return <p className="form-success" role="status">Preparando conexão segura...</p>;

  return (
    <PluggyConnect
      connectToken={connectToken}
      includeSandbox={process.env.NODE_ENV !== "production"}
      onSuccess={() => undefined}
      onError={() => setError("Não foi possível concluir a conexão bancária.")}
      onLoadError={() => setError("Não foi possível carregar a conexão bancária.")}
    />
  );
}