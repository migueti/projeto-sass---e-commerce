"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardData = {
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  monthlyFlow: Array<{
    month: string;
    incomeCents: number;
    expenseCents: number;
  }>;
  categories: Array<{
    id: string | null;
    name: string;
    color: string | null;
    cents: number;
    percent: number;
  }>;
  transactions: Array<{
    id: string;
    description: string;
    type: "INCOME" | "EXPENSE";
    cents: number;
    occurredAt: string;
    account: { name: string };
    category: { name: string } | null;
  }>;
  goals: Array<{
    id: string;
    name: string;
    savedCents: number;
    targetCents: number;
    progressPercent: number;
    deadline: string | null;
  }>;
  nextRecurrence: {
    description: string;
    cents: number;
    nextOccurrence: string;
  } | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

const navItems = [
  "Visão geral",
  "Lançamentos",
  "Contas",
  "Categorias",
  "Recorrências",
  "Metas",
];
const navIcons = ["◒", "↕", "▣", "◈", "↻", "◎"];

export default function Home() {
  const router = useRouter();
  const [period, setPeriod] = useState("Este mês");
  const [activeNav, setActiveNav] = useState("Visão geral");
  const [showBalance, setShowBalance] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [dashboardRetry, setDashboardRetry] = useState(0);
  const [userName, setUserName] = useState("Sua conta");
  const [sessionReady, setSessionReady] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);
  const periodParam =
    period === "Este ano"
      ? "year"
      : period === "Últimos 30 dias"
        ? "30days"
        : "month";

  const initials =
    userName === "Sua conta"
      ? "SC"
      : userName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch(`/api/dashboard?period=${periodParam}`, { signal: controller.signal })
      .then((response) => {
        if (response.status === 401 || response.redirected) {
          router.push("/login");
          return Promise.reject(new Error("unauthorized"));
        }
        if (response.status === 402) {
          router.push("/assinar");
          return Promise.reject(new Error("payment-required"));
        }
        return response.ok
          ? response.json()
          : Promise.reject(new Error("dashboard"));
      })
      .then((data: DashboardData) => {
        if (!active) return;
        setDashboard(data);
        setDashboardError(false);
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setDashboardError(true);
        }
      })
      .finally(() => {
        if (active) setDashboardLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [periodParam, router, dashboardRetry]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch("/api/me", { signal: controller.signal })
      .then((response) => {
        if (response.status === 401) {
          router.push("/login");
          return Promise.reject(new Error("profile"));
        }
        if (!response.ok) return Promise.reject(new Error("profile"));
        return response.json();
      })
      .then((profile: { name?: string | null }) => {
        if (active) {
          setUserName(profile.name?.trim() || "Sua conta");
          setProfileError(false);
        }
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError"))
          setProfileError(true);
      })
      .finally(() => {
        if (active) {
          setSessionReady(true);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [router, profileRetry]);

  if (!sessionReady) {
    return <main className="auth-page"><div className="auth-brand"><span className="brand-mark">✳</span> nuvem<span>.</span></div><p className="heading-copy">Carregando seu espaço financeiro...</p></main>;
  }

  if (profileError && !dashboard) {
    return <main className="auth-page"><div className="auth-brand"><span className="brand-mark">✳</span> nuvem<span>.</span></div><p className="form-error">Não foi possível carregar seu perfil.</p><button className="primary-button" onClick={() => { setSessionReady(false); setProfileError(false); setProfileRetry((value) => value + 1); }}>Tentar novamente</button></main>;
  }

  if (dashboardLoading && !dashboard) {
    return <main className="auth-page"><div className="auth-brand"><span className="brand-mark">✳</span> nuvem<span>.</span></div><p className="heading-copy">Carregando seu resumo financeiro...</p></main>;
  }

  if (dashboardError && !dashboard) {
    return <main className="auth-page"><div className="auth-brand"><span className="brand-mark">✳</span> nuvem<span>.</span></div><p className="form-error">Não foi possível carregar seu resumo financeiro.</p><button className="primary-button" onClick={() => { setDashboardLoading(true); setDashboardError(false); setDashboardRetry((value) => value + 1); }} disabled={dashboardLoading}>Tentar novamente</button></main>;
  }

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
        <nav className="nav-list">
          {navItems.map((item, index) =>
            item === "Lançamentos" ||
            item === "Contas" ||
            item === "Categorias" ||
            item === "Metas" ||
            item === "Recorrências" ? (
              <Link
                href={`/${item === "Lançamentos" ? "lancamentos" : item === "Contas" ? "contas" : item === "Categorias" ? "categorias" : item === "Metas" ? "metas" : "recorrencias"}`}
                className={`nav-item ${activeNav === item ? "active" : ""}`}
                key={item}
                onClick={() => setActiveNav(item)}
              >
                <span className="nav-icon">{navIcons[index]}</span>
                {item}
              </Link>
            ) : (
              <button
                className={`nav-item ${activeNav === item ? "active" : ""}`}
                key={item}
                onClick={() => setActiveNav(item)}
              >
                <span className="nav-icon">{navIcons[index]}</span>
                {item}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
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
            <button className="icon-button" aria-label="Notificações">
              ♧<i />
            </button>
            <div className="top-avatar">{initials}</div>
          </div>
        </header>
        <div className="content-wrap">
          {dashboardError && (
            <div className="panel" role="alert">
              <p className="form-error">Não foi possível atualizar o resumo financeiro.</p>
              <button className="primary-button" onClick={() => { setDashboardLoading(true); setDashboardError(false); setDashboardRetry((value) => value + 1); }} disabled={dashboardLoading}>
                {dashboardLoading ? "Atualizando..." : "Tentar novamente"}
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {new Intl.DateTimeFormat("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
                  .format(new Date())
                  .toUpperCase()}
              </p>
              <h1>
                <span className="rainbow-title">Bom dia, {userName.split(" ")[0]}</span> <span>✦</span>
              </h1>
              <p className="heading-copy">
                Aqui está o resumo da sua vida financeira.
              </p>
            </div>
            <div className="heading-actions">
              <a
                className="export-button"
                href={`/api/reports/export?format=xlsx&period=${periodParam}`}
              >
                ↓ Excel
              </a>
              <a
                className="export-button"
                href={`/api/reports/export?format=pdf&period=${periodParam}`}
              >
                ↓ PDF
              </a>
              <Link className="primary-button" href="/lancamentos">
                ＋ <span>Novo lançamento</span>
              </Link>
            </div>
          </div>

          <section className="balance-section">
            <div className="section-title">
              <div>
                <span className="label">SALDO TOTAL</span>
                <button
                  className="eye-button"
                  type="button"
                  aria-label={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
                  aria-pressed={!showBalance}
                  onClick={() => setShowBalance(!showBalance)}
                >
                  {showBalance ? "◉" : "◌"}
                </button>
                <h2>
                  {showBalance
                    ? formatCurrency((dashboard?.balanceCents ?? 0) / 100)
                    : "R$ •••••••"}
                </h2>
                <p className="positive">
                  Saldo atualizado <span>com seus lançamentos</span>
                </p>
              </div>
              <div className="period-picker">
                <span>Período</span>
                <select
                  value={period}
                  onChange={(event) => {
                    setDashboardLoading(true);
                    setDashboardError(false);
                    setPeriod(event.target.value);
                  }}
                >
                  <option>Este mês</option>
                  <option>Últimos 30 dias</option>
                  <option>Este ano</option>
                </select>
              </div>
            </div>
            <div className="stat-grid">
              <StatCard
                icon="↗"
                tone="green"
                label="Receitas"
                value={(dashboard?.incomeCents ?? 0) / 100}
                change="No período selecionado"
              />
              <StatCard
                icon="↘"
                tone="coral"
                label="Despesas"
                value={(dashboard?.expenseCents ?? 0) / 100}
                change="No período selecionado"
                negative
              />
              <StatCard
                icon="✦"
                tone="lilac"
                label="Disponível para gastar"
                value={(dashboard?.netCents ?? 0) / 100}
                change="Receitas menos despesas"
                accent
              />
            </div>
          </section>

          <div className="dashboard-grid">
            <CashFlow flow={dashboard?.monthlyFlow ?? []} />
            <CategoryBreakdown categories={dashboard?.categories ?? []} />
          </div>
          <div className="lower-grid">
            <Transactions items={dashboard?.transactions ?? []} />
            <Goals items={dashboard?.goals ?? []} />
          </div>
          <div className="recurring-strip">
            <div className="recurring-icon">↻</div>
            <div>
              <strong>Próxima conta recorrente</strong>
              <p>
                {dashboard?.nextRecurrence
                  ? `${dashboard.nextRecurrence.description} · ${new Intl.DateTimeFormat("pt-BR").format(new Date(dashboard.nextRecurrence.nextOccurrence))}`
                  : "Nenhuma conta programada"}
              </p>
            </div>
            <b>
              {dashboard?.nextRecurrence
                ? formatCurrency(dashboard.nextRecurrence.cents / 100)
                : "-"}
            </b>
            <Link className="text-button" href="/recorrencias">
              Ver recorrências <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  change,
  negative,
  accent,
}: {
  icon: string;
  tone: string;
  label: string;
  value: number;
  change: string;
  negative?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card ${accent ? "accent-card" : ""}`}>
      <div className="stat-heading">
        <span className={`stat-icon ${tone}`}>{icon}</span>
        <span>{label}</span>
        <b>⋮</b>
      </div>
      <strong>{formatCurrency(value)}</strong>
      <small className={negative ? "negative" : accent ? "" : "positive"}>
        {change}
      </small>
    </div>
  );
}

function CashFlow({ flow }: { flow: DashboardData["monthlyFlow"] }) {
  const maximumCents = Math.max(
    ...flow.flatMap((item) => [item.incomeCents, item.expenseCents]),
    1,
  );
  const yAxisValues = [1, 0.75, 0.5, 0.25, 0].map((percentage) => ({
    percentage,
    label: new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 0,
    }).format((maximumCents * percentage) / 100),
  }));
  const heightFor = (cents: number) =>
    cents === 0 ? 0 : Math.max(4, (cents / maximumCents) * 100);
  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(new Date(`${month}-01T12:00:00`))
      .replace(".", "");
  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <div>
          <h3>Fluxo de caixa</h3>
          <p>Receitas e despesas ao longo do tempo</p>
        </div>
        <div className="legend">
          <span>
            <i className="legend-income" />
            Receitas
          </span>
          <span>
            <i className="legend-expense" />
            Despesas
          </span>
        </div>
      </div>
      <div className="chart">
        <div className="y-labels">
          {yAxisValues.map((value) => <span key={value.percentage}>{value.label}</span>)}
        </div>
        <div className="chart-area">
          <div className="grid-lines">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div
            className="bars"
            role="img"
            aria-label="Gráfico de receitas e despesas no período selecionado"
          >
            {flow.map((item) => (
              <div className="bar-group" key={item.month}>
                <i className="income-bar" style={{ height: `${heightFor(item.incomeCents)}%` }} />
                <i className="expense-bar" style={{ height: `${heightFor(item.expenseCents)}%` }} />
              </div>
            ))}
          </div>
          <table className="chart-data">
            <caption>Valores mensais do fluxo de caixa</caption>
            <thead>
              <tr><th>Mês</th><th>Receitas</th><th>Despesas</th></tr>
            </thead>
            <tbody>
              {flow.map((item) => (
                <tr key={item.month}>
                  <th scope="row">{monthLabel(item.month)}</th>
                  <td>{formatCurrency(item.incomeCents / 100)}</td>
                  <td>{formatCurrency(item.expenseCents / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="x-labels">
            {flow.map((item) => <span key={item.month}>{monthLabel(item.month)}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryBreakdown({
  categories,
}: {
  categories: DashboardData["categories"];
}) {
  let stop = 0;
  const donutBackground = categories.length
    ? `conic-gradient(${categories
        .map((category) => {
          const start = stop;
          stop += category.percent;
          return `${category.color ?? "#b8a6ce"} ${start}% ${stop}%`;
        })
        .join(", ")})`
    : "#eef0ec";

  return (
    <section className="panel category-panel">
      <div className="panel-header">
        <div>
          <h3>Despesas por categoria</h3>
          <p>Onde seu dinheiro está indo</p>
        </div>
        <button className="dots" type="button" aria-label="Mais opções de categorias">•••</button>
      </div>
      <div className="donut-wrap">
        <div className="donut" style={{ background: donutBackground }}>
          <div>
            <strong>
              {formatCurrency(
                categories.reduce((sum, item) => sum + item.cents, 0) / 100,
              )}
            </strong>
            <span>total</span>
          </div>
        </div>
        <div className="category-list">
          {categories.length ? (
            categories.slice(0, 4).map((category) => (
              <span key={category.id ?? "uncategorized"}>
                <i
                  style={{ backgroundColor: category.color ?? "#b8a6ce" }}
                />
                {category.name} <b>{category.percent}%</b>
              </span>
            ))
          ) : (
            <span>Nenhuma despesa no período</span>
          )}
        </div>
      </div>
    </section>
  );
}

function Transactions({ items }: { items: DashboardData["transactions"] }) {
  return (
    <section className="panel transactions-panel">
      <div className="panel-header">
        <div>
          <h3>Últimos lançamentos</h3>
          <p>Suas movimentações mais recentes</p>
        </div>
        <Link className="text-button" href="/lancamentos">
          Ver todos <span>→</span>
        </Link>
      </div>
      <div className="transaction-list">
        {items.length ? (
          items.map((transaction) => (
            <div className="transaction" key={transaction.id}>
              <div
                className={`transaction-icon ${transaction.type === "INCOME" ? "income" : "expense"}`}
              >
                {transaction.type === "INCOME" ? "↗" : "↘"}
              </div>
              <div className="transaction-info">
                <strong>{transaction.description}</strong>
                <span>
                  {transaction.category?.name ?? "Sem categoria"} ·{" "}
                  {transaction.account.name}
                </span>
              </div>
              <b
                className={transaction.type === "INCOME" ? "income" : "expense"}
              >
                {transaction.type === "INCOME" ? "+" : "−"}
                {formatCurrency(transaction.cents / 100)}
              </b>
            </div>
          ))
        ) : (
          <p className="heading-copy">
            Ainda não há lançamentos neste período.
          </p>
        )}
      </div>
    </section>
  );
}

function Goals({ items }: { items: DashboardData["goals"] }) {
  return (
    <section className="panel goals-panel">
      <div className="panel-header">
        <div>
          <h3>Metas financeiras</h3>
          <p>Pequenos passos, grandes planos</p>
        </div>
        <a className="text-button" href="/metas">
          Ver metas <span>→</span>
        </a>
      </div>
      {items.length ? (
        items
          .slice(0, 2)
          .map((goal) => (
            <Goal
              key={goal.id}
              icon="◎"
              tone="travel"
              name={goal.name}
              value={`${formatCurrency(goal.savedCents / 100)} / ${formatCurrency(goal.targetCents / 100)}`}
              percent={`${goal.progressPercent}%`}
              note={
                goal.deadline
                  ? `até ${new Intl.DateTimeFormat("pt-BR").format(new Date(goal.deadline))}`
                  : "sem prazo"
              }
            />
          ))
      ) : (
        <p className="heading-copy">Crie sua primeira meta financeira.</p>
      )}
    </section>
  );
}

function Goal({
  icon,
  tone,
  name,
  value,
  percent,
  note,
}: {
  icon: string;
  tone: string;
  name: string;
  value: string;
  percent: string;
  note: string;
}) {
  return (
    <div className="goal">
      <div className={`goal-icon ${tone}`}>{icon}</div>
      <div className="goal-info">
        <div>
          <strong>{name}</strong>
          <span>{value}</span>
        </div>
        <div className="progress">
          <i
            className={tone === "home" ? "blue-progress" : ""}
            style={{ width: percent }}
          />
        </div>
        <small>
          {percent} concluído <b>{note}</b>
        </small>
      </div>
    </div>
  );
}
