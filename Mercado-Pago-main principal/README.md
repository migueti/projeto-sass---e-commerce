# Mercado Pago MCP

MCP local para consultar a documentacao oficial do Mercado Pago e, com credenciais de teste, consultar ou executar APIs no contexto Brasil (`MLB`). O servidor usa transporte `stdio` e foi pensado para VS Code, Claude Desktop e clientes MCP compativeis.

## Requisitos

- Node.js 20 ou superior
- npm
- Conectividade com `www.mercadopago.com.br` para leitura online
- Access Token de teste somente para as tools de API

## Instalar e executar

```bash
npm install
npm run build
npm start
```

No VS Code, a configuracao em `.vscode/mcp.json` inicia o servidor com `npm run dev`. Use a acao de MCP do editor para iniciar e verificar as tools.

## Testar Pix virtualmente

O projeto tambem inclui uma tela local de sandbox para criar uma Order Pix e exibir o QR Code, o Pix Copia e Cola e o link de pagamento.

```bash
export MERCADOPAGO_ACCESS_TOKEN='SEU_ACCESS_TOKEN_DE_TESTE'
export MERCADOPAGO_READ_ONLY='false'
npm run build
npm run pix
```

Abra `http://localhost:3000`. Informe um valor pequeno e o e-mail de uma conta de teste. O backend envia `POST /v1/orders` com `processing_mode: automatic`, `payment_method.id: pix`, `payment_method.type: bank_transfer` e uma chave `X-Idempotency-Key` nova por Order.

O fluxo exige um Access Token de teste porque cria uma Order. Para somente consultar documentacao, mantenha `MERCADOPAGO_READ_ONLY=true`.

O endpoint web exige `X-Idempotency-Key` com pelo menos 8 caracteres para evitar Orders duplicadas em retries. A resposta é persistida em SQLite local (`DATABASE_PATH`, por padrao `./data/mercado-pago.sqlite`), que deve ser substituido por PostgreSQL antes de escalar o SaaS.

Depois que a Order for criada, a tela consulta o status pelo identificador publico e mostra `Pagamento recebido e aprovado` somente quando a API confirmar `payment.status=approved`. Para receber atualizacoes automaticas, configure `MERCADOPAGO_WEBHOOK_SECRET` e uma URL HTTPS publica apontando para `/webhooks/mercadopago`; `localhost` sozinho nao recebe webhooks do Mercado Pago.

## Credenciais

Copie `.env.example` para `.env` apenas para uso local ou exporte as variaveis no ambiente do processo:

```bash
export MERCADOPAGO_ACCESS_TOKEN='APP_USR-seu-token-de-teste'
export MERCADOPAGO_READ_ONLY='true'
npm run dev
```

Nunca inclua tokens no codigo, commits, logs ou mensagens. O token fornecido durante a configuracao apareceu em um comando de terminal; por seguranca, revogue-o e gere outro no painel do Mercado Pago antes de continuar. Prefira credenciais de teste e siga o checklist oficial antes de usar producao.

## Tools

- `search_documentation`: pesquisa no catalogo curado de paginas oficiais brasileiras.
- `read_documentation`: baixa uma pagina HTTPS oficial do catalogo permitido.
- `get_payment`: consulta um pagamento por ID.
- `get_order`: consulta uma order por ID.
- `create_preference`: cria uma preferencia do Checkout Pro; exige `confirmed=true`, `idempotencyKey` e `MERCADOPAGO_READ_ONLY=false`.
- `mutate_order`: captura, cancela ou reembolsa uma order; exige as mesmas protecoes.
- `server_status`: mostra pais, fonte, autenticacao detectada e modo somente leitura.

As operacoes de alteracao permanecem bloqueadas por padrao. A confirmacao da tool e uma barreira de seguranca, nao substitui validacao de negocio, permissao do usuario, idempotencia ou os requisitos da API.

## Documentacao oficial

- [Mercado Pago MCP Server](https://www.mercadopago.com.br/developers/pt/docs/mcp-server/overview)
- [Checkout API via Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/overview)
- [Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview)
- [Credenciais](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)

O catálogo pode conter links removidos ou alterados. Respostas HTTP 404 são tratadas como conteúdo indisponível; o servidor não reconstrói páginas ausentes nem substitui a documentação oficial por blogs ou fóruns.

## Testes

```bash
npm run build
npm test
```

Os testes usam apenas dados locais e mocks. Nenhuma credencial real é necessária
