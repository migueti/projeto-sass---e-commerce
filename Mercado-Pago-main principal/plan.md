# Plano de continuidade - Nucleo Mercado Pago

## Contexto

Este repositorio e o **nucleo reutilizavel** de integracao Mercado Pago/Pix/MCP. Ele nao e o SaaS final. No futuro, sera criado outro repositorio de SaaS e este nucleo sera copiado ou consumido por ele.

Nao adicionar aqui login de clientes, tenants, painel administrativo, planos SaaS ou billing do SaaS. O foco deste repositorio e ficar tecnicamente completo, seguro, testavel e facil de reutilizar.

Pais inicial: Brasil (`MLB`). Meio de pagamento inicial: Pix via Orders API.

## Estado atual

Implementado:

- MCP local em TypeScript/Node.js com transporte `stdio`.
- Busca e leitura online de paginas oficiais do Mercado Pago Brasil.
- Cliente HTTP para API Mercado Pago.
- Consulta de pagamentos e Orders pelo MCP.
- Criacao de preferencia Checkout Pro pelo MCP, protegida por confirmacao, idempotencia e modo somente leitura.
- Tela local Pix em `src/pix-server.ts`.
- Criacao de Order Pix via `POST /v1/orders`.
- `processing_mode: automatic`.
- `payment_method.id: pix` e `payment_method.type: bank_transfer`.
- Exibicao de `qr_code_base64`, `qr_code`, `ticket_url` e status.
- Polling do status da Order e animacao de pagamento aprovado.
- Carregamento automatico de `.env` com `dotenv/config`.
- Bloqueio de criacao web quando `MERCADOPAGO_READ_ONLY=true`.
- SQLite local em `src/database.ts`.
- Persistencia de Orders, pagamentos, idempotency keys e webhook events.
- Repeticao com a mesma idempotency key retorna a resposta salva.
- Reuso da chave com payload diferente retorna conflito.
- Validacao inicial de `x-signature` usando HMAC SHA-256.
- Deduplicacao inicial de webhooks.
- 12 testes passando no ultimo estado validado.

## Commits e rollback

Commits importantes:

- `9fcff60` - ultima versao validada; corrige idempotency key do formulario e separa inicializacao do servidor para os testes.
- `4450c1e` - adiciona SQLite, persistencia e idempotencia local.
- `daba200` - aplica read-only tambem ao endpoint web Pix.
- `bc8a634` - checkpoint antigo de recuperacao, criado pelo autor para voltar caso algo desse errado.

O autor pediu que cada fase seja commitada diretamente na branch `main` com mensagem descritiva.

Antes de qualquer rollback, verificar `git status` e nunca apagar alteracoes feitas pelo autor.

## Regras de seguranca

- Nunca imprimir, copiar ou incluir Access Token, segredo de webhook, QR Code ou dados pessoais em commits, logs ou README.
- O arquivo `.env` esta no `.gitignore`. Manter apenas placeholders em `.env.example`.
- As credenciais que apareceram na conversa foram expostas. O autor deve revogar e rotacionar o Access Token e `MERCADOPAGO_WEBHOOK_SECRET` antes de qualquer teste financeiro.
- Nunca usar token de producao para testes de criacao de pagamento.
- `MERCADOPAGO_READ_ONLY=true` deve ser o padrao.
- Produzir respostas publicas minimas. Nao devolver payload bruto do Mercado Pago quando nao for necessario.
- Nao inventar endpoints, campos, estados ou regras que nao estejam na documentacao oficial.
- Para documentacao, usar somente fontes oficiais do Mercado Pago Brasil e informar a URL especifica.
- Se um link oficial retornar 404, informar indisponibilidade; nao reconstruir conteudo.

## Proxima sequencia de implementacao

### Fase 3 - Webhook robusto

