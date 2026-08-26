"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirect: false });
      if (result?.error) setError("E-mail ou senha inválidos.");
      else router.push("/");
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><div className="auth-brand"><span className="brand-mark">✳</span> nuvem<span>.</span></div><section className="auth-card"><p className="eyebrow">BEM-VINDA DE VOLTA</p><h1>Entre na sua conta</h1><p className="auth-copy">Acompanhe sua vida financeira com mais leveza.</p><form onSubmit={handleSubmit}><label>E-mail<input name="email" type="email" required autoComplete="email" /></label><label>Senha<input name="password" type="password" required autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button auth-submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button></form><p className="auth-footer">Ainda não tem uma conta? <Link href="/cadastro">Criar agora</Link></p></section></main>;
}
