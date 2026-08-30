# nuvem.

Aplicação de controle financeiro pessoal em português, construída com Next.js App Router e Prisma. O sistema permite registrar contas, categorias, transações, recorrências, metas, importar extratos e acompanhar o saldo por período com autenticação e cobrança por assinatura.

## Visão geral

A aplicação foi estruturada como um produto financeiro full-stack com:

- autenticação por credenciais usando NextAuth
- proteção de rotas e acesso por sessão
- painel financeiro com resumo de saldo, receitas, despesas e metas
- módulos de contas, categorias, lançamentos e recorrências
- assinatura paga com Mercado Pago
- integração com Open Finance via Pluggy
- exportação de relatórios em Excel/PDF

## Stack

- Next.js 16
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL como banco recomendado em produção
- NextAuth com Credentials + JWT
- Zod para validação
- Mercado Pago Checkout Pro
- Pluggy Connect
- Vitest para testes
- ESLint para lint

## Requisitos

- Node.js 20+
- npm
- Docker e Docker Compose (para desenvolvimento local com PostgreSQL)

## Começando (Desenvolvimento Local)

### Opção 1: Setup Automático (Recomendado)

Execute o script de setup para inicializar tudo automaticamente:

```bash
bash scripts/setup.sh
```

Este script irá:
- Instalar dependências Node.js
- Iniciar PostgreSQL com Docker Compose
- Aplicar migrações do Prisma
- Gerar Prisma Client

Após o setup, inicie o servidor:

```bash
npm run dev
# ou use o script
bash scripts/dev.sh
```

### Opção 2: Setup Manual

1. Configure o ambiente:

```bash
cp .env.example .env
```

2. Instale as dependências:

```bash
npm install
```

3. Inicie o banco de dados:

```bash
docker-compose up -d
```

4. Aplique as migrações:

```bash
npm run db:migrate
```

5. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação fica disponível em **http://localhost:3000**.

### Parar o Banco de Dados

```bash
docker-compose down
```

### Limpar Dados e Reiniciar

```bash
docker-compose down -v  # Remove volume de dados
docker-compose up -d    # Inicia novamente
npm run db:migrate      # Reaplica migrações
```

## Variáveis de ambiente

O arquivo [.env.example](.env.example) contém as variáveis principais. As mais relevantes são:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nuvem?schema=public"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
APP_URL=""
ADMIN_EMAIL="admin@example.com"

MERCADOPAGO_ACCESS_TOKEN=""
MERCADOPAGO_WEBHOOK_SECRET=""
MERCADOPAGO_USE_SANDBOX="true"
NUVEM_PLAN_PRICE="29.90"

PLUGGY_CLIENT_ID=""
PLUGGY_CLIENT_SECRET=""
PLUGGY_API_BASE="https://api.pluggy.ai"
PLUGGY_WEBHOOK_URL="https://your-app.onrender.com/api/webhooks/pluggy"
PLUGGY_AVOID_DUPLICATES="true"
NEXT_PUBLIC_PLUGGY_INCLUDE_SANDBOX="false"
```

Dicas:

- nunca versionar o arquivo `.env` real
- `NEXTAUTH_SECRET` deve ser gerado com valor forte
- `APP_URL` e `NEXTAUTH_URL` devem apontar para a URL pública real em produção
- credenciais do Mercado Pago e Pluggy devem permanecer apenas no ambiente do servidor

Para gerar um secret do NextAuth:

```bash
openssl rand -base64 32
```

## Funcionalidades principais

### Financeiro

- dashboard com saldo, receitas, despesas e fluxo por período
- contas com saldos iniciais e tipo de conta
- categorias personalizadas
- transações com valores persistidos em centavos
- recorrências mensais, semanais e anuais
- metas financeiras com contribuições e progresso
- importação de extrato
- exportação de relatórios em Excel/PDF

### Acesso pago

O fluxo de assinatura é controlado pelo status `hasPaid` do usuário:

- usuários sem acesso são redirecionados para `/assinar`
- checkout é gerado no backend via Mercado Pago
- o acesso é liberado somente após a confirmação do webhook
- administradores podem gerenciar preço do plano e acessos

### Pluggy Open Finance

A integração Pluggy permite:

- criar token de conexão no servidor
- abrir o widget de consentimento bancário
- sincronizar contas e transações vinculadas ao usuário
- validar ownership e evitar duplicação de itens originados do provedor

## Estrutura principal

```text
app/                # páginas, rotas e handlers do App Router
components/         # componentes reutilizáveis da UI
lib/                # regras de negócio, validação, dashboard e integrações
prisma/             # schema e migrações do Prisma
public/             # assets públicos
proxy.ts            # regras de proteção de rotas por middleware
auth.ts             # configuração do NextAuth
package.json        # scripts e dependências
```

## Rotas relevantes

- `/` — dashboard principal
- `/login` — autenticação
- `/cadastro` — cadastro de usuário
- `/assinar` — página de assinatura
- `/contas` — contas financeiras
- `/categorias` — categorias
- `/lancamentos` — lançamentos e importação
- `/recorrencias` — recorrências
- `/metas` — metas financeiras
- `/admin` — painel administrativo
- `/api/health` — health check público
- `/api/payments/webhook` — webhook do Mercado Pago
- `/api/webhooks/pluggy` — webhook do Pluggy

## Scripts disponíveis

```bash
npm run dev            # inicia o app em desenvolvimento
npm run build          # build de produção
npm run start          # inicia a build de produção
npm test              # executa a suíte Vitest
npm run typecheck     # valida TypeScript
npm run lint          # executa ESLint
npm run db:generate   # gera o Prisma Client
npm run db:migrate    # aplica migrações locais
npm run db:deploy     # aplica migrações em ambiente de deploy
npm run mcp:check     # valida servidor MCP local
```

Para rodar um teste específico:

```bash
npx vitest run --configLoader runner lib/validation.test.ts
```

Antes de publicar, a validação recomendada é:

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

## Segurança e boas práticas

- os dados financeiros são filtrados pelo usuário da sessão
- acessos administrativos exigem papel/identidade válida
- valores monetários são armazenados em centavos (`Int`)
- entradas de formulário e API são validadas com Zod
- webhooks e rotas sensíveis não expõem detalhes internos
- não versionar arquivos de ambiente, tokens, sessão ou dados financeiros

## Deploy

Para uso em produção, o projeto recomenda PostgreSQL em vez de SQLite. O build e start típicos em deploys baseados em Node são:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run build
npm run start
```

Em plataformas como Render, configure as variáveis de ambiente do serviço web e use a URL pública HTTPS correta para:

- `NEXTAUTH_URL`
- `APP_URL`
- `PLUGGY_WEBHOOK_URL`

## Licença

Consulte o arquivo [LICENSE](LICENSE).
