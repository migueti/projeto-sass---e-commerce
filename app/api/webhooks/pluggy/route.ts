import { NextResponse } from "next/server";
import { z } from "zod";

const WEBHOOK_NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
const pluggyEventSchema = z.object({
  event: z.enum(["item/created", "item/updated", "item/error"]),
  eventId: z.string().trim().min(1).max(200),
  itemId: z.string().trim().min(1).max(200),
  triggeredAt: z.string().datetime().optional(),
  error: z.unknown().optional(),
});
type PluggyEvent = z.infer<typeof pluggyEventSchema>;

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: PluggyEvent;
  try {
    payload = pluggyEventSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Webhook inválido." }, { status: 400, headers: WEBHOOK_NO_STORE_HEADERS });
  }

  if (payload.event === "item/error") {
    console.error("Falha na conexão Pluggy", { eventId: payload.eventId, itemId: payload.itemId });
  }

  return NextResponse.json({ received: true }, { headers: WEBHOOK_NO_STORE_HEADERS });
}