1. Manter a funcao de verificacao de assinatura pura e testavel.
2. Validar estritamente `x-signature`, `x-request-id`, `data.id`, timestamp numerico e hash hexadecimal.
3. Confirmar na documentacao oficial a janela de tolerancia do timestamp antes de implementar rejeicao por idade. Nao assumir um numero sem fonte oficial.
4. Capturar e validar os campos de acordo com o formato oficial do webhook.
5. Persistir evento antes do processamento.
6. Deduplicar por identificador estavel do evento/request, conforme documentacao oficial.
7. Atualizar status consultando o estado autoritativo na API Mercado Pago.
8. Impedir regressao de status aprovado para pendente.
9. Responder erros sem vazar detalhes internos.
10. Criar testes para assinatura valida, hash invalido, campos ausentes, replay, evento duplicado e status fora de ordem.

### Fase 4 - Separacao e qualidade do nucleo

1. Separar o servidor web Pix do cliente MCP e expor modulos reutilizaveis.
2. Criar configuracao centralizada com validacao de ambiente.
3. Validar dinheiro usando centavos inteiros ou decimal rigoroso; evitar conversao insegura com `Number`.
4. Padronizar erros internos e mensagens publicas.
5. Adicionar health check (`/health/live`) e encerramento gracioso.
6. Adicionar limites de conexao, timeout de requisicao, limite de corpo e rate limiting local.
7. Definir DTOs publicos para criacao e consulta de pagamentos.
8. Adicionar testes HTTP com Mercado Pago mockado.

### Fase 5 - Empacotamento reutilizavel

1. Documentar contratos publicos do nucleo.
2. Adicionar Dockerfile apenas quando o processo de inicializacao estiver estavel.
3. Adicionar CI com build, testes, `npm audit` e verificacao de segredos.
4. Documentar migracao de SQLite para PostgreSQL.
5. Documentar como o futuro SaaS deve consumir este nucleo.
6. Manter exemplos de MCP e sandbox Pix como consumidores, nao acoplar regras de SaaS.

## Fora do escopo deste repositorio

- Login de usuarios do SaaS.
- Empresas, tenants e memberships.
- Dashboard comercial.
- Catalogo de produtos do SaaS.
- Planos, assinaturas e billing do SaaS.
- Marketplace multi-vendedor.
- Suporte automatico a outros paises.

Esses itens serao feitos no proximo repositorio SaaS usando este nucleo.

## Arquivos principais

- `src/index.ts`: servidor MCP e tools.
- `src/pix-server.ts`: servidor HTTP e tela local Pix.
- `src/mercadopago-client.ts`: chamadas autenticadas para API Mercado Pago.
- `src/database.ts`: SQLite e persistencia local.
- `src/pix-status.ts`: normalizacao de status.
- `src/catalog.ts`: catalogo curado de documentacao oficial.
- `test/`: testes unitarios.
- `.vscode/mcp.json`: configuracao do MCP no VS Code.
- `.env.example`: nomes das variaveis sem segredos.
- `README.md`: instrucoes para desenvolvedor.

## Comandos de validacao

Executar na raiz do repositorio:

```bash
cd /workspaces/Mercado-Pago
npm install
npm run build
npm test
git diff --check
git status --short
```

Smoke test do MCP:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke-test","version":"1.0.0"}}}' | node dist/index.js
```

Servidor Pix local, somente com credencial de teste:

```bash
MERCADOPAGO_READ_ONLY=false npm run pix
```

Se a porta 3000 estiver ocupada:

```bash
PORT=3001 MERCADOPAGO_READ_ONLY=false npm run pix
```

Abrir `http://localhost:3000` ou `http://localhost:3001`.

Nao iniciar cobranca com token de producao.

## Regra para a proxima IA

Continue a implementacao em pequenas fases. Antes de editar, leia os arquivos atuais e formule uma hipotese local verificavel. Depois da primeira edicao, rode uma validacao focada. Ao terminar uma fase, rode build/testes e crie um commit na `main`.

Preserve o funcionamento atual do MCP e da tela Pix. Se uma alteracao quebrar o sistema, use o historico Git para voltar ao ultimo commit validado, sem apagar alteracoes do autor.
