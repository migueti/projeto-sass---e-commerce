import type { ImportedStatementRow } from "@/lib/statement-import";

const categoryRules: Array<{ name: string; color: string; keywords: string[] }> = [
  { name: "Alimentação", color: "#e0c98f", keywords: ["ALIMENT", "MERCADO", "SUPERMERCADO", "PADARIA", "PAES", "LANCH", "RESTAUR", "IFOOD", "BURGER", "SORVETER", "CARREFOUR"] },
  { name: "Saúde", color: "#e78c7d", keywords: ["DROGARIA", "FARMAC", "OTICA", "SAUDE", "HOSPITAL", "CLINICA"] },
  { name: "Transporte", color: "#9284b5", keywords: ["UBER", "99APP", "COMBUST", "POSTO", "GASOLINA", "TRANSPORTE"] },
  { name: "Moradia", color: "#6a9471", keywords: ["ALUGUEL", "ENERGIA", "AGUA", "INTERNET", "TELEFONE", "CELULAR", "CLARO", "CASA"] },
  { name: "Lazer", color: "#d37f74", keywords: ["GOOGLE", "CINEMA", "BARBEARIA", "LAZER", "JOGO"] },
  { name: "Transferências", color: "#7b837b", keywords: ["PIX", "TRANSFERENCIA", "TED", "DOC"] },
];

export function categoryForImportedTransaction(row: ImportedStatementRow) {
  const normalized = row.description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (row.type === "INCOME" && /SALARIO|RECEBIDO|VENCIMENTO|RENDIMENTO|DEPOSITO/.test(normalized))
    return { name: "Receitas", color: "#5d8e63" };

  return categoryRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword))) ?? {
    name: "Outros",
    color: "#a0a69e",
  };
}
