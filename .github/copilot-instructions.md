# Copilot instructions for this repository

## Project overview

This repository is a Next.js 16.3.3 App Router application for a Portuguese-language personal finance tracker branded `nuvem.`. The app is centered around authenticated users managing accounts, categories, transactions, recurring transactions, and financial goals. The core flow is:

- App pages and feature screens live under `app/`: public auth pages are in `app/(auth)/login` and `app/(auth)/cadastro`; private screens include `/`, `/contas`, `/lancamentos`, `/categorias`, `/metas`, and `/recorrencias`
- Server actions for mutations live under `app/actions/` and are the main entry point for create/update/delete operations
- API handlers live under `app/api/` for dashboard data, the current-user profile, PDF/XLSX exports, NextAuth, and per-transaction deletion
- Prisma models in `prisma/schema.prisma` drive the SQLite database and are the source of truth for domain behavior
- Shared auth, validation, and business logic live in `lib/`

## Build, test, and lint commands

Run commands from the repository root:

```bash
npm run dev          # start the Next.js development server
npm run build        # production build
npm run start        # run the production server after build
npm run lint         # ESLint
npm run typecheck    # TypeScript compile check
npm test             # run the full Vitest suite

# Single-file test examples
npx vitest run --configLoader runner lib/validation.test.ts
npx vitest run --configLoader runner lib/dashboard.test.ts
npx vitest run --configLoader runner lib/recurrence.test.ts
npx vitest run --configLoader runner app/api/reports/export/route.test.ts

# Database commands
npm run db:migrate   # apply Prisma migrations
  npm run db:deploy    # apply migrations in production/CI
npm run db:generate  # regenerate Prisma client
```

Vitest uses the `runner` config loader; use it for any additional targeted file, for example `npx vitest run --configLoader runner path/to/file.test.ts`.
CI runs `npm ci`, Prisma generation/migrations, tests, typecheck, lint, and build
with Node.js 20. Keep `package-lock.json` versioned.

## Architecture notes

- `app/actions/*.ts` contains the write-side logic. These server actions validate input, enforce user ownership, mutate Prisma, and then call `revalidatePath(...)` for the relevant pages.
- `app/api/*` is reserved for route handlers and export endpoints, not for the main domain logic.
- `auth.ts` configures NextAuth with Credential login and the Prisma adapter; `lib/auth.ts` exposes `requireUser()` for server-side authorization checks.
- `proxy.ts` uses NextAuth middleware to protect private routes by default; new private folders under `app/` are protected unless explicitly allowed in the matcher.
- `lib/prisma.ts` is the shared Prisma client singleton.
- `lib/validation.ts` contains the project-specific parsing helpers used across forms and server actions:
  - `parseBrazilianCents(value)` converts BRL strings like `R$ 1.234,56` to integer cents
  - `parseLocalDate(value)` validates and normalizes `YYYY-MM-DD` values without timezone drift
- Business logic around dashboard filters and summaries is centralized in `lib/dashboard.ts` and `lib/dashboard-summary.ts`.
- The dashboard page (`app/page.tsx`) is a client component that fetches `/api/dashboard` and `/api/me`; keep Prisma queries and aggregation on the server.
- `proxy.ts` protects routes by default with NextAuth middleware, leaving only login, registration, NextAuth, and static assets public. Protected API handlers still call `requireUser()` themselves.
- `requirePaidUser()` enforces the subscription gate and redirects unpaid page
  requests to `/assinar`. Mercado Pago checkout/status/plan routes and the signed
  `/api/payments/webhook` complete the payment flow.
- `/admin` is restricted by the persisted `ADMIN` role or normalized
  `ADMIN_EMAIL`; plan pricing is stored in `AppSettings` as integer cents.

## Key repository conventions

