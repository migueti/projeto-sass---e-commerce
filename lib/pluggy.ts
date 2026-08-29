import Pluggy, { type Connector } from "pluggy-js";

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