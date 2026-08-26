# nuvem.

Aplicativo de controle financeiro pessoal em português. Permite acompanhar contas, categorias, receitas, despesas, lançamentos recorrentes e metas financeiras, com autenticação e isolamento dos dados por usuário.

## Stack

- Next.js 16 com App Router e React 19
- TypeScript, ESLint e Vitest
- Prisma ORM com SQLite
- NextAuth com login por credenciais e `bcryptjs`
- ExcelJS e PDFKit para exportações

## Requisitos

- Node.js 20 ou superior
- npm

## Configuração local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

3. Defina um segredo forte em `NEXTAUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

4. Crie ou atualize o banco e gere o cliente Prisma:

   ```bash
   npm run db:migrate
   npm run db:generate
   ```

5. Inicie o servidor:

   ```bash
   npm run dev
   ```

Abra [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `DATABASE_URL` | Caminho da base SQLite | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Segredo usado para assinar a sessão | valor aleatório longo |
| `NEXTAUTH_URL` | URL pública da aplicação | `http://localhost:3000` |

Não versione `.env` nem o banco local. Use `.env.example` como referência.

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run start        # inicia o build de produção
npm run lint         # ESLint
npm run typecheck    # verificação TypeScript
npm test             # suíte Vitest
npm run db:migrate   # aplica migrações Prisma
npm run db:generate  # gera o cliente Prisma
```

Teste um arquivo específico com:

```bash
npx vitest run --configLoader runner lib/validation.test.ts
```

## Estrutura principal

- `app/`: páginas, APIs e server actions
- `lib/`: autenticação, validações e regras do dashboard
- `prisma/`: schema e migrações do banco
- `components/`: componentes compartilhados

Valores monetários são armazenados como inteiros em centavos. Datas de formulários usam o parser compartilhado para evitar deslocamentos de fuso horário.

## Antes de publicar

Execute a validação completa:

```bash
npm test && npm run typecheck && npm run lint && npm run build
```
