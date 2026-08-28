# nuvem.

Aplicativo de controle financeiro pessoal em português, construído com Next.js App Router. Permite gerenciar contas, categorias, lançamentos, recorrências, metas financeiras, importação de extratos e exportação de relatórios.

O projeto também integra Mercado Pago para liberar o acesso pago e Pluggy para conectar instituições financeiras por Open Finance.

## Stack

- Next.js 16 e React 19
- TypeScript, ESLint e Vitest
- Prisma ORM com PostgreSQL em produção
- NextAuth Credentials com sessões JWT
- Zod para validação de entradas
- Mercado Pago Checkout Pro
- Pluggy Connect e `pluggy-js`
- ExcelJS, JSZip, PDFKit e `pdf-parse`

## Requisitos

- Node.js 20 ou superior
- npm

Bun também pode ser usado dentro do pacote independente `pluggy mcp/`.

## Desenvolvimento local
Para desenvolvimento local, você pode usar SQLite ou PostgreSQL. Para o deploy no Render, use PostgreSQL com uma URL externa persistente.
```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run dev
```

Abra <http://localhost:3000>. Se a porta estiver ocupada, use outra:

```bash
PORT=3001 npm run dev
```

O arquivo `.env` é carregado automaticamente pelo Next.js e não deve ser versionado.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Banco Prisma. Em produção: PostgreSQL (Render) |
| `NEXTAUTH_SECRET` | sim | Segredo forte para assinar sessões |
| `NEXTAUTH_URL` | sim | URL pública exata da aplicação |
| `APP_URL` | pagamentos | URL pública usada nos callbacks do Mercado Pago |
| `ADMIN_EMAIL` | sim | E-mail que recebe acesso administrativo |
| `MERCADOPAGO_ACCESS_TOKEN` | pagamentos | Token privado do Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | pagamentos | Segredo para validar webhook de pagamento |
| `MERCADOPAGO_USE_SANDBOX` | pagamentos | `true` para token `TEST-`, `false` para `APP_USR-` |
| `NUVEM_PLAN_PRICE` | não | Fallback inicial do preço em BRL |
| `PLUGGY_CLIENT_ID` | Open Finance | Client ID privado do painel Pluggy |
| `PLUGGY_CLIENT_SECRET` | Open Finance | Client Secret privado do painel Pluggy |
| `PLUGGY_API_BASE` | não | Padrão: `https://api.pluggy.ai` |
| `PLUGGY_WEBHOOK_URL` | não | URL HTTPS pública de `/api/webhooks/pluggy` |
| `SERVER_ACTION_ALLOWED_ORIGINS` | não | Hosts extras atrás de proxy, separados por vírgula |

Gere um segredo para o NextAuth com:

```bash
openssl rand -base64 32
```

