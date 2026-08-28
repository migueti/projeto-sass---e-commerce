import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: NO_STORE_HEADERS });
  }
}

export async function HEAD() {
  const response = await GET();
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}