- Money is stored as integer cents, never as floating-point numbers.
- All user-facing values should be parsed with Zod schemas and the shared helpers in `lib/validation.ts` before writing to the database.
- Every mutation should check the authenticated user and enforce ownership on related records (`where: { userId: user.id }`).
- Validate referenced accounts and categories against the same authenticated `userId`; never trust client-provided relation IDs.
- After creating or updating data, revalidate the affected routes with `revalidatePath(...)` to keep the UI state fresh.
- Transaction changes refresh `/`, `/lancamentos`, and `/contas`; category changes also refresh `/categorias` and dependent transaction/recurrence pages; recurrence and goal changes refresh their page and `/`.
- Use Prisma relations and user-scoped queries consistently; the schema is designed around User -> FinancialAccount/Category/Transaction/RecurringTransaction/FinancialGoal ownership.
- Use the `@/*` import alias. Keep Prisma, authentication, and export-library code out of client components.
- Dynamic route handler contexts use promise-based params in this Next.js version (`params: Promise<{ id: string }>`); await `context.params`.
- Recurrence processing must remain transactional and concurrency-safe: claim the current `nextOccurrence` before creating generated transactions, enforce the overdue-occurrence cap, and deactivate at `endAt`.
- Dashboard and export endpoints should use `parseDashboardFilters` and `getDashboardDateRange` so period, account, and category filtering stays consistent.
- Goal contributions are linked `Transaction` rows with `goalId`. Update the
  goal balance and contribution row together in a transaction; ordinary
  transaction editing/deletion must not bypass those rules.
- Dashboard balance combines account opening balances, transactions before the
  selected period, and the selected period's income minus expenses. When
  diagnosing regressions, preserve the historical `occurredAt: { lt: start }`
  constraint.
- API handlers should return explicit status codes for authentication,
  validation, payment-required, and row-limit errors. Unexpected failures use
  the existing Sentry integration without exposing provider or credential data.
- The app is primarily Portuguese-language in route names and UI copy, so keep feature naming and validation messages aligned with the existing patterns.

## Fork and deployment safeguards

- A fresh fork must create its own `.env` from `.env.example`; generate a unique `NEXTAUTH_SECRET` and set `NEXTAUTH_URL` to the real domain for that environment.
- `DATABASE_URL="file:./dev.db"` resolves to `prisma/dev.db`. Run `npm run db:migrate` locally and `npm run db:deploy` in production or CI, then run `npm run db:generate`.
- Never commit or share `.env`, `prisma/dev.db`, SQLite journal files, password hashes, sessions, or financial data. The repository intentionally has no seed and each fork starts with an empty database.
- SQLite production deployments require persistent storage and backups. If the platform has an ephemeral filesystem, configure an external compatible database instead of relying on a local file.
- When diagnosing dashboard regressions, validate the database and API data before changing CSS. The dashboard request path is `app/page.tsx` -> `/api/dashboard` -> `lib/dashboard.ts` -> `lib/dashboard-summary.ts`.
- The total balance must include initial balance, historical transactions before the selected period, and the selected period's income minus expenses. Keep the historical query constrained with `occurredAt: { lt: start }`.
- Logout must remain same-origin in hosted environments; avoid callback URLs that resolve to local `NEXTAUTH_URL` when the app is accessed through a public preview domain.
- Keep `package-lock.json` versioned. The GitHub Actions workflow runs `npm ci`, tests, typecheck, lint, and build.
- Mercado Pago credentials, webhook secrets, `.env`, SQLite files, password
  hashes, sessions, and financial data must never be committed or shared.
- The static `docs/` page can run on GitHub Pages, but authentication, SQLite,
  payments, and webhooks require the Next.js backend. Set `APP_URL` in
  `docs/script.js` to that backend's public URL before publishing.

## Relevant domain model summary

The main Prisma domain is:

- `User`: account owner; related to accounts, categories, transactions, recurring transactions, and goals
- `FinancialAccount`: wallet/account with `initialCents`
- `Category`: per-user category names, unique within a user
- `Transaction`: income/expense entry tied to an account and optional category
- `RecurringTransaction`: template for scheduled transactions with `WEEKLY`, `MONTHLY`, or `YEARLY` frequency
- `FinancialGoal`: target, saved amount, and status (`ACTIVE`, `COMPLETED`, `ARCHIVED`)

When working on features, follow the same ownership and validation patterns already used in `app/actions/transactions.ts` and related files. `AGENTS.md` contains the generated Next.js agent-rule notice; consult the version-specific guidance under `node_modules/next/dist/docs/` when present before changing framework behavior. `CLAUDE.md` and `GEMINI.md` contain overlapping project guidance and should remain consistent with this file.
