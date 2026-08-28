# Copilot instructions for this repository

## Project overview

This repository is a Next.js 16.3.3 App Router app for `nuvem.`, a Portuguese-language personal finance tracker. It is centered on per-user financial data: accounts, categories, transactions, recurring transactions, goals, and subscription gating.

The codebase is organized around the same pattern as the app itself:

- `app/` holds the user-facing pages, server actions, and route handlers.
- `app/actions/*.ts` is the write side: validate, enforce `userId` ownership, mutate Prisma, then call `revalidatePath(...)`.
- `app/api/*` is mostly read/query and export endpoints; keep business logic out of route handlers when the same logic already lives in `lib/`.
- `lib/` contains shared auth, validation, and dashboard logic that is reused across pages and APIs.
- `prisma/schema.prisma` is the source of truth for the data model; SQLite is the default local database.

## Build, test, and lint commands

Run from the repository root:

```bash
npm run dev          # start the Next.js development server
npm run build        # production build
npm run start        # run the production build
npm run lint         # ESLint
npm run typecheck    # TypeScript compile check
npm test             # full Vitest suite

# Database
npm run db:migrate   # create or apply Prisma migrations locally
npm run db:deploy    # apply migrations in CI/production
npm run db:generate  # regenerate Prisma client

# Single test example
npx vitest run --configLoader runner lib/validation.test.ts
```

Use the `runner` loader for any targeted Vitest run, for example:

```bash
npx vitest run --configLoader runner lib/dashboard.test.ts
npx vitest run --configLoader runner app/api/reports/export/route.test.ts
```

CI runs `npm ci`, Prisma generation, migrations, tests, typecheck, lint, and build on Node.js 20. Keep `package-lock.json` versioned.

## High-level architecture

Focus on these paths before making changes:

- `app/page.tsx` and `app/api/dashboard` for dashboard behavior.
- `app/actions/transactions.ts`, `app/actions/categories.ts`, `app/actions/recurrences.ts`, and `app/actions/goals.ts` for write-side patterns.
- `auth.ts` and `proxy.ts` for authentication and route protection.
- `lib/auth.ts` for `requireUser()` and related server authorization helpers.
- `lib/validation.ts` for the project’s Zod and BRL/date parsing helpers.
- `lib/dashboard.ts` and `lib/dashboard-summary.ts` for dashboard filters and totals.
- `prisma/schema.prisma` for the domain model and ownership rules.

This app is deliberately user-scoped. The domain is centered on `User -> FinancialAccount/Category/Transaction/RecurringTransaction/FinancialGoal`, and most mutations must validate the logged-in user and enforce `where: { userId: user.id }` before writing.

## Key repository conventions

- Money is stored in integer cents, never as floating-point numbers.
- Form inputs and API payloads should be sanitized with the shared Zod schemas and parsing helpers in `lib/validation.ts` before writing to the database.
- `parseBrazilianCents()` handles values like `R$ 1.234,56` and returns integer cents; `parseLocalDate()` normalizes `YYYY-MM-DD` without timezone drift.
- Server actions are the normal place for create/update/delete logic; do not put core mutation logic directly in client components.
- Every mutation should check the authenticated user and ensure related records belong to that user before updating/deleting them.
- Revalidate the affected route(s) after state changes with `revalidatePath(...)`.
- Protect private app routes with the NextAuth middleware in `proxy.ts`; public routes are limited to login, cadastro, NextAuth endpoints, and static assets.
- `app/api/*` routes should return explicit status codes for auth, validation, payment-required, and row-limit failures; unexpected failures should still integrate with Sentry without exposing secrets or provider internals.
- Dashboard and export code should reuse the shared filter/range helpers instead of duplicating date logic.
- Recurring transactions, goal contributions, and financial totals are sensitive business logic; follow the existing transaction patterns and ownership checks rather than introducing custom shortcuts.
- The product UI and route names are Portuguese; keep validation messages and new feature names consistent with the existing app language.

## Engineering workflow and delivery discipline

- Start from a concrete failure, bug, route, or behavior; do not open broad refactors before understanding the call path.
- Keep the change set small and tied to a single objective: fix, feature, audit, or documentation update.
- For business logic, validate the data contract first: user ownership, account/category validation, date parsing, money in cents, and revalidation after mutation.
- Prefer targeted validation: specific Vitest file, route reproduction, or a focused typecheck; only escalate to the full suite when the change affects shared behavior.
- When a fix changes data semantics, add or update test coverage in the closest relevant file rather than only patching the UI.
- Capture the decision context in a short note when the change affects architecture, auth, billing, or dashboard correctness.

## Recommended next engineering passes

These are the highest-value follow-ups in this codebase today:

- Audit the billing and payment flow end-to-end: webhook validation, signed payload verification, user upgrade state, and admin pricing safeguards.
- Harden the recurrence engine with transaction-safe generation rules, overdue caps, and predictable `nextOccurrence` behavior under concurrency.
- Re-check dashboard correctness against the `occurredAt: { lt: start }` historical rule and ensure totals remain consistent across accounts, categories, and date filters.
- Expand the tests around validation and financial calculations to cover edge cases without relying on UI-only confidence.
- Review route and permission boundaries around admin-only access and paid-user gating to keep features protected by the same server-side rules used elsewhere.

## Session documentation and knowledge capture

- Record what was inspected, the decision taken, the validation command executed, and the next recommended follow-up.
- Keep that record in a session note for future agent resumes or manual handoff.
- If an external knowledge base like Obsidian is available, synchronize the note there. If not, save the same note in the local session state and mention the limitation in the final summary.
- This repository already has project-level AI instructions; keep follow-up notes aligned with those documents instead of inventing a separate process.

## Local setup and environment

- Start from `.env.example` and generate a unique `NEXTAUTH_SECRET` before running the app.
- Local SQLite lives in `prisma/dev.db` and is configured via `DATABASE_URL="file:./dev.db"`.
- In production or CI, run `npm run db:deploy` before starting the app and then `npm run db:generate` when needed.
- The app expects `NEXTAUTH_URL`, `APP_URL`, and Mercado Pago credentials for checkout/webhook flows.
- Do not commit `.env`, SQLite database files, password hashes, sessions, or financial data.

## Key domain rules to preserve

- `Transaction.cents` and `FinancialAccount.initialCents` are integers in cents.
- Goal contributions are stored as linked transactions with `goalId`, and the goal balance and contribution row should be updated together in one transaction.
- Recurrence processing must remain transactional and concurrency-safe: claim the current occurrence before creating generated entries, cap overdue generations, and deactivate at `endAt`.
- Dashboard totals must include opening balances plus historical transactions before the selected period and the selected period’s net result, while preserving the historical `occurredAt: { lt: start }` constraint.
- Payment-required routes are gated by the paid-user flow and the signed `/api/payments/webhook` endpoint; do not bypass the subscription checks.

## Useful files to read first

- `README.md` for local setup and deployment notes
- `package.json` for the actual scripts used by this project
- `prisma/schema.prisma` for the entity model and relationships
- `proxy.ts` and `auth.ts` for route/user protection
- `lib/validation.ts` for input parsing rules
- `lib/dashboard.ts` and `lib/dashboard-summary.ts` for date/filter calculations
- `app/actions/*.ts` for how mutations are implemented in this codebase

This repo already includes a strong set of project-specific instructions in `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `.github/AGENTES-COORDENACAO.md`; keep changes consistent with those documents and the README rather than introducing unrelated patterns.
