import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { extractStatementTextFromFile, parseBankStatementText } from "@/lib/statement-import";

describe("parseBankStatementText", () => {
  it("extracts income and expenses from a Santander statement", () => {
    expect(parseBankStatementText(`EXTRATO CONSOLIDADO INTELIGENTE\njulho/2026\n01/07 GIVAS LANCHES 7,00-\n31/07 VENCIMENTO CDB/RDB 1,12\n31/07 PIX RECEBIDO Leila 15,00`)).toEqual([
      { date: "2026-07-01", description: "GIVAS LANCHES", cents: 700, type: "EXPENSE" },
      { date: "2026-07-31", description: "VENCIMENTO CDB/RDB", cents: 112, type: "INCOME" },
      { date: "2026-07-31", description: "PIX RECEBIDO Leila", cents: 1500, type: "INCOME" },
    ]);
  });

  it("ignores balances and duplicate rows", () => {
    const text = "julho/2026\n01/07 SALDO EM 30/06 207,93-\n01/07 COMPRA 7,00-\n01/07 COMPRA 7,00-";
    expect(parseBankStatementText(text)).toEqual([
      { date: "2026-07-01", description: "COMPRA", cents: 700, type: "EXPENSE" },
    ]);
  });

  it("parses lines with R$ prefixes and longer descriptions", () => {
    const text = "junho/2026\n01/06 TRANSFERENCIA PARA JUAN R$ 1.234,56-\n02/06 PIX RECEBIDO MARIA R$ 89,90";
    expect(parseBankStatementText(text)).toEqual([
      { date: "2026-06-01", description: "TRANSFERENCIA PARA JUAN", cents: 123456, type: "EXPENSE" },
      { date: "2026-06-02", description: "PIX RECEBIDO MARIA", cents: 8990, type: "INCOME" },
    ]);
  });

  it("extracts text from DOCX statements before parsing", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>EXTRATO CONSOLIDADO</w:t></w:r></w:p>
          <w:p><w:r><w:t>julho/2026</w:t></w:r></w:p>
          <w:p><w:r><w:t>01/07 GIVAS LANCHES 7,00-</w:t></w:r></w:p>
          <w:p><w:r><w:t>31/07 PIX RECEBIDO Leila 15,00</w:t></w:r></w:p>
        </w:body>
      </w:document>`
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "extrato.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const extracted = await extractStatementTextFromFile(file);

    expect(extracted).toContain("julho/2026");
    expect(parseBankStatementText(extracted)).toEqual([
      { date: "2026-07-01", description: "GIVAS LANCHES", cents: 700, type: "EXPENSE" },
      { date: "2026-07-31", description: "PIX RECEBIDO Leila", cents: 1500, type: "INCOME" },
    ]);
  });

  it("extracts text from XLSX statements before parsing", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Extrato");
    worksheet.addRow(["EXTRATO CONSOLIDADO"]);
    worksheet.addRow(["agosto/2026"]);
    worksheet.addRow(["01/08 COMPRA SUPERMERCADO 42,90-"]);
    worksheet.addRow(["05/08 PIX RECEBIDO João 1.250,00"]);

    const buffer = await workbook.xlsx.writeBuffer();
    const file = new File([buffer], "extrato.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const extracted = await extractStatementTextFromFile(file);

    expect(extracted).toContain("agosto/2026");
    expect(parseBankStatementText(extracted)).toEqual([
      { date: "2026-08-01", description: "COMPRA SUPERMERCADO", cents: 4290, type: "EXPENSE" },
      { date: "2026-08-05", description: "PIX RECEBIDO João", cents: 125000, type: "INCOME" },
    ]);
  });

  it("parses CSV-style bank exports with semicolon separated columns", () => {
    const text = `DATA;DESCRICAO;VALOR
01/09;COMPRA LOJA;42,90-
02/09;PIX RECEBIDO Maria;1.250,00`;

    expect(parseBankStatementText(text)).toEqual([
      { date: "2026-09-01", description: "COMPRA LOJA", cents: 4290, type: "EXPENSE" },
      { date: "2026-09-02", description: "PIX RECEBIDO Maria", cents: 125000, type: "INCOME" },
    ]);
  });

  it("infers debit and credit from description when the value has no sign", () => {
    const text = `01/10 SUPERMERCADO 42,90 DEBITO
02/10 PIX RECEBIDO MARIANA 1.250,00 CREDITO`;

    expect(parseBankStatementText(text)).toEqual([
      { date: "2026-10-01", description: "SUPERMERCADO", cents: 4290, type: "EXPENSE" },
      { date: "2026-10-02", description: "PIX RECEBIDO MARIANA", cents: 125000, type: "INCOME" },
    ]);
  });

  it("parses multi-line bank entries split across lines", () => {
    const text = `01/11
SUPERMERCADO
R$ 42,90
DÉBITO
02/11
PIX RECEBIDO MARIANA
R$ 1.250,00
CRÉDITO`;

    expect(parseBankStatementText(text)).toEqual([
      { date: "2026-11-01", description: "SUPERMERCADO", cents: 4290, type: "EXPENSE" },
      { date: "2026-11-02", description: "PIX RECEBIDO MARIANA", cents: 125000, type: "INCOME" },
    ]);
  });

  it("does not join a fragmented entry with the next dated entry", () => {
    const text = `01/07
COMPRA CARTAO DEB MC
01/07 GIVAS LANCHES
401460 7,00-
COMPRA CARTAO DEB MC
01/07 PD PAES E DELICIAS
451360 3,90-`;

    expect(parseBankStatementText(text)).toEqual([
      { date: "2026-07-01", description: "GIVAS LANCHES", cents: 700, type: "EXPENSE" },
      { date: "2026-07-01", description: "PD PAES E DELICIAS", cents: 390, type: "EXPENSE" },
    ]);
  });

  it("keeps structured entries after multiline entries", () => {
    const text = `01/11
SUPERMERCADO
R$ 42,90
DÉBITO
02/11;PIX RECEBIDO MARIANA;1.250,00`;

    expect(parseBankStatementText(text)).toEqual([
      { date: "2026-11-01", description: "SUPERMERCADO", cents: 4290, type: "EXPENSE" },
      { date: "2026-11-02", description: "PIX RECEBIDO MARIANA", cents: 125000, type: "INCOME" },
    ]);
  });
});