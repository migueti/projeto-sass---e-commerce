import { describe, test, expect, mock, beforeEach } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../tools.js";
import type { PluggyClient } from "../pluggy-client.js";

interface MockPluggyClient extends PluggyClient {
  pluggyRequest: ReturnType<typeof mock>;
}

function createMockClient(): MockPluggyClient {
  const mockPluggyRequest = mock(() =>
    Promise.resolve({ ok: true, status: 200, data: {} })
  );
  const mockOk = mock((r: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(r) }],
  }));

  return { pluggyRequest: mockPluggyRequest, ok: mockOk };
}

async function setupServer(client: PluggyClient) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerTools(server, client);
  await server.connect(serverTransport);
  const mcpClient = new Client(
    { name: "test-client", version: "0.0.0" },
    { capabilities: {} }
  );
  await mcpClient.connect(clientTransport);
  return mcpClient;
}

describe("tool execution", () => {
  let mockClient: MockPluggyClient;
  let mcpClient: Client;

  beforeEach(async () => {
    mockClient = createMockClient();
    mcpClient = await setupServer(mockClient);
  });

  test("list_connectors com filtros chama GET /connectors com query", async () => {
    await mcpClient.callTool({
      name: "list_connectors",
      arguments: { name: "Itaú", sandbox: true },
    });

    const calls = mockClient.pluggyRequest.mock.calls;
    expect(calls.length).toBe(1);

    const args = calls[0];
    expect(args).toBeDefined();
    expect(args![0]).toBe("GET");
    expect(args![1]).toBe("/connectors");
    expect((args![2] as any)?.query).toEqual({ name: "Itaú", sandbox: true });
  });

  test("create_item chama POST /items com body", async () => {
    await mcpClient.callTool({
      name: "create_item",
      arguments: {
        connectorId: 42,
        parameters: { cpf: "123", password: "secret" },
      },
    });

    const calls = mockClient.pluggyRequest.mock.calls;
    expect(calls.length).toBe(1);

    const args = calls[0];
    expect(args).toBeDefined();
    expect(args![0]).toBe("POST");
    expect(args![1]).toBe("/items");
    expect((args![2] as any)?.body).toEqual({
      connectorId: 42,
      parameters: { cpf: "123", password: "secret" },
    });
  });

  test("get_connector chama GET /connectors/{id}", async () => {
    await mcpClient.callTool({
      name: "get_connector",
      arguments: { id: 7 },
    });

    const calls = mockClient.pluggyRequest.mock.calls;
    expect(calls.length).toBe(1);

    const args = calls[0];
    expect(args).toBeDefined();
    expect(args![0]).toBe("GET");
    expect(args![1]).toBe("/connectors/7");
  });

  test("list_investments chama GET /investments com query", async () => {
    await mcpClient.callTool({
      name: "list_investments",
      arguments: { itemId: "abc-123", type: "FIXED_INCOME" },
    });

    const calls = mockClient.pluggyRequest.mock.calls;
    expect(calls.length).toBe(1);

    const args = calls[0];
    expect(args).toBeDefined();
    expect(args![0]).toBe("GET");
    expect(args![1]).toBe("/investments");
    expect((args![2] as any)?.query).toEqual({
      itemId: "abc-123",
      type: "FIXED_INCOME",
    });
  });

  test("list_investment_transactions chama GET /investments/{id}/transactions", async () => {
    await mcpClient.callTool({
      name: "list_investment_transactions",
      arguments: { id: "inv-42", page: 2 },
    });

    const calls = mockClient.pluggyRequest.mock.calls;
    expect(calls.length).toBe(1);

    const args = calls[0];
    expect(args).toBeDefined();
    expect(args![0]).toBe("GET");
    expect(args![1]).toBe("/investments/inv-42/transactions");
    expect((args![2] as any)?.query).toEqual({ page: 2 });
  });
});
