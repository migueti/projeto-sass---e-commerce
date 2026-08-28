# @gu-does-packages/pluggy-mcp

Servidor MCP para **[Pluggy](https://pluggy.ai)** — agregador Open Finance Brasil (ITP/TPP).

Baseado no [`@codespar/mcp-pluggy`](https://www.npmjs.com/package/@codespar/mcp-pluggy) por [CodeSpar](https://codespar.dev), estendido com funcionalidades adicionais.

> **Licença:** MIT — mantém os créditos ao trabalho original da CodeSpar.

## Setup

```bash
bun install
```

## Quick Start

### Via npx (recomendado)

```bash
npx @gu-does-packages/pluggy-mcp
```

### Claude Desktop

Adicione ao `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pluggy": {
      "command": "npx",
      "args": ["@gu-does-packages/pluggy-mcp"],
      "env": {
        "PLUGGY_CLIENT_ID": "seu-client-id",
        "PLUGGY_CLIENT_SECRET": "seu-client-secret"
      }
    }
  }
}
```

### Cursor / VS Code

Mesma configuração em `.cursor/mcp.json` ou no JSON de MCP do VS Code.

Para usar a cópia local deste repositório no VS Code, compile o pacote e adicione
ao arquivo de MCP:

```json
{
  "pluggy": {
    "command": "node",
    "args": ["pluggy mcp/dist/index.js"],
    "env": {
      "PLUGGY_CLIENT_ID": "${env:PLUGGY_CLIENT_ID}",
      "PLUGGY_CLIENT_SECRET": "${env:PLUGGY_CLIENT_SECRET}",
      "PLUGGY_API_BASE": "${env:PLUGGY_API_BASE}"
    }
  }
}
```

## Autenticação

Pluggy usa OAuth2 client-credentials. Obtenha suas credenciais no [dashboard da Pluggy](https://dashboard.pluggy.ai).

| Variável | Obrigatório | Descrição |
|---|---|---|
| `PLUGGY_CLIENT_ID` | sim | Client ID do dashboard |
| `PLUGGY_CLIENT_SECRET` | sim | Client Secret do dashboard |
| `PLUGGY_API_BASE` | não | URL base da API (default `https://api.pluggy.ai`) |

### Sandbox

A Pluggy disponibiliza conectores sandbox (`Pluggy Bank`, `BR · Pluggy Bank`) que funcionam com o mesmo endpoint de produção. Use `list_connectors` com `sandbox: true` para listá-los.

## Comandos

| Comando | Descrição |
|---------|-----------|
| `bun run build` | Compila para Node.js (`dist/index.js`) |
| `bun run start` | Roda o servidor MCP (`node dist/index.js`) |
| `bun run test` | Roda os testes automatizados |
| `bun run inspect` | Abre o MCP Inspector (UI interativa no navegador) |

## Créditos

Este projeto é um fork estendido do [`@codespar/mcp-pluggy`](https://www.npmjs.com/package/@codespar/mcp-pluggy) (MIT), mantendo toda a funcionalidade original dos 18 tools MCP para a API Pluggy. Agradecimentos à [CodeSpar](https://codespar.dev) pelo trabalho base.

### Extensões em relação ao original

- `list_investments` — recupera todos os investimentos de um item (`GET /investments`)
- `get_investment` — recupera um investimento específico por ID (`GET /investments/{id}`)
- `list_investment_transactions` — recupera todas as transações de um investimento (`GET /investments/{id}/transactions`)

## Funcionalidades (18 tools)

| Tool | Endpoint Pluggy | Descrição |
|---|---|---|
| `list_connectors` | `GET /connectors` | Lista conectores (bancos) |
| `get_connector` | `GET /connectors/{id}` | Detalhes de um conector |
| `list_categories` | `GET /categories` | Taxonomia de categorias |
| `create_connect_token` | `POST /connect_token` | Token para Pluggy Connect |
| `create_item` | `POST /items` | Nova conexão bancária |
| `get_item` | `GET /items/{id}` | Detalhes de uma conexão |
| `update_item` | `PATCH /items/{id}` | Atualiza credenciais/sync |
| `delete_item` | `DELETE /items/{id}` | Revoga conexão |
| `list_accounts` | `GET /accounts` | Contas de um item |
| `get_account` | `GET /accounts/{id}` | Detalhes de uma conta |
| `list_transactions` | `GET /transactions` | Transações de uma conta |
| `get_transaction` | `GET /transactions/{id}` | Detalhes de uma transação |
| `list_identities` | `GET /identity` | Dados cadastrais (CPF, nome, endereço) |
| `list_investments` | `GET /investments` | Investimentos de um item |
| `get_investment` | `GET /investments/{id}` | Detalhes de um investimento |
| `list_investment_transactions` | `GET /investments/{id}/transactions` | Transações de um investimento |
| `create_payment_intent` | `POST /payments/intents` | Inicia intent de pagamento |
| `get_payment_intent` | `GET /payments/intents/{id}` | Status do payment intent |

## Publicação

```bash
bun run build
npm publish
```

`npx @gu-does-packages/pluggy-mcp` funciona em qualquer máquina com Node.js instalado.

## Licença

MIT — veja [LICENSE](LICENSE).
