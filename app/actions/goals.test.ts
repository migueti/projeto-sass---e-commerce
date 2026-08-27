import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findFirst: vi.fn(),
  deleteMany: vi.fn(),
  accountFindFirst: vi.fn(),
  goalCount: vi.fn(),
  goalCreate: vi.fn(),
  transactionCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (client: unknown) => unknown) =>
      callback({
        financialGoal: { create: mocks.goalCreate, count: mocks.goalCount },
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

import { createGoal, deleteGoal } from "@/app/actions/goals";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteGoal", () => {
  it("rejects deletion while the goal has contributions", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.findFirst.mockResolvedValue({ _count: { contributions: 1 } });

    await expect(deleteGoal("goal-1")).rejects.toThrow(
      "Exclua os aportes da meta antes de excluir a meta.",
    );
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});

describe("createGoal", () => {
  it("creates an initial contribution for a linked account", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
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
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
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