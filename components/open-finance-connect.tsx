"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((module) => module.PluggyConnect),
  { ssr: false },
);

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
      includeSandbox={process.env.NEXT_PUBLIC_PLUGGY_INCLUDE_SANDBOX === "true"}
      onSuccess={() => undefined}
      onError={(error) => setError(error.message || "Não foi possível concluir a conexão bancária.")}
      onLoadError={() => setError("Não foi possível carregar a conexão bancária.")}
    />
  );
}