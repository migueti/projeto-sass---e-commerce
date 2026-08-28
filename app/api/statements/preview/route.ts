import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

import { requirePaidUser } from "@/lib/auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";
import { extractStatementTextFromFile, parseBankStatementText, statementImportLimits } from "@/lib/statement-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requirePaidUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > statementImportLimits.maxBytes)
      return NextResponse.json({ error: "Envie um arquivo de extrato de até 10 MB." }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });

    const fileName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isDocx = file.type.includes("wordprocessingml") || fileName.endsWith(".docx");
    const isXlsx = file.type.includes("spreadsheetml") || file.type.includes("excel") || fileName.endsWith(".xlsx");
    if (!isPdf && !isDocx && !isXlsx && !fileName.endsWith(".txt") && !file.type.startsWith("text/"))
      return NextResponse.json({ error: "O arquivo precisa ser um PDF, DOCX, XLSX ou texto." }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });

    const rawText = isPdf
      ? await (async () => {
          const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
          try {
            const result = await parser.getText();
            return result.text;
          } finally {
            await parser.destroy();
          }
        })()
      : await extractStatementTextFromFile(file);

    const rows = parseBankStatementText(rawText);
    return NextResponse.json({ rows, total: rows.length, requiresConfirmation: true }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS });
    return NextResponse.json({ error: "Não foi possível ler este extrato." }, { status: 422, headers: PRIVATE_NO_STORE_HEADERS });
  }
}