import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createPluggyClient,
  type PluggyClient,
} from "./pluggy-client.js";

export function registerTools(
  server: McpServer,
  client?: PluggyClient
) {
  const { pluggyRequest, ok } = client ?? createPluggyClient();

  // ---------- connectors ----------

  server.tool(
    "list_connectors",
    "Lists supported Brazilian banks (connectors). Pluggy endpoint: GET /connectors. Optional filters: name, types (e.g. PERSONAL_BANK, BUSINESS_BANK), countries (BR), sandbox.",
    {
      name: z.string().optional().describe("Filter by connector name (partial match)"),
      types: z
        .string()
        .optional()
        .describe("Comma-separated types (PERSONAL_BANK, BUSINESS_BANK, INVESTMENT, ...)"),
      countries: z.string().optional().describe("Comma-separated country codes (default BR)"),
      sandbox: z.boolean().optional().describe("Include sandbox connectors"),
    },
    async (args) => ok(await pluggyRequest("GET", "/connectors", { query: args }))
  );

  server.tool(
    "get_connector",
    "Get a single connector definition by id. Pluggy endpoint: GET /connectors/{id}.",
    {
      id: z.number().int().describe("Connector numeric id"),
    },
    async ({ id }) => ok(await pluggyRequest("GET", `/connectors/${id}`))
  );

  // ---------- categories ----------

  server.tool(
    "list_categories",
    "List Pluggy's transaction categorization taxonomy. Pluggy endpoint: GET /categories.",
    {},
    async () => ok(await pluggyRequest("GET", "/categories"))
  );

  // ---------- connect token ----------

  server.tool(
    "create_connect_token",
    "Mint a connect token for embedding the Pluggy Connect widget on the client. Pluggy endpoint: POST /connect_token.",
    {
      clientUserId: z.string().optional().describe("Stable identifier for the end-user in your system"),
      itemId: z.string().optional().describe("Existing item id when refreshing/updating credentials"),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional widget options object (avatarUrl, oauthRedirectUri, etc.)"),
    },
    async (args) =>
      ok(await pluggyRequest("POST", "/connect_token", { body: args }))
  );

  // ---------- items (bank connections) ----------

  server.tool(
    "create_item",
    "Create a new bank connection (item) for a connector. Pluggy endpoint: POST /items.",
    {
      connectorId: z.number().int().describe("Connector id (from list_connectors)"),
      parameters: z
        .record(z.string(), z.unknown())
        .describe("Credential parameters required by the connector (e.g. { cpf, password })"),
      webhookUrl: z.string().url().optional().describe("Optional webhook to receive item status events"),
      clientUserId: z.string().optional().describe("Stable end-user identifier"),
    },
    async (args) => ok(await pluggyRequest("POST", "/items", { body: args }))
  );


  server.tool(
    "get_item",
    "Fetch a single bank connection by id. Pluggy endpoint: GET /items/{id}.",
    { id: z.string().describe("Item id (uuid)") },
    async ({ id }) => ok(await pluggyRequest("GET", `/items/${id}`))
  );

  server.tool(
    "update_item",
    "Refresh / update credentials for an existing bank connection. Pluggy endpoint: PATCH /items/{id}.",
    {
      id: z.string().describe("Item id"),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Updated credential parameters; omit to trigger a credential-less refresh"),
      webhookUrl: z.string().url().optional(),
    },
    async ({ id, ...body }) =>
      ok(await pluggyRequest("PATCH", `/items/${id}`, { body }))
  );

  server.tool(
    "delete_item",
    "Delete a bank connection (revokes credentials, removes accounts/transactions). Pluggy endpoint: DELETE /items/{id}.",
    { id: z.string().describe("Item id") },
    async ({ id }) => ok(await pluggyRequest("DELETE", `/items/${id}`))
  );

  // ---------- accounts ----------

  server.tool(
    "list_accounts",
    "List accounts (checking, savings, credit card, investment) tied to an item. Pluggy endpoint: GET /accounts?itemId=...",
    {
      itemId: z.string().describe("Parent item id"),
      type: z
        .enum(["BANK", "CREDIT", "INVESTMENT", "LOAN"])
        .optional()
        .describe("Optional account type filter"),
    },
    async (args) => ok(await pluggyRequest("GET", "/accounts", { query: args }))
  );

  server.tool(
    "get_account",
    "Get a single account by id. Pluggy endpoint: GET /accounts/{id}.",
    { id: z.string().describe("Account id") },
    async ({ id }) => ok(await pluggyRequest("GET", `/accounts/${id}`))
  );

  // ---------- transactions ----------

  server.tool(
    "list_transactions",
    "List transactions for an account in a date range. Pluggy endpoint: GET /transactions?accountId=&from=&to=.",
    {
      accountId: z.string().describe("Account id"),
      from: z.string().optional().describe("ISO date lower bound (yyyy-mm-dd)"),
      to: z.string().optional().describe("ISO date upper bound (yyyy-mm-dd)"),
      page: z.number().int().optional(),
      pageSize: z.number().int().optional(),
    },
    async (args) =>
      ok(await pluggyRequest("GET", "/transactions", { query: args }))
  );

  server.tool(
    "get_transaction",
    "Get a single transaction by id. Pluggy endpoint: GET /transactions/{id}.",
    { id: z.string().describe("Transaction id") },
    async ({ id }) => ok(await pluggyRequest("GET", `/transactions/${id}`))
  );

  // ---------- identities ----------

  server.tool(
    "list_identities",
    "Fetch identity data (legal name, document, address) for an item. Pluggy endpoint: GET /identity?itemId=...",
    { itemId: z.string().describe("Item id") },
    async (args) => ok(await pluggyRequest("GET", "/identity", { query: args }))
  );

  // ---------- investments ----------

  server.tool(
    "list_investments",
    "List investments collected for an item. Pluggy endpoint: GET /investments?itemId=...",
    {
      itemId: z.string().describe("Parent item id (uuid)"),
      type: z
        .enum(["COE", "EQUITY", "ETF", "FIXED_INCOME", "MUTUAL_FUND", "SECURITY", "OTHER"])
        .optional()
        .describe("Filter by investment type"),
      page: z.number().optional().describe("Page number (default 1)"),
      pageSize: z.number().optional().describe("Page size (default 500)"),
    },
    async (args) => ok(await pluggyRequest("GET", "/investments", { query: args }))
  );

  server.tool(
    "get_investment",
    "Fetch a single investment by id. Pluggy endpoint: GET /investments/{id}.",
    { id: z.string().describe("Investment id (uuid)") },
    async ({ id }) => ok(await pluggyRequest("GET", `/investments/${id}`))
  );

  server.tool(
    "list_investment_transactions",
    "List transactions for a specific investment. Pluggy endpoint: GET /investments/{id}/transactions.",
    {
      id: z.string().describe("Investment id (uuid)"),
      page: z.number().optional().describe("Page number (default 1)"),
      pageSize: z.number().optional().describe("Page size (default 500)"),
    },
    async ({ id, ...query }) =>
      ok(await pluggyRequest("GET", `/investments/${id}/transactions`, { query }))
  );

  // ---------- payments (PISP) ----------

  server.tool(
    "create_payment_intent",
    "Create a payment intent for Pluggy Payments (PISP). Pluggy endpoint: POST /payments/intents.",
    {
      amount: z.number().describe("Amount in major units (BRL)"),
      description: z.string().optional(),
      payerDocument: z.string().optional().describe("Payer CPF/CNPJ"),
      recipient: z
        .record(z.string(), z.unknown())
        .describe("Recipient block (pixKey or bank account details)"),
      callbackUrls: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Object with success / failure redirect URLs"),
      metadata: z.record(z.string(), z.unknown()).optional(),
    },
    async (args) =>
      ok(await pluggyRequest("POST", "/payments/intents", { body: args }))
  );

  server.tool(
    "get_payment_intent",
    "Fetch the current status of a payment intent. Pluggy endpoint: GET /payments/intents/{id}.",
    { id: z.string().describe("Payment intent id") },
    async ({ id }) => ok(await pluggyRequest("GET", `/payments/intents/${id}`))
  );
}
