import { afterEach, describe, expect, it } from "vitest";

import { getPluggyWebhookUrl } from "@/lib/pluggy";

describe("getPluggyWebhookUrl", () => {
  const originalValue = process.env.PLUGGY_WEBHOOK_URL;

  afterEach(() => {
    if (originalValue === undefined) delete process.env.PLUGGY_WEBHOOK_URL;
    else process.env.PLUGGY_WEBHOOK_URL = originalValue;
  });

  it("aceita somente HTTPS público fora de example.com", () => {
    process.env.PLUGGY_WEBHOOK_URL = "https://app.onrender.com/api/webhooks/pluggy";
    expect(getPluggyWebhookUrl()).toBe("https://app.onrender.com/api/webhooks/pluggy");

    process.env.PLUGGY_WEBHOOK_URL = "https://app.example.com/api/webhooks/pluggy";
    expect(getPluggyWebhookUrl()).toBeUndefined();

    process.env.PLUGGY_WEBHOOK_URL = "http://localhost:3000/api/webhooks/pluggy";
    expect(getPluggyWebhookUrl()).toBeUndefined();
  });
});