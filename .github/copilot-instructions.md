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

# Database commands
npm run db:migrate   # apply Prisma migrations
npm run db:generate  # regenerate Prisma client
```

Vitest uses the `runner` config loader; use it for any additional targeted file, for example `npx vitest run --configLoader runner path/to/file.test.ts`.

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
- The app is primarily Portuguese-language in route names and UI copy, so keep feature naming and validation messages aligned with the existing patterns.

## Relevant domain model summary

The main Prisma domain is:

- `User`: account owner; related to accounts, categories, transactions, recurring transactions, and goals
- `FinancialAccount`: wallet/account with `initialCents`
- `Category`: per-user category names, unique within a user
- `Transaction`: income/expense entry tied to an account and optional category
- `RecurringTransaction`: template for scheduled transactions with `WEEKLY`, `MONTHLY`, or `YEARLY` frequency
- `FinancialGoal`: target, saved amount, and status (`ACTIVE`, `COMPLETED`, `ARCHIVED`)

When working on features, follow the same ownership and validation patterns already used in `app/actions/transactions.ts` and related files. `AGENTS.md` contains the generated Next.js agent-rule notice; consult the version-specific guidance under `node_modules/next/dist/docs/` when present before changing framework behavior. `CLAUDE.md` and `GEMINI.md` contain overlapping project guidance and should remain consistent with this file.
