import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { documentationCatalog, DOCUMENTATION_BASE } from "./catalog.js";
import { fetchDocumentation, searchDocumentation } from "./docs-client.js";
import { isReadOnly, mercadoPagoRequest, requireMutationConfirmation } from "./mercadopago-client.js";

const server = new McpServer({ name: "mercado-pago-brasil", version: "0.1.0" });

const result = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

server.tool(
  "search_documentation",
  "Busca na documentacao oficial do Mercado Pago Brasil (MLB).",
  { query: z.string().min(1), limit: z.number().int().min(1).max(20).optional() },
  async ({ query, limit }) => result({ country: "BR", source: DOCUMENTATION_BASE, results: searchDocumentation(query, limit) })
);

server.tool(
  "read_documentation",
  "Le uma pagina oficial do catalogo de documentacao do Mercado Pago Brasil.",
  { path: z.string().min(1) },
  async ({ path }) => {
    const entry = documentationCatalog.find((item) => item.path === path);
    if (!entry) throw new Error("Caminho nao encontrado no catalogo oficial permitido.");
    const page = await fetchDocumentation(entry);
    return result({ country: "BR", ...entry, ...page });
  }
);

server.tool(
  "get_payment",
  "Consulta um pagamento pela Payments API usando Access Token do ambiente.",
  { paymentId: z.string().min(1) },
  async ({ paymentId }) => result(await mercadoPagoRequest({ method: "GET", path: `/v1/payments/${encodeURIComponent(paymentId)}` }))
);

server.tool(
  "get_order",
  "Consulta uma order usando Access Token do ambiente.",
  { orderId: z.string().min(1) },
  async ({ orderId }) => result(await mercadoPagoRequest({ method: "GET", path: `/v1/orders/${encodeURIComponent(orderId)}` }))
);

server.tool(
  "create_preference",
  "Cria uma preferencia do Checkout Pro. Desabilitada por padrao no modo somente leitura.",
  { preference: z.record(z.unknown()), confirmed: z.boolean(), idempotencyKey: z.string().min(1) },
  async ({ preference, confirmed, idempotencyKey }) => {
    requireMutationConfirmation(confirmed, idempotencyKey);
    return result(await mercadoPagoRequest({ method: "POST", path: "/checkout/preferences", body: preference, idempotencyKey }));
  }
);

server.tool(
  "mutate_order",
  "Executa uma operacao de Orders. Requer confirmacao, idempotencia e modo leitura desativado.",
  { orderId: z.string().min(1), operation: z.enum(["capture", "cancel", "refund"]), body: z.record(z.unknown()).optional(), confirmed: z.boolean(), idempotencyKey: z.string().min(1) },
  async ({ orderId, operation, body, confirmed, idempotencyKey }) => {
    requireMutationConfirmation(confirmed, idempotencyKey);
    const pathByOperation = { capture: "capture", cancel: "cancel", refund: "refund" } as const;
    return result(await mercadoPagoRequest({ method: "POST", path: `/v1/orders/${encodeURIComponent(orderId)}/${pathByOperation[operation]}`, body, idempotencyKey }));
  }
);

server.tool(
  "server_status",
  "Informa o pais, a fonte e se o MCP esta em modo somente leitura.",
  {},
  async () => result({ country: "BR", documentation: DOCUMENTATION_BASE, readOnly: isReadOnly(), authenticated: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN) })
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Mercado Pago MCP iniciado via stdio para Brasil (MLB).");