Nunca coloque `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, tokens de pagamento ou qualquer API key no frontend, no Git ou neste README. Uma API key temporária da Pluggy deve ser considerada comprometida se for publicada e substituída no painel do provedor.

## Funcionalidades

### Finanças pessoais

- Dashboard com saldo inicial, receitas, despesas e filtros por período.
- Contas correntes, poupança e carteira.
- Categorias personalizadas.
- Lançamentos com valores persistidos em centavos.
- Datas civis `YYYY-MM-DD` sem deslocamento de fuso.
- Lançamentos recorrentes semanais, mensais e anuais.
- Metas financeiras e contribuições transacionais.
- Importação de extratos e exportação em XLSX/PDF/ZIP.

### Acesso pago

O cadastro cria a conta e categorias iniciais. O usuário sem acesso é enviado para `/assinar`. O Checkout Pro é criado no servidor e o acesso só é liberado após o webhook assinado do Mercado Pago confirmar pagamento aprovado.

Administradores são definidos pelo papel `ADMIN` ou por `ADMIN_EMAIL` e podem alterar o preço do plano em `/admin`.

### Pluggy Open Finance

O admin possui um Playground Pluggy em `/admin` para:

- listar instituições e status dos conectores;
- visualizar conectores sandbox;
- gerar Connect Token server-side;
- abrir o widget Pluggy Connect;
- testar o fluxo de consentimento bancário.

O endpoint `POST /api/connect-token` deriva `clientUserId` da sessão e nunca aceita credenciais do navegador. O webhook `POST /api/webhooks/pluggy` valida o formato do evento e responde rapidamente para `item/created`, `item/updated`, `item/error`, `transactions/created`, `transactions/updated` e `transactions/deleted`.

As credenciais reais devem ser configuradas no ambiente do servidor:

```env
PLUGGY_CLIENT_ID=seu-client-id-real
PLUGGY_CLIENT_SECRET=seu-client-secret-real
PLUGGY_API_BASE=https://api.pluggy.ai
PLUGGY_WEBHOOK_URL=https://seu-dominio.com/api/webhooks/pluggy
```

## Rotas principais

| Rota | Uso |
| --- | --- |
| `/` | Dashboard protegido |
| `/login` | Login |
| `/cadastro` | Cadastro |
| `/assinar` | Checkout e status do acesso |
| `/contas` | Contas e conexão Pluggy |
| `/categorias` | Categorias |
| `/lancamentos` | Lançamentos e importação |
| `/recorrencias` | Recorrências |
| `/metas` | Metas financeiras |
| `/admin` | Administração e Playground Pluggy |
| `/api/health` | Readiness público do app e banco |

## API e segurança

- Dados financeiros são sempre filtrados pelo usuário da sessão.
- Mutations usam Server Actions ou Route Handlers autenticados.
- Rotas administrativas exigem `requireAdminUser()`.
- Dados privados usam `Cache-Control: private, no-store, max-age=0`.
- Webhooks não expõem detalhes internos e usam `Cache-Control: no-store`.
- Valores monetários são inteiros em centavos, nunca decimais no banco.
- O health check retorna `200` com banco disponível e `503` sem detalhes internos quando o banco está indisponível.

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run start        # inicia o build de produção
npm test             # suíte Vitest
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run db:generate  # gera Prisma Client
npm run db:migrate   # migrações locais
npm run db:deploy    # migrações de produção/CI
npm run mcp:check    # verifica o servidor engenharia-local
```

Teste um arquivo específico:

```bash
npx vitest run --configLoader runner lib/validation.test.ts
```

Antes de publicar:

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

## MCP Pluggy independente

O servidor MCP fica isolado em [`pluggy mcp/`](pluggy%20mcp/). Ele oferece 18 tools para a API Pluggy, incluindo conectores, itens, contas, transações, identidades, investimentos e payment intents.

```bash
cd "pluggy mcp"
npm install
npm run typecheck
npm run build
npx --yes bun test
npm run start
```

O arquivo `.vscode/mcp.json` já contém as configurações de `engenharia-local`, `sequential-thinking`, `context7` e `pluggy`. As credenciais do MCP Pluggy são solicitadas por inputs secretos do VS Code.

## Deploy no Render

Configure as variáveis de ambiente no serviço Web e use:

- **Build Command:** `npm install && npm run db:generate && npm run db:deploy && npm run build`
- **Start Command:** `npm run start`

Use `NEXTAUTH_URL` e `APP_URL` com a URL pública HTTPS do Render. Para webhooks Pluggy, configure `PLUGGY_WEBHOOK_URL` com essa mesma URL e o caminho `/api/webhooks/pluggy`. Para produção, prefira PostgreSQL em vez de SQLite; o SQLite local é útil apenas para desenvolvimento e não persiste corretamente em instâncias efêmeras do Render.

## Dados locais e licença

Não versione `.env`, `prisma/dev.db`, arquivos auxiliares SQLite, tokens, hashes, sessões ou dados financeiros. A licença do aplicativo está em [`LICENSE`](LICENSE). O MCP Pluggy mantém os créditos e a licença MIT do trabalho base da CodeSpar; consulte [`pluggy mcp/LICENSE`](pluggy%20mcp/LICENSE).
