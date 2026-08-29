import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.spyOn(console, "error").mockImplementation(() => undefined);

import { POST } from "@/app/api/webhooks/pluggy/route";

const originalSecret = process.env.PLUGGY_WEBHOOK_SECRET;

describe("POST /api/webhooks/pluggy", () => {
  beforeEach(() => {
    process.env.PLUGGY_WEBHOOK_SECRET = "test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.PLUGGY_WEBHOOK_SECRET;
    else process.env.PLUGGY_WEBHOOK_SECRET = originalSecret;
  });
  it("aceita evento válido com assinatura correta", async () => {
    const payload = { event: "item/created", eventId: "evt-1", itemId: "item-1" };
    const signature = createHmac("sha256", "test-secret").update(JSON.stringify(payload)).digest("hex");

    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        "x-pluggy-signature": signature,
      },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejeita webhook sem assinatura válida", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify({ event: "item/created", eventId: "evt-1", itemId: "item-1" }),
      headers: { "content-type": "application/json", "x-pluggy-signature": "invalid" },
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Webhook não autorizado." });
  });

  it("rejeita payload inválido sem expor detalhes", async () => {
    const payload = { event: "unknown", itemId: "item-1" };
    const signature = createHmac("sha256", "test-secret").update(JSON.stringify(payload)).digest("hex");

    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json", "x-pluggy-signature": signature },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Webhook inválido." });
  });

  it("rejeita JSON inválido antes de processar qualquer webhook", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: "{not-valid-json}",
      headers: { "content-type": "application/json", "x-pluggy-signature": "deadbeef" },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Webhook inválido." });
  });

  it("valida a assinatura usando o corpo bruto recebido", async () => {
    const rawBody = '{"event":"item/created","eventId":"evt-3","itemId":"item-2"}';
    const signature = createHmac("sha256", "test-secret").update(rawBody).digest("hex");

    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: rawBody,
      headers: { "content-type": "application/json", "x-pluggy-signature": signature },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });

  it("usa x-real-ip como fallback quando proxy não envia x-forwarded-for", async () => {
    for (let index = 0; index < 21; index += 1) {
      const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
        method: "POST",
        body: JSON.stringify({ event: "item/created", eventId: `evt-real-ip-${index}`, itemId: `item-real-ip-${index}` }),
        headers: {
          "content-type": "application/json",
          "x-real-ip": "198.51.100.42",
          "x-pluggy-signature": "invalid",
        },
      }));

      if (index < 20) {
        expect(response.status).toBe(401);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });

  it("ignora eventos duplicados para evitar replay de callbacks", async () => {
    const payload = {
      event: "transactions/updated",
      eventId: "evt-duplicate",
      itemId: "item-duplicate",
      accountId: "account-2",
      transactionIds: ["transaction-2"],
    };
    const signature = createHmac("sha256", "test-secret").update(JSON.stringify(payload)).digest("hex");

    const first = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json", "x-pluggy-signature": signature },
    }));

    const second = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json", "x-pluggy-signature": signature },
    }));

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });
  });

  it("aplica rate limit por cliente mesmo quando o IP chega em variações de header", async () => {
    for (let index = 0; index < 21; index += 1) {
      const forwardedFor = index % 2 === 0 ? "203.0.113.10, 198.51.100.9" : "203.0.113.10";
      const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
        method: "POST",
        body: JSON.stringify({ event: "item/created", eventId: `evt-rate-${index}`, itemId: `item-rate-${index}` }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": forwardedFor,
          "x-pluggy-signature": "invalid",
        },
      }));

      if (index < 20) {
        expect(response.status).toBe(401);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });

  it("normaliza IPs com porta antes de aplicar o rate limit", async () => {
    const ip = "198.51.200.77";

    for (let index = 0; index < 21; index += 1) {
      const forwardedFor = index % 2 === 0 ? `${ip}:443` : ip;
      const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
        method: "POST",
        body: JSON.stringify({ event: "item/created", eventId: `evt-port-${index}`, itemId: `item-port-${index}` }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": forwardedFor,
          "x-pluggy-signature": "invalid",
        },
      }));

      if (index < 20) {
        expect(response.status).toBe(401);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });

  it("aceita eventos de transações configurados no painel Pluggy", async () => {
    const payload = {
      event: "transactions/updated",
      eventId: "evt-2",
      itemId: "item-1",
      accountId: "account-1",
      transactionIds: ["transaction-1"],
    };
    const signature = createHmac("sha256", "test-secret").update(JSON.stringify(payload)).digest("hex");

    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json", "x-pluggy-signature": signature },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });
});