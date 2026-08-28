import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePaidUser: vi.fn(),
  accountFindFirst: vi.fn(),
  categoryFindFirst: vi.fn(),
  transactionCreate: vi.fn(),
  transactionFindFirst: vi.fn(),
  transactionDeleteMany: vi.fn(),
  transactionUpdateMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePaidUser: mocks.requirePaidUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: { findFirst: mocks.accountFindFirst },
    category: { findFirst: mocks.categoryFindFirst },
    transaction: {
      create: mocks.transactionCreate,
      findFirst: mocks.transactionFindFirst,
      deleteMany: mocks.transactionDeleteMany,
      updateMany: mocks.transactionUpdateMany,
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/app/actions/transactions";

function createTransactionForm() {
  const formData = new FormData();
  formData.set("description", "Compra");
  formData.set("amount", "50,00");
  formData.set("type", "EXPENSE");
  formData.set("accountId", "account-1");
  formData.set("occurredAt", "2026-03-01");
  return formData;
}

describe("createTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
  });

  it("rejects an account that is not owned by the authenticated user", async () => {
    mocks.accountFindFirst.mockResolvedValue(null);

    await expect(createTransaction(createTransactionForm())).rejects.toThrow(
      "Conta não encontrada.",
    );
    expect(mocks.accountFindFirst).toHaveBeenCalledWith({
      where: { id: "account-1", userId: "user-1" },
    });
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
  });

  it("rejects a category that is not owned by the authenticated user", async () => {
    mocks.accountFindFirst.mockResolvedValue({ id: "account-1" });
    mocks.categoryFindFirst.mockResolvedValue(null);

    const formData = createTransactionForm();
    formData.set("categoryId", "category-1");

    await expect(createTransaction(formData)).rejects.toThrow(
      "Categoria não encontrada.",
    );
    expect(mocks.categoryFindFirst).toHaveBeenCalledWith({
      where: { id: "category-1", userId: "user-1" },
    });
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
  });
});

describe("transaction ownership mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
  });

  it("does not delete a transaction that is not owned by the user", async () => {
    mocks.transactionFindFirst.mockResolvedValue(null);

    await expect(deleteTransaction("transaction-1")).rejects.toThrow(
      "Lançamento não encontrado.",
    );
    expect(mocks.transactionFindFirst).toHaveBeenCalledWith({
      where: { id: "transaction-1", userId: "user-1" },
      select: { goalId: true },
    });
    expect(mocks.transactionDeleteMany).not.toHaveBeenCalled();
  });

  it("does not update a transaction that is not owned by the user", async () => {
    mocks.transactionFindFirst.mockResolvedValue(null);

    await expect(updateTransaction("transaction-1", createTransactionForm())).rejects.toThrow(
      "Lançamento não encontrado.",
    );
    expect(mocks.transactionFindFirst).toHaveBeenCalledWith({
      where: { id: "transaction-1", userId: "user-1" },
      select: { goalId: true },
    });
    expect(mocks.transactionUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects invalid transaction identifiers before querying the database", async () => {
    await expect(deleteTransaction("   ")).rejects.toThrow("Lançamento inválido.");
    await expect(updateTransaction("   ", createTransactionForm())).rejects.toThrow("Lançamento inválido.");
    expect(mocks.transactionFindFirst).not.toHaveBeenCalled();
  });
});