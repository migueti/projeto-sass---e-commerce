import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePaidUser: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  transactionFindMany: vi.fn(),
  transactionDeleteMany: vi.fn(),
  recurringDeleteMany: vi.fn(),
  financialAccountDeleteMany: vi.fn(),
  financialGoalFindFirst: vi.fn(),
  goalUpdateMany: vi.fn(),
  prismaTransaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePaidUser: mocks.requirePaidUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.prismaTransaction,
    financialAccount: {
      create: mocks.create,
      findFirst: mocks.findFirst,
      deleteMany: mocks.financialAccountDeleteMany,
    },
    transaction: {
      findMany: mocks.transactionFindMany,
      deleteMany: mocks.transactionDeleteMany,
    },
    recurringTransaction: {
      deleteMany: mocks.recurringDeleteMany,
    },
    financialGoal: {
      findFirst: mocks.financialGoalFindFirst,
      updateMany: mocks.goalUpdateMany,
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createAccount, deleteAccount } from "@/app/actions/transactions";

function accountForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("name", overrides.name ?? "Nubank");
  formData.set("type", overrides.type ?? "checking");
  formData.set("initialAmount", overrides.initialAmount ?? "100,00");
  return formData;
}

describe("createAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.create.mockResolvedValue({ id: "account-1" });
  });

  it("returns validation errors without mutating the database", async () => {
    const result = await createAccount({ message: "" }, accountForm({ name: "A" }));

    expect(result).toEqual({ message: "Informe o nome da conta." });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns success after creating the account", async () => {
    const result = await createAccount({ message: "" }, accountForm());

    expect(result).toEqual({ message: "Conta adicionada com sucesso." });
    expect(mocks.create).toHaveBeenCalledWith({
      data: { name: "Nubank", type: "checking", initialCents: 10_000, userId: "user-1" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/contas");
  });
});

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.prismaTransaction.mockImplementation(async (callback) => callback({
      financialAccount: {
        findFirst: mocks.findFirst,
        deleteMany: mocks.financialAccountDeleteMany,
      },
      transaction: {
        findMany: mocks.transactionFindMany,
        deleteMany: mocks.transactionDeleteMany,
      },
      recurringTransaction: {
        deleteMany: mocks.recurringDeleteMany,
      },
      financialGoal: {
        findFirst: mocks.financialGoalFindFirst,
        updateMany: mocks.goalUpdateMany,
      },
    }));
  });

  it("removes the account and its related data for the logged user", async () => {
    mocks.findFirst.mockResolvedValue({ id: "account-1", userId: "user-1" });

    mocks.transactionFindMany.mockResolvedValue([
      { goalId: "goal-1", cents: 1500 },
      { goalId: null, cents: 2500 },
    ]);
    mocks.financialGoalFindFirst.mockResolvedValue({ savedCents: 1500, status: "ACTIVE" });
    mocks.goalUpdateMany.mockResolvedValue({ count: 1 });
    mocks.transactionDeleteMany.mockResolvedValue({ count: 2 });
    mocks.recurringDeleteMany.mockResolvedValue({ count: 1 });
    mocks.financialAccountDeleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteAccount("account-1")).resolves.toBeUndefined();

    expect(mocks.goalUpdateMany).toHaveBeenCalledWith({
      where: { id: "goal-1", userId: "user-1", savedCents: 1500 },
      data: { savedCents: { decrement: 1500 }, status: "ACTIVE" },
    });
    expect(mocks.recurringDeleteMany).toHaveBeenCalledWith({ where: { accountId: "account-1", userId: "user-1" } });
    expect(mocks.transactionDeleteMany).toHaveBeenCalledWith({ where: { accountId: "account-1", userId: "user-1" } });
    expect(mocks.financialAccountDeleteMany).toHaveBeenCalledWith({ where: { id: "account-1", userId: "user-1" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/contas");
  });
});