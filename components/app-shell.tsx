"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Visão geral", href: "/", icon: "◒" },
  { label: "Lançamentos", href: "/lancamentos", icon: "↕" },
  { label: "Contas", href: "/contas", icon: "▣" },
  { label: "Categorias", href: "/categorias", icon: "◈" },
  { label: "Recorrências", href: "/recorrencias", icon: "↻" },
  { label: "Metas", href: "/metas", icon: "◎" },
  { label: "Diagnóstico", href: "/diagnostico", icon: "⌕" },
] as const;

const publicPaths = ["/login", "/cadastro"];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Sua conta");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isPublicPath(pathname)) return;

    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("profile"))))
      .then((profile: { name?: string | null; isAdmin?: boolean }) => {
        setUserName(profile.name?.trim() || "Sua conta");
        setIsAdmin(profile.isAdmin === true);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [pathname]);

  if (isPublicPath(pathname)) return children;

  const initials =
    userName === "Sua conta"
      ? "SC"
      : userName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">✳</span>
          <span>
            nuvem<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="workspace-label">MEU ESPAÇO</div>
        <nav className="nav-list" aria-label="Navegação principal">
          {navItems.filter((item) => item.href !== "/diagnostico" || isAdmin).map((item) => (
            <Link
              href={item.href}
              className={`nav-item ${isActivePath(pathname, item.href) ? "active" : ""}`}
              key={item.href}
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            type="button"
            onClick={async () => {
              await signOut({ redirect: false });
              router.replace("/login");
            }}
          >
            <span className="nav-icon">↪</span>Sair
          </button>
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div>
              <strong>{userName}</strong>
              <small>Plano gratuito</small>
            </div>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            ✳ nuvem<span>.</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notificações">
              ♧<i />
            </button>
            <div className="top-avatar">{initials}</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
