"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const checkPayment = async () => {
      try {
        const response = await fetch("/api/payments/status", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("status");
        const data: { hasPaid?: boolean } = await response.json();
        if (data.hasPaid) {
          router.replace("/");
          return;
        }
        if (active) setCheckingPayment(false);
      } catch (statusError) {
        if (active && !(statusError instanceof DOMException && statusError.name === "AbortError")) {
          setCheckingPayment(false);
        }
      }
    };

    void checkPayment();
    const timer = window.setInterval(() => void checkPayment(), 3000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [router]);

  async function startCheckout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/checkout", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível iniciar o pagamento.");
      if (data.alreadyPaid) router.push("/");
      else window.location.assign(data.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Não foi possível iniciar o pagamento.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand"><span className="brand-mark">✳</span> nuvem<span>.</span></div>
      <section className="auth-card">
        <p className="eyebrow">ACESSO AO NUVEM.</p>
        <h1>Seu espaço financeiro está pronto.</h1>
        <p className="auth-copy">Confirme o pagamento único para liberar dashboard, contas, lançamentos, metas e automações.</p>
        <div className="panel-header"><strong>Plano completo</strong><strong>R$ 29,90</strong></div>
        {error && <p className="form-error">{error}</p>}
        {checkingPayment && <p className="form-success" role="status">Confirmando seu pagamento...</p>}
        <button className="primary-button auth-submit" type="button" onClick={startCheckout} disabled={loading}>
          {loading ? "Abrindo checkout..." : "Pagar com Mercado Pago"}
        </button>
        <button className="text-button" type="button" onClick={() => signOut({ callbackUrl: "/login" })}>Sair da conta</button>
      </section>
    </main>
  );
}
