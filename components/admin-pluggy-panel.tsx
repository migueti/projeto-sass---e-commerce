"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((module) => module.PluggyConnect),
  { ssr: false },
);

type Connector = {
  id: number;
  name: string;
  type: string;
  country: string;
  isSandbox: boolean;
  health: string;
  supportsPaymentInitiation: boolean;
};

export function AdminPluggyPanel() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/pluggy/connectors", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { connectors?: Connector[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as instituições.");
        setConnectors(data.connectors ?? []);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setError(reason instanceof Error ? reason.message : "Não foi possível carregar as instituições.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function openConnection() {
    setError("");
    const response = await fetch("/api/connect-token", { method: "POST", cache: "no-store" });
    const data = await response.json() as { accessToken?: string; error?: string };
    if (!response.ok || !data.accessToken) {
      setError(data.error ?? "Não foi possível iniciar a conexão.");
      return;
    }
    setToken(data.accessToken);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Playground Pluggy</h3>
          <p>Teste instituições, sandbox e o fluxo Open Finance.</p>
        </div>
        <button className="outline-button" type="button" onClick={openConnection} disabled={!connectors.length}>
          Conectar instituição
        </button>
      </div>
      {loading && <p className="form-success" role="status">Carregando instituições...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && <p className="heading-copy">{connectors.length} instituição(ões) disponível(is).</p>}
      {token && (
        <PluggyConnect
          connectToken={token}
          includeSandbox={process.env.NODE_ENV !== "production"}
          onSuccess={() => setToken("")}
          onError={(error) => setError(error.message || "Não foi possível concluir a conexão.")}
          onLoadError={() => setError("Não foi possível carregar o Pluggy Connect.")}
        />
      )}
    </section>
  );
}