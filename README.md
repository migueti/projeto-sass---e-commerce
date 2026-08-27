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

   O SQLite local será criado em `prisma/dev.db`. Cada fork começa com um banco
   vazio: crie uma conta pela tela de cadastro. Não copie bancos de outros
   usuários.

5. Inicie o servidor:

   ```bash
   npm run dev
   ```

Abra [http://localhost:3000](http://localhost:3000).

## Página estática no GitHub Pages

O diretório `docs/` contém uma página HTML/CSS/JavaScript independente para
publicação gratuita no GitHub Pages. Antes de publicar, altere `APP_URL` em
`docs/script.js` para a URL pública onde o backend Next.js estiver hospedado.

No GitHub, abra **Settings > Pages**, escolha **Deploy from a branch**, selecione
a branch `main` e a pasta `/docs`. O endereço gratuito será semelhante a
`https://seu-usuario.github.io/nome-do-repositorio/`.

Essa página é apenas a apresentação estática. O login, banco de dados, checkout
Mercado Pago e webhook continuam precisando do servidor Next.js; GitHub Pages
não executa essas funções de backend.

Se a porta `3000` já estiver em uso, inicie o Next.js em outra porta:

```bash
PORT=3001 npm run dev
```

O Next.js tenta escolher a próxima porta disponível quando nenhuma porta é
definida explicitamente. Ao definir `PORT` ou usar `-p`, a porta informada precisa
estar livre.

Se aparecer `Another next dev server is already running`, reutilize a URL e o
servidor indicados na mensagem. Para reiniciar, encerre somente o PID exibido:

```bash
kill <PID>
```

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `DATABASE_URL` | Caminho da base SQLite | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Segredo usado para assinar a sessão | valor aleatório longo |
| `NEXTAUTH_URL` | URL pública da aplicação | `http://localhost:3000` |
| `MERCADOPAGO_ACCESS_TOKEN` | Token privado da API do Mercado Pago | valor do painel Mercado Pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | Segredo para validar a assinatura dos webhooks | segredo configurado no Mercado Pago |
| `MERCADOPAGO_USE_SANDBOX` | Usa o `sandbox_init_point` no Checkout Pro | `true` em testes |
| `NUVEM_PLAN_PRICE` | Fallback inicial legado; o preço oficial é alterado em `/admin` | `29.90` |
| `ADMIN_EMAIL` | E-mail que recebe o papel administrativo no cadastro | `admin@example.com` |
| `SERVER_ACTION_ALLOWED_ORIGINS` | Hostnames adicionais aceitos por Server Actions atrás de proxy, separados por vírgula | `app.example.com,preview.example.com` |
| `SENTRY_DSN` | DSN do Sentry para servidor e Edge | valor fornecido pelo Sentry |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN público do Sentry para o navegador | valor fornecido pelo Sentry |

Não versione `.env` nem o banco local. Use `.env.example` como referência.

## MCP do Obsidian

O workspace já inclui o servidor `obsidian` em `.vscode/mcp.json`. Para ativá-lo:

1. Instale e ative o plugin Obsidian MCP Server no Obsidian.
2. Confirme a porta configurada, normalmente `27123`.
3. Ao iniciar o servidor MCP no VS Code, informe o token pelo prompt protegido.
4. Recarregue os servidores MCP para conectar em `http://localhost:27123/mcp`.

O token não deve ser salvo no repositório nem enviado pelo chat. Se a autenticação
estiver desativada no plugin para desenvolvimento local, remova o header
`Authorization` da configuração do servidor.

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run start        # inicia o build de produção
npm run lint         # ESLint
npm run typecheck    # verificação TypeScript
npm test             # suíte Vitest
npm run db:migrate   # aplica migrações Prisma
npm run db:deploy    # aplica migrações em produção/CI
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

## Pagamento para liberar o acesso

Após o cadastro e login, o usuário é direcionado para `/assinar`. O checkout é
criado no servidor com o SDK oficial do Mercado Pago. O acesso só é liberado
quando o webhook assinado consulta um pagamento aprovado, confere o valor e
marca o usuário como pago no banco. Configure uma URL pública HTTPS para
`/api/payments/webhook`; o retorno visual do Checkout Pro não confirma pagamento.

O administrador acessa `/admin` e altera o preço do plano. O valor é salvo no
banco em centavos e usado nas novas preferências de pagamento. Defina
`ADMIN_EMAIL` antes do primeiro cadastro administrativo; uma conta existente
com esse e-mail também é reconhecida como admin. Nunca crie credenciais admin
fixas no código.

## Ambiente e deploy

Antes de publicar, configure as variáveis de ambiente na plataforma:

- `DATABASE_URL`: caminho do banco ou URL de um banco compatível.
- `NEXTAUTH_SECRET`: segredo longo, aleatório e exclusivo do ambiente.
- `NEXTAUTH_URL`: URL pública exata da aplicação, nunca `localhost` em produção.

Execute `npm run db:deploy` no ambiente de produção antes de iniciar a aplicação.
Depois, execute `npm run build` e `npm run start`, ou use os comandos equivalentes
da plataforma escolhida.

O projeto usa SQLite. Em um deploy público, o arquivo precisa ficar em um volume
persistente com backup; plataformas com filesystem efêmero podem perder o banco
após um novo deploy. Para produção sem volume persistente, use um banco externo
compatível e atualize `DATABASE_URL`.

## Segurança dos dados locais

`.env`, `prisma/dev.db` e os arquivos auxiliares do SQLite são ignorados pelo Git.
Eles podem conter segredos, hashes de senha, sessões e dados financeiros. Nunca
envie esses arquivos ao repositório ou para outro usuário. O banco original não é
necessário para instalar ou executar o projeto.

## Diagnóstico rápido

- Se o dashboard mostrar `R$ 0,00`, confirme que você está conectado ao usuário
   correto e que existem conta e lançamentos no banco desse ambiente.
- Se o layout aparecer sem cards ou gráficos, confirme que `app/globals.css`
   está sendo carregado e reinicie o servidor de desenvolvimento.
- Se o logout abrir `localhost`, corrija `NEXTAUTH_URL` para o domínio atual e
   faça um novo deploy.
- Após mudanças no código, atualize a página publicada com recarga forçada e
   verifique os logs do servidor.

## CI

O workflow em `.github/workflows/ci.yml` executa instalação reproduzível, testes,
typecheck, lint e build em cada push e pull request. Um fork deve manter o
`package-lock.json` versionado para que o `npm ci` seja determinístico.

## Antes de publicar

Execute a validação completa:

```bash
npm test && npm run typecheck && npm run lint && npm run build
```
