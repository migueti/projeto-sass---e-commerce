import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardDateRange, parseDashboardFilters } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

async function createPdf(rows: Array<{ description: string; type: string; cents: number; occurredAt: Date; account: { name: string }; category: { name: string } | null }>, title: string) {
  const document = new PDFDocument({ margin: 48 });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve) => {
    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
  });

  document.fontSize(20).fillColor("#344135").text("nuvem.");
  document.moveDown(0.5).fontSize(14).fillColor("#20251f").text(title);
  document.moveDown().fontSize(9).fillColor("#727b72").text(`Gerado em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`);
  document.moveDown();
  rows.forEach((row, index) => {
    const value = `${row.type === "INCOME" ? "+" : "-"} ${money(row.cents)}`;
    document.fontSize(10).fillColor("#4b534b").text(`${index + 1}. ${row.description} | ${row.category?.name ?? "Sem categoria"} | ${row.account.name}`);
    document.fontSize(10).fillColor(row.type === "INCOME" ? "#5d8e63" : "#d37f74").text(`${new Intl.DateTimeFormat("pt-BR").format(row.occurredAt)}    ${value}`, { indent: 16 });
    document.moveDown(0.4);
  });
  document.end();
  return result;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const filters = parseDashboardFilters(params);
    const { start, end } = getDashboardDateRange(filters.period);
    const rows = await prisma.transaction.findMany({
      where: { userId: user.id, occurredAt: { gte: start, lte: end }, ...(filters.accountId ? { accountId: filters.accountId } : {}), ...(filters.categoryId ? { categoryId: filters.categoryId } : {}) },
      include: { account: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });
    const format = params.get("format") ?? "xlsx";
    const title = `Lançamentos · ${filters.period === "year" ? "Este ano" : filters.period === "30days" ? "Últimos 30 dias" : "Este mês"}`;

    if (format === "pdf") {
      const buffer = await createPdf(rows, title);
      return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="nuvem-lancamentos.pdf"' } });
    }
    if (format !== "xlsx") return NextResponse.json({ error: "Formato inválido." }, { status: 400 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Lançamentos");
    sheet.columns = [{ header: "Descrição", key: "description", width: 32 }, { header: "Tipo", key: "type", width: 14 }, { header: "Valor", key: "amount", width: 18 }, { header: "Data", key: "date", width: 16 }, { header: "Conta", key: "account", width: 22 }, { header: "Categoria", key: "category", width: 20 }];
    rows.forEach((row) => sheet.addRow({ description: row.description, type: row.type === "INCOME" ? "Receita" : "Despesa", amount: row.cents / 100, date: row.occurredAt, account: row.account.name, category: row.category?.name ?? "Sem categoria" }));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5D8E63" } };
    sheet.getColumn("amount").numFmt = 'R$ #,##0.00';
    sheet.getColumn("date").numFmt = "dd/mm/yyyy";
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="nuvem-lancamentos.xlsx"' } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (error instanceof Error && error.message === "INVALID_PERIOD") return NextResponse.json({ error: "Período inválido." }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível gerar a exportação." }, { status: 500 });
  }
}
