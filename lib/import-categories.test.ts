import { describe, expect, it } from "vitest";

import { categoryForImportedTransaction } from "@/lib/import-categories";

const row = (description: string, type: "INCOME" | "EXPENSE" = "EXPENSE") => ({
  date: "2026-07-01",
  description,
  cents: 1_000,
  type,
});

describe("categoryForImportedTransaction", () => {
  it("categorizes common expenses by description", () => {
    expect(categoryForImportedTransaction(row("DROGARIA BRASIL")).name).toBe("Saúde");
    expect(categoryForImportedTransaction(row("PD PAES E DELICIAS")).name).toBe("Alimentação");
    expect(categoryForImportedTransaction(row("UBER TRIP")).name).toBe("Transporte");
  });

  it("categorizes salary income separately", () => {
    expect(categoryForImportedTransaction(row("SALARIO EMPRESA", "INCOME")).name).toBe("Receitas");
  });

  it("uses Outros when no known keyword matches", () => {
    expect(categoryForImportedTransaction(row("ESTABELECIMENTO DESCONHECIDO")).name).toBe("Outros");
  });
});
