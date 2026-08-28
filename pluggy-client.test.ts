import { describe, test, expect, mock, beforeEach } from "bun:test";
import { createPluggyClient, assertConfig } from "../pluggy-client.js";

function mockFetch() {
  const fn = mock();
  // @ts-expect-error - overriding global fetch for tests
  globalThis.fetch = fn;
  return fn;
}

describe("assertConfig", () => {
  beforeEach(() => {
    delete process.env.PLUGGY_CLIENT_ID;
    delete process.env.PLUGGY_CLIENT_SECRET;
    delete process.env.PLUGGY_API_BASE;
  });

  test("lança se PLUGGY_CLIENT_ID faltar", () => {
    process.env.PLUGGY_CLIENT_ID = "x";
    expect(() => assertConfig()).toThrow("PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET");
  });

  test("lança se PLUGGY_CLIENT_SECRET faltar", () => {
    process.env.PLUGGY_CLIENT_SECRET = "y";
    expect(() => assertConfig()).toThrow("PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET");
  });

  test("retorna config válida", () => {
    process.env.PLUGGY_CLIENT_ID = "my-id";
    process.env.PLUGGY_CLIENT_SECRET = "my-secret";
    process.env.PLUGGY_API_BASE = "https://sandbox.pluggy.ai";
    const config = assertConfig();
    expect(config.clientId).toBe("my-id");
    expect(config.clientSecret).toBe("my-secret");
    expect(config.baseUrl).toBe("https://sandbox.pluggy.ai");
  });
});

describe("createPluggyClient", () => {
  test("cria client com config fornecida", () => {
    const client = createPluggyClient({ clientId: "a", clientSecret: "b" });
    expect(client).toHaveProperty("pluggyRequest");
  });

  describe("sem env", () => {
    beforeEach(() => {
      delete process.env.PLUGGY_CLIENT_ID;
      delete process.env.PLUGGY_CLIENT_SECRET;
      delete process.env.PLUGGY_API_BASE;
    });

    test("lança se config ausente e env vars faltando", () => {
      expect(() => createPluggyClient()).toThrow("PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET");
    });
  });

  describe("com env", () => {
    beforeEach(() => {
      process.env.PLUGGY_CLIENT_ID = "env-id";
      process.env.PLUGGY_CLIENT_SECRET = "env-secret";
    });

    test("cria client lendo de env vars", () => {
      const client = createPluggyClient();
      expect(client).toHaveProperty("pluggyRequest");
      expect(client).toHaveProperty("ok");
    });
  });
});

describe("pluggyRequest – GET bem-sucedido", () => {
  test("retorna { ok: true, status, data }", async () => {
    const fetch = mockFetch();
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ apiKey: "k" }), { status: 200 })
    );
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [{ id: 1 }] }), { status: 200 })
    );

    const client = createPluggyClient({ clientId: "a", clientSecret: "b" });
    const res = await client.pluggyRequest("GET", "/connectors");

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ results: [{ id: 1 }] });
  });
});

describe("pluggyRequest – POST com body", () => {
  test("envia JSON body e X-API-KEY header", async () => {
    const fetch = mockFetch();
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ apiKey: "k" }), { status: 200 })
    );
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "item-1" }), { status: 201 })
    );

    const client = createPluggyClient({ clientId: "a", clientSecret: "b" });
    const res = await client.pluggyRequest("POST", "/items", {
      body: { connectorId: 1, parameters: { cpf: "123" } },
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(201);

    // Check POST body was sent correctly
    const callIdx = 1;
    const callArgs = fetch.mock.calls[callIdx];
    expect(callArgs).toBeDefined();
    const sentBody = JSON.parse(callArgs![1]?.body as string);
    expect(sentBody).toEqual({ connectorId: 1, parameters: { cpf: "123" } });

    // Check auth header
    expect(callArgs![1]?.headers["X-API-KEY"]).toBe("k");
  });
});

describe("pluggyRequest – query params", () => {
  test("serializa query params, ignora null/undefined", async () => {
    const fetch = mockFetch();
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ apiKey: "k" }), { status: 200 })
    );
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    const client = createPluggyClient({ clientId: "a", clientSecret: "b" });
    await client.pluggyRequest("GET", "/connectors", {
      query: { name: "Itaú", sandbox: true, types: undefined, countries: null },
    });

    const callIdx = 1;
    const callArgs = fetch.mock.calls[callIdx];
    expect(callArgs).toBeDefined();
    const url = new URL(callArgs![0] as string);
    expect(url.searchParams.get("name")).toBe("Itaú");
    expect(url.searchParams.get("sandbox")).toBe("true");
    expect(url.searchParams.has("types")).toBe(false);
    expect(url.searchParams.has("countries")).toBe(false);
  });
});

describe("pluggyRequest – 401 com retry", () => {
  test("refresh API key e retry na 401", async () => {
    const fetch = mockFetch();
    // 1st = /auth succeeds, 2nd = request gets 401
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ apiKey: "old-key" }), { status: 200 })
    );
    fetch.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 })
    );
    // 3rd = re-auth succeeds, 4th = retry succeeds
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ apiKey: "new-key" }), { status: 200 })
    );
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: "ok" }), { status: 200 })
    );

    const client = createPluggyClient({ clientId: "a", clientSecret: "b" });
    const res = await client.pluggyRequest("GET", "/items");

    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ data: "ok" });
    // 4 fetch calls: auth, request, auth, request(retry)
    expect(fetch.mock.calls.length).toBe(4);
  });
});

describe("pluggyRequest – erro 4xx sem retry", () => {
  test("retorna erro, fetch 1x", async () => {
    const fetch = mockFetch();
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ apiKey: "k" }), { status: 200 })
    );
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Bad Request" }), { status: 400 })
    );

    const client = createPluggyClient({ clientId: "a", clientSecret: "b" });
    const res = await client.pluggyRequest("GET", "/items");

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toContain("Bad Request");
    // auth(1) + request(1) = 2 calls
    expect(fetch.mock.calls.length).toBe(2);
  });
});

describe("pluggyRequest – resposta non-JSON", () => {
  test("data é string quando resposta não é JSON", async () => {
    const fetch = mockFetch();
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ apiKey: "k" }), { status: 200 })
    );
    fetch.mockResolvedValueOnce(
      new Response("OK", { status: 200 })
    );

    const client = createPluggyClient({ clientId: "a", clientSecret: "b" });
    const res = await client.pluggyRequest("GET", "/health");

    expect(res.ok).toBe(true);
    expect(res.data).toBe("OK");
  });
});

describe("ok – formata resposta MCP", () => {
  test("retorna estrutura { content: [{ type: 'text', text }] }", () => {
    const client = createPluggyClient({ clientId: "a", clientSecret: "b" });
    const result = client.ok({ ok: true, status: 200, data: { foo: "bar" } });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain('"foo": "bar"');
  });
});
