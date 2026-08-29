import ExcelJS from "exceljs";
import JSZip from "jszip";

const MAX_IMPORT_ROWS = 500;
const MONEY_AMOUNT_PATTERN = /(?<!\d)[+-]?(?:\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+[.,]\d{2})[+-]?(?!\d)/;

export type ImportedStatementRow = {
  date: string;
  description: string;
  cents: number;
  type: "INCOME" | "EXPENSE";
};

function amountToCents(value: string) {
  const normalized = value.trim().replace(/\s+/g, "");
  if (!normalized) return null;

  const unsigned = normalized.replace(/^[-+]+/, "").replace(/[-+]+$/, "");
  if (!/^(?:\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+[.,]\d{2})$/.test(unsigned)) {
    return null;
  }

  const decimalValue = Number.parseFloat(unsigned.replace(/\./g, "").replace(",", "."));
  const cents = Math.round(Math.abs(decimalValue) * 100);

  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function inferYear(text: string) {
  const match = /(janeiro|fevereiro|mar(?:ç|c)o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\/(\d{4})/i.exec(text);
  return match?.[2] ?? String(new Date().getUTCFullYear());
}

function normalizeDescription(value: string) {
  return value
    .replace(/\s+R\$\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+[\d.]+$/, "")
    .replace(/\s+[\-+]$/, "");
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)));
}

function normalizeExtractedText(value: string) {
  return value
    .split(/\r?\n|\s{2,}/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function spreadsheetValueToText(value: unknown): string {
  if (value && typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText))
      return value.richText.map((part) => spreadsheetValueToText(part.text)).join("").trim();
    if ("result" in value) return spreadsheetValueToText(value.result);
    if ("text" in value) return spreadsheetValueToText(value.text);
  }

  return value === null || value === undefined ? "" : String(value).trim();
}

function getSpreadsheetCellText(cell: ExcelJS.Cell) {
  return spreadsheetValueToText(cell.value);
}

function extractDocxText(xml: string) {
  const paragraphs: string[] = [];
  const paragraphPattern = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi;

  for (const paragraphMatch of xml.matchAll(paragraphPattern)) {
    const paragraph = paragraphMatch[1]
      .replace(/<w:tab\b[^>]*\/?\s*>/gi, "\t")
      .replace(/<w:(?:br|cr)\b[^>]*\/?\s*>/gi, "\n");
    const text = Array.from(paragraph.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi), (match) => match[1]).join("");
    const decoded = decodeXmlEntities(text).trim();
    if (decoded) paragraphs.push(decoded);
  }

  return normalizeExtractedText(paragraphs.join("\n"));
}

export async function extractStatementTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const document = zip.file("word/document.xml");
    if (!document) throw new Error("DOCX inválido");

    const xml = await document.async("string");
    return extractDocxText(xml);
  }

  if (fileName.endsWith(".xlsx") || file.type.includes("spreadsheetml") || file.type.includes("excel")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

    const rows: string[] = [];
    workbook.eachSheet((sheet) => {
      sheet.eachRow({ includeEmpty: false }, (row) => {
        const values: string[] = [];
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (cell.isMerged && cell.master.address !== cell.address) return;
          const value = getSpreadsheetCellText(cell);
          if (value) values.push(value);
        });
        const cellText = values.filter(Boolean).join(" ");

        if (cellText) rows.push(cellText);
      });
    });

    return normalizeExtractedText(rows.join("\n"));
  }

  if (fileName.endsWith(".txt") || file.type.startsWith("text/")) {
    return normalizeExtractedText(await file.text());
  }

  throw new Error("Formato de extrato não suportado");
}

