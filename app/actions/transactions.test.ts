import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requirePaidUser: vi.fn(),
  requireOwnedAccount: vi.fn(),
  requireOwnedCategory: vi.fn(),
  requireOwnedTransaction: vi.fn(),
  accountFindFirst: vi.fn(),
  categoryFindFirst: vi.fn(),
  categoryUpsert: vi.fn(),
  transactionCreate: vi.fn(),
  transactionCreateMany: vi.fn(),
  transactionFindMany: vi.fn(),
  transactionFindFirst: vi.fn(),
  transactionDeleteMany: vi.fn(),
  transactionUpdateMany: vi.fn(),
  goalFindFirst: vi.fn(),
  goalUpdateMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePaidUser: mocks.requirePaidUser }));
vi.mock("@/lib/ownership", () => ({
  requireOwnedAccount: mocks.requireOwnedAccount,
  requireOwnedCategory: mocks.requireOwnedCategory,
  requireOwnedTransaction: mocks.requireOwnedTransaction,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (client: unknown) => unknown) => callback({
      transaction: {
        findMany: mocks.transactionFindMany,
        deleteMany: mocks.transactionDeleteMany,
        createMany: mocks.transactionCreateMany,
      },
      financialGoal: {
        findFirst: mocks.goalFindFirst,
        updateMany: mocks.goalUpdateMany,
      },
      category: { upsert: mocks.categoryUpsert },
    })),
    financialAccount: { findFirst: mocks.accountFindFirst },
    category: { findFirst: mocks.categoryFindFirst, upsert: mocks.categoryUpsert },
    transaction: {
      create: mocks.transactionCreate,
      createMany: mocks.transactionCreateMany,
      findFirst: mocks.transactionFindFirst,
      deleteMany: mocks.transactionDeleteMany,
      updateMany: mocks.transactionUpdateMany,
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createTransaction,
  deleteAllTransactions,
  deleteTransaction,
  importTransactions,
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
    mocks.requireOwnedAccount.mockRejectedValue(new UnauthorizedError("Conta não encontrada."));

    await expect(createTransaction(createTransactionForm())).rejects.toThrow(
      "Conta não encontrada.",
    );
    expect(mocks.requireOwnedAccount).toHaveBeenCalledWith("account-1", "user-1");
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
  });

  it("rejects a category that is not owned by the authenticated user", async () => {
    mocks.requireOwnedAccount.mockResolvedValue({ id: "account-1" });
    mocks.requireOwnedCategory.mockRejectedValue(new UnauthorizedError("Categoria não encontrada."));

    const formData = createTransactionForm();
    formData.set("categoryId", "category-1");

    await expect(createTransaction(formData)).rejects.toThrow(
      "Categoria não encontrada.",
    );
    expect(mocks.requireOwnedCategory).toHaveBeenCalledWith("category-1", "user-1");
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
  });
});

describe("transaction ownership mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
  });

  it("does not delete a transaction that is not owned by the user", async () => {
    mocks.requireOwnedTransaction.mockRejectedValue(new UnauthorizedError("Lançamento não encontrado."));

    await expect(deleteTransaction("transaction-1")).rejects.toThrow(
      "Lançamento não encontrado.",
    );
    expect(mocks.requireOwnedTransaction).toHaveBeenCalledWith("transaction-1", "user-1");
    expect(mocks.transactionDeleteMany).not.toHaveBeenCalled();
  });

  it("does not update a transaction that is not owned by the user", async () => {
    mocks.requireOwnedTransaction.mockRejectedValue(new UnauthorizedError("Lançamento não encontrado."));

    await expect(updateTransaction("transaction-1", createTransactionForm())).rejects.toThrow(
      "Lançamento não encontrado.",
    );
    expect(mocks.requireOwnedTransaction).toHaveBeenCalledWith("transaction-1", "user-1");
    expect(mocks.transactionUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects invalid transaction identifiers before querying the database", async () => {
    await expect(deleteTransaction("   ")).rejects.toThrow("Lançamento inválido.");
    await expect(updateTransaction("   ", createTransactionForm())).rejects.toThrow("Lançamento inválido.");
    expect(mocks.transactionFindFirst).not.toHaveBeenCalled();
  });

  it("imports validated rows only into an owned account", async () => {
    mocks.accountFindFirst.mockResolvedValue({ id: "account-1" });
    mocks.categoryUpsert.mockResolvedValueOnce({ id: "category-outros" });
    mocks.transactionCreateMany.mockResolvedValue({ count: 1 });

    await expect(importTransactions([
      { date: "2026-03-01", description: "Compra", cents: 5_000, type: "EXPENSE" },
    ], "account-1")).resolves.toBe(1);

    expect(mocks.categoryUpsert).toHaveBeenCalledWith({
      where: { userId_name: { userId: "user-1", name: "Outros" } },
      create: { userId: "user-1", name: "Outros", color: "#a0a69e" },
      update: {},
      select: { id: true },
    });
    expect(mocks.transactionCreateMany).toHaveBeenCalledWith({
      data: [{
        userId: "user-1",
        accountId: "account-1",
        categoryId: "category-outros",
        description: "Compra",
        type: "EXPENSE",
        cents: 5_000,
        occurredAt: new Date("2026-03-01T12:00:00.000Z"),
      }],
    });
  });

  it("rejects malformed imported rows before writing", async () => {
    await expect(importTransactions([
      { date: "01/03/2026", description: "Compra", cents: 5_000, type: "EXPENSE" },
    ], "account-1")).rejects.toThrow("O extrato contém uma data inválida.");
    expect(mocks.accountFindFirst).not.toHaveBeenCalled();
    expect(mocks.transactionCreateMany).not.toHaveBeenCalled();
  });

  it("deletes all owned transactions and reverses goal contributions", async () => {
    mocks.transactionFindMany.mockResolvedValue([
      { cents: 1_000, goalId: "goal-1" },
      { cents: 500, goalId: null },
    ]);
    mocks.goalFindFirst.mockResolvedValue({ savedCents: 2_000, status: "COMPLETED" });
    mocks.goalUpdateMany.mockResolvedValue({ count: 1 });
    mocks.transactionDeleteMany.mockResolvedValue({ count: 2 });

    await expect(deleteAllTransactions()).resolves.toBe(2);

    expect(mocks.goalUpdateMany).toHaveBeenCalledWith({
      where: { id: "goal-1", userId: "user-1", savedCents: 2_000 },
      data: { savedCents: { decrement: 1_000 }, status: "ACTIVE" },
    });
    expect(mocks.transactionDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});