import { describe, expect, it, vi } from "vitest";

vi.spyOn(console, "error").mockImplementation(() => undefined);

import { POST } from "@/app/api/webhooks/pluggy/route";

describe("POST /api/webhooks/pluggy", () => {
  it("aceita evento válido e responde rapidamente", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify({ event: "item/created", eventId: "evt-1", itemId: "item-1" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejeita payload inválido sem expor detalhes", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify({ event: "unknown", itemId: "item-1" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Webhook inválido." });
  });

  it("aceita eventos de transações configurados no painel Pluggy", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/pluggy", {
      method: "POST",
      body: JSON.stringify({
        event: "transactions/updated",
        eventId: "evt-2",
        itemId: "item-1",
        accountId: "account-1",
        transactionIds: ["transaction-1"],
      }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });
});