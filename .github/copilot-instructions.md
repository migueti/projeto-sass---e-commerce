# Copilot instructions for this repository

## Project overview

`nuvem.` is a Portuguese-language personal finance tracker built with Next.js
16 App Router and React 19. Users manage accounts, categories, transactions,
recurring transactions and financial goals. All financial data is user-scoped;
paid access and an admin pricing area are part of the application.

## Build, test, and lint commands

Run from the repository root. Node.js 20+ and npm are required.

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:generate
npm run dev
```

```bash
npm test             # full Vitest suite
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run build        # production build
npm run start        # serve the production build
npm run mcp:check    # check the local MCP server
npm run db:migrate   # local Prisma migrations
npm run db:deploy    # CI/production Prisma migrations
npm run db:generate  # generate Prisma Client
```

Run one test file with the repository's required loader:

```bash
npx vitest run --configLoader runner lib/validation.test.ts
npx vitest run --configLoader runner app/api/payments/routes.test.ts
```

The CI workflow in `.github/workflows/ci.yml` runs `npm ci`, Prisma generation
and migrations, tests, typecheck, lint, and build on Node.js 20. Keep
`package-lock.json` versioned.

## High-level architecture

- `app/` contains App Router pages, Server Actions, and Route Handlers.
  `components/` contains shared UI.
- `app/actions/` is the write side: authenticate, validate input, verify
  ownership of related records, mutate Prisma, and revalidate affected routes.
- `app/api/` handles reads, exports, checkout, and the payment webhook. Reuse
  business rules from `lib/` instead of duplicating them in handlers. Return
  explicit statuses for authentication, validation, payment-required, and row
  limit failures.
- `lib/domain/financial/` contains financial entities and value objects;
  `lib/application/` coordinates use cases; `lib/infrastructure/` implements
  Prisma repositories. Other `lib/` modules provide auth, billing, dashboard,
  recurrence, import, pagination, and revalidation helpers.
- `prisma/schema.prisma` is the data-model source of truth. Local SQLite uses
  `DATABASE_URL=file:./dev.db`; migrations are in `prisma/migrations/`.
- `auth.ts` configures NextAuth Credentials with JWT sessions. `proxy.ts`
  protects routes by default, with only login, registration, NextAuth, static
  assets, and the payment webhook public.

## Key conventions

- Persist money only as integer cents (`Int`). Parse BRL form values with
  `parseBrazilianCents()` from `lib/validation.ts`; never persist decimal
  currency values.
- Parse civil `YYYY-MM-DD` form dates with `parseLocalDate()` to avoid timezone
  drift. Validate form and API payloads with the shared Zod schemas before
  database access.
- Every user-data query and mutation must derive identity from the session via
  `requireUser()`, `requirePaidUser()`, or `requireAdminUser()`. Include
  `userId` in queries for the target record and every related account,
  category, transaction, or goal; client-supplied IDs are not sufficient.
- Use Server Actions for mutations. Use Prisma transactions when multiple
  entities change together, especially goal contributions. Call
  `revalidatePaths()` or `revalidatePath()` only after a successful mutation.
- Dashboard balance is initial account balance plus transactions before the
  selected period plus the selected period's net result. Preserve the
  historical `occurredAt: { lt: start }` rule, shared period/account/category
  filters, and the 10,000-row limit.
- Recurrence generation must be idempotent and concurrency-safe: claim the
  current occurrence before creating entries, retry Prisma `P2034` conflicts,
  cap overdue generations, preserve month-end scheduling, and deactivate at
  `endAt`.
- Paid routes must enforce access on the server. Checkout does not grant
  access: `/api/payments/webhook` validates the signature, fetches the provider
  payment, checks the reference and amount, and only then sets `User.hasPaid`.
  Do not expose provider internals or secrets; unexpected failures should be
  handled with the route's generic error response.
- The plan price is stored in `AppSettings.planPriceCents`. Admin access comes
  from the `ADMIN` role or configured `ADMIN_EMAIL`; never hard-code admin
  credentials.
- Keep new route names, labels, and validation messages in Portuguese. Do not
  commit `.env`, `prisma/dev.db`, SQLite sidecar files, password hashes,
  sessions, or financial data.

## Environment and deployment

Use `.env.example` for `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
`APP_URL`, Mercado Pago credentials, and `ADMIN_EMAIL`. In
production, run `npm run db:deploy` before starting the app. SQLite requires a
persistent volume and backups; otherwise configure a compatible external
database through `DATABASE_URL`.

The workspace includes local `engenharia-local`, Sequential Thinking, and
Context7 MCP servers in `.vscode/mcp.json`. Protected tokens must be entered
through VS Code prompts and never committed.

## Engineering workflow

For code reviews, debugging, refactors, security, authorization, concurrency,
validation, or other engineering changes, coordinate the available MCPs before
editing: use `engenharia-local` to inspect and validate the repository, use
Context7 for current framework/library documentation, and use
`sequential-thinking` to test hypotheses and review tradeoffs. If a required server is disabled, stop and request reactivation
rather than inventing results. Start from a
concrete file, symbol, test, error, or reproducible behavior, make the smallest
change that addresses it, and run the most specific validation immediately
afterward.

## Files to read first

For changes to the corresponding flows, start with `README.md`,
`prisma/schema.prisma`, `lib/validation.ts`, `lib/auth.ts`, `lib/dashboard.ts`,
`lib/dashboard-summary.ts`, the relevant `app/actions/*.ts`, `auth.ts`, and
`proxy.ts`. Consult `.github/AGENTES-COORDENACAO.md` when multiple sessions work
in the same repository.
