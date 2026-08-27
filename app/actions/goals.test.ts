import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePaidUser: vi.fn(),
  findFirst: vi.fn(),
  deleteMany: vi.fn(),
  accountFindFirst: vi.fn(),
  goalCount: vi.fn(),
  goalCreate: vi.fn(),
  goalFindFirst: vi.fn(),
  goalUpdateMany: vi.fn(),
  transactionCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePaidUser: mocks.requirePaidUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (client: unknown) => unknown) =>
      callback({
        financialGoal: {
          create: mocks.goalCreate,
          count: mocks.goalCount,
          findFirst: mocks.goalFindFirst,
          updateMany: mocks.goalUpdateMany,
        },
        transaction: { create: mocks.transactionCreate },
      }),
    ),
    financialAccount: { findFirst: mocks.accountFindFirst },
    financialGoal: {
      findFirst: mocks.findFirst,
      deleteMany: mocks.deleteMany,
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  addGoalContribution,
  createGoal,
  deleteGoal,
} from "@/app/actions/goals";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteGoal", () => {
  it("rejects deletion while the goal has contributions", async () => {
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.findFirst.mockResolvedValue({ _count: { contributions: 1 } });

    await expect(deleteGoal("goal-1")).rejects.toThrow(
      "Exclua os aportes da meta antes de excluir a meta.",
    );
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});

describe("createGoal", () => {
  it("creates an initial contribution for a linked account", async () => {
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.accountFindFirst.mockResolvedValue({ id: "account-1" });
    mocks.goalCount.mockResolvedValue(0);
    mocks.goalCreate.mockResolvedValue({ id: "goal-1", name: "Reserva" });

    const formData = new FormData();
    formData.set("name", "Reserva");
    formData.set("target", "1.000,00");
    formData.set("saved", "500,00");
    formData.set("accountId", "account-1");

    await createGoal(formData);

    expect(mocks.transactionCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        accountId: "account-1",
        goalId: "goal-1",
        type: "EXPENSE",
        description: "Aporte inicial para meta: Reserva",
        cents: 50_000,
        occurredAt: expect.any(Date),
      },
    });
  });

  it("rejects new active goals after reaching the limit", async () => {
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.goalCount.mockResolvedValue(100);

    const formData = new FormData();
    formData.set("name", "Reserva");
    formData.set("target", "1.000,00");

    await expect(createGoal(formData)).rejects.toThrow(
      "Você atingiu o limite de metas ativas.",
    );
    expect(mocks.goalCreate).not.toHaveBeenCalled();
  });
});

describe("addGoalContribution", () => {
  it("rejects a contribution to a goal that is not owned by the user", async () => {
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.goalFindFirst.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("amount", "100,00");

    await expect(addGoalContribution("goal-from-another-user", formData)).rejects.toThrow(
      "Meta não encontrada.",
    );
    expect(mocks.goalFindFirst).toHaveBeenCalledWith({
      where: { id: "goal-from-another-user", userId: "user-1", status: "ACTIVE" },
      select: { savedCents: true, targetCents: true, accountId: true, name: true },
    });
    expect(mocks.goalUpdateMany).not.toHaveBeenCalled();
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
  });

  it("does not create a transaction when another contribution wins the update", async () => {
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.goalFindFirst.mockResolvedValue({
      savedCents: 10_000,
      targetCents: 50_000,
      accountId: "account-1",
      name: "Reserva",
    });
    mocks.goalUpdateMany.mockResolvedValue({ count: 0 });

    const formData = new FormData();
    formData.set("amount", "100,00");

    await expect(addGoalContribution("goal-1", formData)).rejects.toThrow(
      "A meta foi alterada por outro aporte. Tente novamente.",
    );
    expect(mocks.goalUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "goal-1",
        userId: "user-1",
        status: "ACTIVE",
        savedCents: 10_000,
      },
      data: { savedCents: 20_000, status: "ACTIVE" },
    });
    expect(mocks.transactionCreate).not.toHaveBeenCalled();
  });
});