function normalizeTextForKeywords(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function inferTypeFromText(value: string, description: string): ImportedStatementRow["type"] {
  const normalized = normalizeTextForKeywords(`${value} ${description}`);
  const isCardStatementRow = /(?:^|\s)\d{4}\.\d{4}\s/.test(normalized);
  const isCreditCardPayment = /PAGAMENTO\s+CARTAO\s+CREDITO/.test(normalized);
  const isExpense = isCardStatementRow || isCreditCardPayment || /(-|DEBITO|DEBIT|SAIDA|PAGAMENTO|COMPRA|TRANSFERENCIA PARA|GASTO)/i.test(normalized);
  const isIncome = /(CREDITO|RECEBIDO|ENTRADA|PIX RECEBIDO|SALARIO|VENCIMENTO|DEPOSITO|RENDIMENTO)/i.test(normalized);
  if (isExpense) return "EXPENSE";
  if (isIncome) return "INCOME";
  return value.includes("-") ? "EXPENSE" : "INCOME";
}

function parseStructuredRows(text: string): ImportedStatementRow[] {
  const year = inferYear(text);
  const rows: ImportedStatementRow[] = [];
  const seen = new Set<string>();

  for (const line of text.split(/\r?\n/)) {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized || !/(\d{1,2})\/(\d{1,2})/.test(normalized)) continue;

    const dateMatch = /(\d{1,2})\/(\d{1,2})/.exec(normalized);
    if (!dateMatch) continue;

    const cells = normalized
      .split(/[;\t|]/)
      .map((cell) => cell.trim())
      .filter(Boolean);

    let amountCellIndex = -1;
    let rawAmountCell = "";
    let description = "";
    let trailingText = "";

    if (cells.length >= 3) {
      const dateCellIndex = cells.findIndex((cell) => /(\d{1,2})\/(\d{1,2})/.test(cell));
      amountCellIndex = cells.findIndex((cell) => MONEY_AMOUNT_PATTERN.test(cell));
      if (amountCellIndex !== -1) {
        rawAmountCell = cells[amountCellIndex];
        const rawAmount = rawAmountCell.replace(/^[^\d\-]*/, "").replace(/\s+/g, "").trim();
        if (!rawAmount) continue;

        const cents = amountToCents(rawAmount);
        if (!cents) continue;

        description = normalizeDescription(
          cells
            .filter((_, index) => index !== dateCellIndex && index !== amountCellIndex)
            .join(" ")
        );
        trailingText = cells.slice(amountCellIndex + 1).join(" ");
        const day = String(dateMatch[1]).padStart(2, "0");
        const month = String(dateMatch[2]).padStart(2, "0");
        const date = `${year}-${month}-${day}`;
        const type = inferTypeFromText(`${rawAmountCell} ${trailingText}`.trim(), description);
        if (!description || description.toUpperCase().startsWith("SALDO")) continue;
        const key = `${date}|${description}|${cents}|${type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ date, description, cents, type });
        if (rows.length >= MAX_IMPORT_ROWS) break;
        continue;
      }
    }

    const amountMatch = MONEY_AMOUNT_PATTERN.exec(normalized);
    if (!amountMatch) continue;

    rawAmountCell = amountMatch[0];
    const rawAmount = rawAmountCell.replace(/^[^\d\-]*/, "").replace(/\s+/g, "").trim();
    if (!rawAmount) continue;

    const cents = amountToCents(rawAmount);
    if (!cents) continue;

    const beforeAmount = normalized.slice(0, amountMatch.index).trim();
    const afterAmount = normalized.slice(amountMatch.index + rawAmountCell.length).trim();
    description = normalizeDescription(beforeAmount.replace(new RegExp(`^${dateMatch[0]}\\s*`, "i"), ""));
    trailingText = afterAmount;
    if (!description) description = normalizeDescription(afterAmount.replace(/^(DEBITO|CREDITO|DEBIT|CREDIT|SAIDA|ENTRADA)\s*/i, ""));
    if (!description || description.toUpperCase().startsWith("SALDO")) continue;

    const day = String(dateMatch[1]).padStart(2, "0");
    const month = String(dateMatch[2]).padStart(2, "0");
    const date = `${year}-${month}-${day}`;
    const type = inferTypeFromText(`${rawAmountCell} ${trailingText}`.trim(), description);
    const key = `${date}|${description}|${cents}|${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ date, description, cents, type });
    if (rows.length >= MAX_IMPORT_ROWS) break;
  }

  return rows;
}

function parseMultilineEntries(text: string): ImportedStatementRow[] {
  const year = inferYear(text);
  const rows: ImportedStatementRow[] = [];
  const seen = new Set<string>();
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const dateMatch = /^(\d{1,2})\/(\d{1,2})(?:\s+(.+))?$/.exec(lines[i]);
    if (!dateMatch) continue;
    if (/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+[.,]\d{2})/.test(dateMatch[3] ?? "")) continue;

    const block = [lines[i]];
    let endIndex = i;
    let amountMatch: RegExpExecArray | null = null;
    const embeddedDateDescription = dateMatch[3] ?? "";

    for (let j = i + 1; j < Math.min(lines.length, i + 10); j += 1) {
      if (/^(\d{1,2})\/(\d{1,2})(?:[ \t;|]|$)/.test(lines[j])) break;
      block.push(lines[j]);
      const combined = block.join(" ");
      amountMatch = MONEY_AMOUNT_PATTERN.exec(combined);
      if (amountMatch) {
        endIndex = j;
        break;
      }
    }

    if (!amountMatch) continue;

    const combined = block.join(" ");
    const amountIndex = combined.indexOf(amountMatch[0]);
    const beforeAmount = combined.slice(0, amountIndex).trim();
    const afterAmount = combined.slice(amountIndex + amountMatch[0].length).trim();

    const sameBlockTail: string[] = [];
    for (let k = endIndex + 1; k < lines.length; k += 1) {
      if (/^(\d{1,2})\/(\d{1,2})(?:[ \t;|]|$)/.test(lines[k])) break;
      sameBlockTail.push(lines[k]);
    }
    const trailingLines = sameBlockTail.join(" ");

    let description = normalizeDescription(embeddedDateDescription || beforeAmount.replace(new RegExp(`^${dateMatch[0]}\\s*`, "i"), ""));
    if (!description) {
      description = normalizeDescription(afterAmount.replace(/^(DEBITO|CREDITO|DEBIT|CREDIT|SAIDA|ENTRADA)\s*/i, ""));
    }
    const rawAmount = amountMatch[0].replace(/^[^\d\-]*/, "").replace(/\s+/g, "").trim();
    const cents = amountToCents(rawAmount);
    if (!description || !cents || description.toUpperCase().startsWith("SALDO")) {
      i = endIndex;
      continue;
    }

    const day = String(dateMatch[1]).padStart(2, "0");
    const month = String(dateMatch[2]).padStart(2, "0");
    const date = `${year}-${month}-${day}`;
    const type = inferTypeFromText(`${amountMatch[0]} ${afterAmount} ${trailingLines}`.trim(), description);
    const key = `${date}|${description}|${cents}|${type}`;
    if (seen.has(key)) {
      i = endIndex;
      continue;
    }
    seen.add(key);
    rows.push({ date, description, cents, type });
    i = endIndex;
  }

  return rows;
}

