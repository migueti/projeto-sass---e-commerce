# Project Instructions (GEMINI.md)

This file serves as the core reference and instruction manual for the project's architecture, technologies, commands, and development conventions.

---

## 1. Project Overview

The **projeto-sass---e-commerce** is a Next.js-based SaaS Personal Finance Tracker application. It allows users to register, log in, configure multiple financial accounts, create transaction categories, manage income and expense transactions, set up recurring transactions, and define financial goals.

### Main Technologies
*   **Framework:** Next.js 16.3.3 (App Router)
*   **Runtime / Language:** Node.js & TypeScript
*   **Frontend UI:** React 19.2.8, styled with Tailwind CSS v4 and PostCSS
*   **Database & ORM:** SQLite with Prisma ORM
*   **Authentication:** NextAuth.js (v4.24.15) with Prisma Adapter and Credentials Provider (using `bcryptjs` for secure password hashing)
*   **Data Validation:** Zod (v4)
*   **File Exporting Utilities:** `pdfkit` (for PDF report generation), `exceljs` (for Excel exporting)
*   **Testing Framework:** Vitest (v4)

---

## 2. Architecture & Directory Structure

```
/workspaces/projeto-sass---e-commerce
├── app/                              # Next.js App Router Pages & Actions
│   ├── (auth)/                       # Auth Route Group
│   │   ├── cadastro/                 # User registration page
│   │   └── login/                    # Login page
│   ├── actions/                      # Next.js Server Actions
│   │   ├── auth.ts                   # Auth actions (signup, etc.)
│   │   ├── categories.ts             # Category management actions
│   │   ├── goals.ts                  # Financial goal actions
│   │   ├── recurrences.ts            # Recurring transaction actions
│   │   └── transactions.ts           # Financial account & transaction actions
│   ├── api/                          # Route Handlers / API Endpoints
│   │   ├── auth/                     # NextAuth configuration & setup
│   │   ├── dashboard/                # Dashboard query API
│   │   ├── me/                       # Current logged-in user details
│   │   ├── reports/export/           # Excel and PDF exporter API
│   │   └── transactions/[id]/        # Individual transaction details API
│   ├── contas/                       # User financial accounts view
│   ├── categorias/                   # Categories management view
│   ├── lancamentos/                  # Transactions view and detail view
│   ├── metas/                        # Financial goals view
│   └── recorrencias/                 # Recurring transactions view
├── components/                       # Reusable Frontend Components
├── lib/                              # Shared utility files & modules
│   ├── auth.ts                       # Server session retrieval (`requireUser`)
│   ├── prisma.ts                     # Single Prisma client database connection
│   ├── validation.ts                 # Form validation schemas (Zod) and parse helpers
│   ├── dashboard.ts                  # Filter handling and date range calculations
│   ├── dashboard-summary.ts          # Logic to aggregate and summarize financial data
│   ├── validation.test.ts            # Unit tests for validation & parser logic
│   └── dashboard.test.ts             # Unit tests for dashboard filters & summaries
├── prisma/                           # Database Schema and Migrations
│   ├── schema.prisma                 # Prisma models definition
│   └── migrations/                   # SQLite auto-generated migrations
├── auth.ts                           # NextAuth config and Credentials validation
└── proxy.ts                          # NextAuth Middleware protecting private routes
```

---

## 3. Database Schema & Models

All database models are defined in `prisma/schema.prisma`. Below is a summary of the domain models:

*   **User:** Contains primary user attributes, including `passwordHash` (Credentials-based). Relates to accounts, sessions, categories, wallets (FinancialAccounts), transactions, recurrences, and goals.
*   **Category:** Represents a transaction category (e.g., "Alimentação", "Transporte"). Uniquely identified per user by name.
*   **FinancialAccount:** Represents a wallet or checking/savings account (e.g., "Conta principal"). Initial balance is saved in `initialCents`.
*   **Transaction:** A discrete income or expense entry. Refers to a `FinancialAccount` and optionally a `Category`.
*   **RecurringTransaction:** A transaction template that runs on a configured frequency (`WEEKLY`, `MONTHLY`, `YEARLY`).
*   **FinancialGoal:** A goal tracker containing `targetCents`, `savedCents`, a target `deadline`, and a `status` (`ACTIVE`, `COMPLETED`, `ARCHIVED`).

---

## 4. Building, Running, and Testing

All scripts are configured in `package.json` and must be executed in the project root directory:

### Development & Build Commands
*   **Start Development Server:**
    ```bash
    npm run dev
    ```
*   **Build Production Application:**
    ```bash
    npm run build
    ```
*   **Start Production Server (after building):**
    ```bash
    npm run start
    ```

### Database Management Commands
*   **Run SQLite Migrations:**
    ```bash
    npm run db:migrate
    ```
*   **Regenerate Prisma Client:**
    ```bash
    npm run db:generate
    ```

### Code Quality & Testing Commands
*   **Run Test Suite (Vitest):**
    ```bash
    npm run test
    ```
*   **Typecheck (TypeScript Compiler):**
    ```bash
    npm run typecheck
    ```
*   **Linting (ESLint):**
    ```bash
    npm run lint
    ```

---

## 5. Key Development Conventions

To maintain consistency and avoid bugs across the codebase, adhere strictly to these conventions:

### Financial Value Representation
*   **Always represent money in cents** (using integers) to prevent IEEE-754 floating-point errors (e.g., `100` cents = `1.00` BRL).
*   Use the `parseBrazilianCents(value: string): number | null` helper from `@/lib/validation` to sanitize and safely convert BRL currency strings (e.g., `R$ 1.234,56` to `123456`).

### Date and Input Parsing
*   Use the `parseLocalDate(value: string): Date | null` helper to safely parse `YYYY-MM-DD` date inputs into localized `Date` objects at noon to avoid timezone shift bugs.
*   Validate all forms and API payloads using **Zod schemas** configured in `lib/validation.ts`.

### State Mutation & Actions
*   Use Next.js Server Actions (defined inside `app/actions/`) to handle form submissions and database writes (creations, deletions, updates).
*   Secure all Server Actions and protected API routes by checking user authorization via `requireUser()` in `@/lib/auth`.
*   Call `revalidatePath("/")` and any relevant page paths (e.g., `/lancamentos`, `/contas`) after state changes to ensure cache freshness.

### Route Protection
*   Route authorization is enforced by the NextAuth middleware located in `proxy.ts` (root of the workspace).
*   Any newly created private folder inside `/app` is protected by default unless explicitly excluded in the middleware `matcher` regex (such as `/login`, `/cadastro`, `/api/auth`, etc.).

### Quality Assurance & Testing
*   Ensure that any new utilities, formatting helpers, or critical calculations are accompanied by corresponding `.test.ts` files.
*   Always run the validation suite (`npm run lint && npm run typecheck && npm run test`) before pushing changes to ensure full coverage and correctness.
