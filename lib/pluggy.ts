import Pluggy, { type Connector } from "pluggy-js";

import { prisma } from "@/lib/prisma";

const DEFAULT_BASE_URL = "https://api.pluggy.ai";
const API_KEY_MIN_TTL_MS = 60_000;

let cachedApiKey: { value: string; expiresAt: number } | null = null;

function requiredEnvironmentValue(name: "PLUGGY_CLIENT_ID" | "PLUGGY_CLIENT_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("PLUGGY_NOT_CONFIGURED");
  return value;
}

export function getPluggyWebhookUrl() {
  const value = process.env.PLUGGY_WEBHOOK_URL?.trim();
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname === "example.com" || url.hostname.endsWith(".example.com"))
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function shouldAvoidPluggyDuplicates(value = process.env.PLUGGY_AVOID_DUPLICATES) {
  return value?.trim().toLowerCase() !== "false";
}

async function getApiKey() {
  if (cachedApiKey && cachedApiKey.expiresAt - Date.now() > API_KEY_MIN_TTL_MS)
    return cachedApiKey.value;

  const response = await fetch(`${process.env.PLUGGY_API_BASE ?? DEFAULT_BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: requiredEnvironmentValue("PLUGGY_CLIENT_ID"),
      clientSecret: requiredEnvironmentValue("PLUGGY_CLIENT_SECRET"),
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("PLUGGY_AUTH_FAILED");

  const data = await response.json() as { apiKey?: string; expiresAt?: string };
  if (!data.apiKey) throw new Error("PLUGGY_AUTH_FAILED");
  cachedApiKey = {
    value: data.apiKey,
    expiresAt: data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 2 * 60 * 60 * 1_000,
  };
  return data.apiKey;
}

export async function createPluggyConnectToken(clientUserId: string) {
  const client = new Pluggy(await getApiKey(), process.env.PLUGGY_API_BASE ?? DEFAULT_BASE_URL);
  return client.createConnectToken(undefined, {
    clientUserId,
    webhookUrl: getPluggyWebhookUrl(),
    avoidDuplicates: shouldAvoidPluggyDuplicates(),
  });
}

export async function syncPluggyItem(itemId: string, userId: string) {
  const client = new Pluggy(await getApiKey(), process.env.PLUGGY_API_BASE ?? DEFAULT_BASE_URL);
  let item = await client.fetchItem(itemId);
  if (item.clientUserId && item.clientUserId !== userId) throw new Error("PLUGGY_ITEM_NOT_OWNED");

  for (let attempt = 0; attempt < 10 && item.status !== "UPDATED"; attempt += 1) {
    if (item.status === "LOGIN_ERROR" || item.status === "OUTDATED")
      throw new Error("PLUGGY_ITEM_FAILED");
    if (item.status === "WAITING_USER_INPUT") throw new Error("PLUGGY_ITEM_WAITING_INPUT");
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    item = await client.fetchItem(itemId);
  }
  if (item.status !== "UPDATED") throw new Error("PLUGGY_ITEM_NOT_READY");

  const accounts = (await client.fetchAccounts(itemId)).results;
  for (const account of accounts) {
    const savedAccount = await prisma.financialAccount.upsert({
      where: { pluggyAccountId: account.id },
      create: {
        userId,
        name: account.name || item.connector.name,
        type: account.subtype === "CREDIT_CARD" ? "credit" : account.subtype === "SAVINGS_ACCOUNT" ? "savings" : "checking",
        initialCents: Math.round(account.balance * 100),
        pluggyAccountId: account.id,
      },
      update: {
        name: account.name || item.connector.name,
        initialCents: Math.round(account.balance * 100),
      },
      select: { id: true },
    });

    const transactions = (await client.fetchTransactions(account.id, { page: 1, pageSize: 500 })).results;
    for (const transaction of transactions) {
      const cents = Math.round(Math.abs(transaction.amount) * 100);
      if (!cents) continue;
      await prisma.transaction.upsert({
        where: { pluggyTransactionId: transaction.id },
        create: {
          userId,
          accountId: savedAccount.id,
          description: transaction.description || "Transação bancária",
          type: transaction.amount >= 0 ? "INCOME" : "EXPENSE",
          cents,
          occurredAt: transaction.date,
          pluggyTransactionId: transaction.id,
        },
        update: {
          accountId: savedAccount.id,
          description: transaction.description || "Transação bancária",
          type: transaction.amount >= 0 ? "INCOME" : "EXPENSE",
          cents,
          occurredAt: transaction.date,
        },
      });
    }
  }

  await prisma.pluggyItem.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, connectorName: item.connector.name, status: item.status },
    update: { connectorName: item.connector.name, status: item.status },
  });
  return { accountCount: accounts.length };
}

export async function listPluggyConnectors() {
  const client = new Pluggy(await getApiKey(), process.env.PLUGGY_API_BASE ?? DEFAULT_BASE_URL);
  const response = await client.fetchConnectors(undefined, true);
  return response.results.map((connector: Connector) => ({
    id: connector.id,
    name: connector.name,
    type: connector.type,
    country: connector.country,
    isSandbox: connector.isSandbox,
    health: connector.health?.status ?? "UNKNOWN",
    supportsPaymentInitiation: connector.supportsPaymentInitiation,
  }));
}