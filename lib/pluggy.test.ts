import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPluggyWebhookUrl, shouldAvoidPluggyDuplicates, ensureOwnedPluggyAccount, ensureOwnedPluggyTransaction } from "@/lib/pluggy";

const prismaMocks = vi.hoisted(() => ({
  accountFindFirst: vi.fn(),
  accountCreate: vi.fn(),
  accountUpdate: vi.fn(),
  transactionFindFirst: vi.fn(),
  transactionCreate: vi.fn(),
  transactionUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findFirst: prismaMocks.accountFindFirst,
      create: prismaMocks.accountCreate,
      update: prismaMocks.accountUpdate,
    },
    transaction: {
      findFirst: prismaMocks.transactionFindFirst,
      create: prismaMocks.transactionCreate,
      update: prismaMocks.transactionUpdate,
    },
  },
}));

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

  it("permite duplicidades somente quando configurado para sandbox", () => {
    expect(shouldAvoidPluggyDuplicates("false")).toBe(false);
    expect(shouldAvoidPluggyDuplicates("true")).toBe(true);
    expect(shouldAvoidPluggyDuplicates(undefined)).toBe(true);
  });
});

describe("Owned Pluggy sync guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia conta Pluggy que já pertence a outro usuário", async () => {
    prismaMocks.accountFindFirst.mockResolvedValue({ id: "account-other-user", userId: "other-user" });

    await expect(ensureOwnedPluggyAccount("pluggy-account-1", "user-1")).rejects.toThrow("PLUGGY_ITEM_NOT_OWNED");
  });

  it("bloqueia transação Pluggy que já pertence a outro usuário", async () => {
    prismaMocks.transactionFindFirst.mockResolvedValue({ id: "transaction-other-user", userId: "other-user" });

    await expect(ensureOwnedPluggyTransaction("pluggy-transaction-1", "user-1")).rejects.toThrow("PLUGGY_ITEM_NOT_OWNED");
  });
});