function deduplicationDescription(value: string) {
  return value.replace(/^\d{4}\.\d{4}\s+/, "").trim().toUpperCase();
}

function mergeImportedRows(...groups: ImportedStatementRow[][]) {
  const rows: ImportedStatementRow[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const row of group) {
      const key = `${row.date}|${deduplicationDescription(row.description)}|${row.cents}|${row.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
      if (rows.length >= MAX_IMPORT_ROWS) return rows;
    }
  }

  return rows;
}

export function parseBankStatementText(text: string): ImportedStatementRow[] {
  const multilineRows = parseMultilineEntries(text);

  const year = inferYear(text);
  const rows: ImportedStatementRow[] = [];
  const seen = new Set<string>();
  const pattern = /(?:^|\n)[ \t]*(\d{1,2})\/(\d{1,2})[ \t]+(.+?)(?:[ \t]+R\$[ \t]*|[ \t]+)((?<!\d)[+-]?(?:\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+[.,]\d{2})[+-]?(?!\d))(?:[ \t]*(DEBITO|DEBIT|CREDITO|CREDIT|SAIDA|ENTRADA))?(-)?[ \t]*(?=\n|$)/gi;

  for (const match of text.matchAll(pattern)) {
    const [, day, month, rawDescription, rawAmount, trailingKeyword, negative] = match;
    const cents = amountToCents(rawAmount);
    const description = normalizeDescription(rawDescription);
    if (!cents || !description || description.toUpperCase().startsWith("SALDO")) continue;

    const date = `${year}-${month}-${day}`;
    const type = inferTypeFromText(`${rawAmount}${negative ?? ""} ${trailingKeyword ?? ""}`.trim(), description);
    const key = `${date}|${description}|${cents}|${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ date, description, cents, type });
    if (rows.length >= MAX_IMPORT_ROWS) break;
  }

  return mergeImportedRows(multilineRows, rows, parseStructuredRows(text));
}

export const statementImportLimits = {
  maxBytes: 10 * 1024 * 1024,
  maxRows: MAX_IMPORT_ROWS,
};