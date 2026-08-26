"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerUser } from "@/app/actions/auth";

type RegistrationState = { error?: string; success?: boolean };

export default function RegistrationPage() {
  const [state, action, pending] = useActionState<RegistrationState, FormData>(registerUser, {});

  return <main className="auth-page"><div className="auth-brand"><span className="brand-mark">✳</span> nuvem<span>.</span></div><section className="auth-card"><p className="eyebrow">COMECE SUA JORNADA</p><h1>Crie sua conta</h1><p className="auth-copy">Organize seu dinheiro sem complicação.</p><form action={action}><label>Nome<input name="name" type="text" required autoComplete="name" /></label><label>E-mail<input name="email" type="email" required autoComplete="email" /></label><label>Senha<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>{state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">Conta criada. Agora você já pode entrar.</p>}<button className="primary-button auth-submit" disabled={pending}>{pending ? "Criando..." : "Criar conta"}</button></form><p className="auth-footer">Já tem uma conta? <Link href="/login">Entrar</Link></p></section></main>;
}
