import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const WEBHOOK_NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
const WEBHOOK_REQUEST_TTL_MS = 5 * 60 * 1000;
const WEBHOOK_EVENT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_INVALID_REQUESTS_PER_WINDOW = 20;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const processedEventIds = new Map<string, number>();

const pluggyEventSchema = z.object({
  event: z.enum([
    "item/created",
    "item/updated",
    "item/error",
    "transactions/created",
    "transactions/updated",
    "transactions/deleted",
  ]),
  eventId: z.string().trim().min(1).max(200),
  itemId: z.string().trim().min(1).max(200),
  accountId: z.string().trim().min(1).max(200).optional(),
  transactionIds: z.array(z.string().trim().min(1).max(200)).max(10_000).optional(),
  clientUserId: z.string().trim().min(1).max(200).optional(),
  triggeredBy: z.string().trim().min(1).max(50).optional(),
  triggeredAt: z.string().datetime().optional(),
  error: z.unknown().optional(),
});
type PluggyEvent = z.infer<typeof pluggyEventSchema>;

function isValidPluggySignature(signature: string | null, payload: unknown) {
  const secret = process.env.PLUGGY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature || signature.length < 64) return false;

  const rawBody = typeof payload === "string" ? payload : JSON.stringify(payload ?? null);
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = Buffer.from(signature, "hex");
  const expected = Buffer.from(digest, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function normalizeClientIdentifier(identifier: string | null) {
  const candidate = identifier?.trim();
  if (!candidate) return "unknown";

  const directAddress = candidate
    .split(",")
    .map((part) => part.trim())
    .find(Boolean) ?? candidate;

  const normalizedAddress = directAddress.toLowerCase();

  if (/^\[[^\]]+\](?::\d+)?$/.test(normalizedAddress)) {
    return normalizedAddress.replace(/^\[|\](?::\d+)?$/g, "");
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$/.test(normalizedAddress)) {
    return normalizedAddress.replace(/:\d+$/, "");
  }

  return normalizedAddress;
}

function getClientIdentifier(request: Request) {
  return request.headers.get("x-forwarded-for")
    ?? request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

function isRateLimited(identifier: string, now = Date.now()) {
  const normalizedIdentifier = normalizeClientIdentifier(identifier);
  const current = rateLimitBuckets.get(normalizedIdentifier);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(normalizedIdentifier, { count: 1, resetAt: now + WEBHOOK_REQUEST_TTL_MS });
    return false;
  }

  if (current.count >= MAX_INVALID_REQUESTS_PER_WINDOW) return true;
  current.count += 1;
  return false;
}

function isDuplicateEvent(eventId: string, now = Date.now()) {
  if (!eventId) return false;

  for (const [registeredId, registeredAt] of processedEventIds.entries()) {
    if (registeredAt <= now - WEBHOOK_EVENT_TTL_MS) {
      processedEventIds.delete(registeredId);
    }
  }

  const seenAt = processedEventIds.get(eventId);
  if (seenAt) {
    return true;
  }

  processedEventIds.set(eventId, now);
  return false;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const rawBody = await request.clone().text();
  const signature = request.headers.get("x-pluggy-signature");

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: "Webhook inválido." }, { status: 400, headers: WEBHOOK_NO_STORE_HEADERS });
  }

  if (!signature || !isValidPluggySignature(signature, rawBody)) {
    if (isRateLimited(identifier)) {
      return NextResponse.json({ error: "Webhook não autorizado." }, { status: 429, headers: WEBHOOK_NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401, headers: WEBHOOK_NO_STORE_HEADERS });
  }

  let parsedPayload: PluggyEvent;
  try {
    parsedPayload = pluggyEventSchema.parse(payload);
  } catch {
    return NextResponse.json({ error: "Webhook inválido." }, { status: 400, headers: WEBHOOK_NO_STORE_HEADERS });
  }

  if (isDuplicateEvent(parsedPayload.eventId)) {
    return NextResponse.json({ received: true, duplicate: true }, { headers: WEBHOOK_NO_STORE_HEADERS });
  }

  if (parsedPayload.event === "item/error") {
    console.error("Falha na conexão Pluggy", { eventId: parsedPayload.eventId, itemId: parsedPayload.itemId });
  }

  return NextResponse.json({ received: true }, { headers: WEBHOOK_NO_STORE_HEADERS });
}