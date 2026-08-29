import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";
import { syncPluggyItem } from "@/lib/pluggy";
import { revalidatePath } from "next/cache";

const itemSchema = z.object({ itemId: z.string().trim().min(1).max(200) });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = itemSchema.parse(await request.json());
    const result = await syncPluggyItem(payload.itemId, user.id);
    revalidatePath("/contas");
    revalidatePath("/lancamentos");
    revalidatePath("/");
    return NextResponse.json(result, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "PLUGGY_ITEM_NOT_OWNED")
      return NextResponse.json({ error: "A conexão Pluggy não pertence a este usuário." }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "PLUGGY_ITEM_WAITING_INPUT")
      return NextResponse.json({ error: "A conexão Pluggy ainda aguarda uma confirmação." }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "PLUGGY_ITEM_NOT_READY")
      return NextResponse.json({ error: "A conexão foi autorizada, mas os dados ainda estão sendo processados. Tente atualizar em alguns segundos." }, { status: 409, headers: PRIVATE_NO_STORE_HEADERS });
    if (error instanceof Error && error.message === "PLUGGY_ITEM_FAILED")
      return NextResponse.json({ error: "O Pluggy não conseguiu concluir a sincronização desta conexão." }, { status: 422, headers: PRIVATE_NO_STORE_HEADERS });
    return NextResponse.json({ error: "Não foi possível importar os dados bancários." }, { status: 502, headers: PRIVATE_NO_STORE_HEADERS });
  }
}