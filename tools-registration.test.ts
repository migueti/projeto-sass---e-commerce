import { describe, test, expect } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../tools.js";
import { createPluggyClient } from "../pluggy-client.js";

const EXPECTED_TOOLS = [
  "list_connectors",
  "get_connector",
  "list_categories",
  "create_connect_token",
  "create_item",
  "get_item",
  "update_item",
  "delete_item",
  "list_accounts",
  "get_account",
  "list_transactions",
  "get_transaction",
  "list_identities",
  "list_investments",
  "get_investment",
  "list_investment_transactions",
  "create_payment_intent",
  "get_payment_intent",
];

async function setupServer() {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = new McpServer({ name: "test", version: "0.0.0" });
  const client = createPluggyClient({ clientId: "t", clientSecret: "t" });
  registerTools(server, client);
  await server.connect(serverTransport);
  const mcpClient = new Client(
    { name: "test-client", version: "0.0.0" },
    { capabilities: {} }
  );
  await mcpClient.connect(clientTransport);
  return mcpClient;
}

describe("tool registration", () => {
  test("list_tools retorna 18 tools", async () => {
    const mcpClient = await setupServer();
    const { tools } = await mcpClient.listTools();
    expect(tools.length).toBe(18);
  });

  test("todas as tools têm nome e descrição non-empty", async () => {
    const mcpClient = await setupServer();
    const { tools } = await mcpClient.listTools();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
    }
  });

  test("nomes exatos das tools", async () => {
    const mcpClient = await setupServer();
    const { tools } = await mcpClient.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([...EXPECTED_TOOLS].sort());
  });

  test("list_connectors schema tem propriedades esperadas", async () => {
    const mcpClient = await setupServer();
    const { tools } = await mcpClient.listTools();
    const tool = tools.find((t) => t.name === "list_connectors")!;
    const props = tool.inputSchema.properties ?? {};
    expect(props).toHaveProperty("name");
    expect(props).toHaveProperty("types");
    expect(props).toHaveProperty("countries");
    expect(props).toHaveProperty("sandbox");
  });

  test("list_investments schema tem propriedades esperadas", async () => {
    const mcpClient = await setupServer();
    const { tools } = await mcpClient.listTools();
    const tool = tools.find((t) => t.name === "list_investments")!;
    const props = tool.inputSchema.properties ?? {};
    expect(props).toHaveProperty("itemId");
    expect(props).toHaveProperty("type");
    expect(props).toHaveProperty("page");
    expect(props).toHaveProperty("pageSize");
  });
});
