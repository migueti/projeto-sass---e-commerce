import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionClient = {
    transaction: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    financialGoal: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    requireUser: vi.fn(),
    transactionClient,
    prisma: {
      $transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
        callback(transactionClient),
      ),
    },
  };
});

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { DELETE } from "@/app/api/transactions/[id]/route";

describe("DELETE /api/transactions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reverts a linked goal contribution before deleting it", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.transactionClient.transaction.findFirst.mockResolvedValue({
      cents: 10_000,
      goalId: "goal-1",
    });
    mocks.transactionClient.financialGoal.findFirst.mockResolvedValue({
      savedCents: 10_000,
      status: "COMPLETED",
    });
    mocks.transactionClient.financialGoal.updateMany.mockResolvedValue({ count: 1 });
    mocks.transactionClient.transaction.deleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "transaction-1" }),
    });

    expect(response.status).toBe(204);
    expect(mocks.transactionClient.financialGoal.updateMany).toHaveBeenCalledWith({
      where: { id: "goal-1", userId: "user-1", savedCents: 10_000 },
      data: { savedCents: { decrement: 10_000 }, status: "ACTIVE" },
    });
    expect(mocks.transactionClient.transaction.deleteMany).toHaveBeenCalledWith({
      where: { id: "transaction-1", userId: "user-1" },
    });
  });

  it("does not delete a transaction that is not owned by the user", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.transactionClient.transaction.findFirst.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "transaction-from-another-user" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Lançamento não encontrado." });
    expect(mocks.transactionClient.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        id: "transaction-from-another-user",
        userId: "user-1",
      },
      select: { cents: true, goalId: true },
    });
    expect(mocks.transactionClient.transaction.deleteMany).not.toHaveBeenCalled();
  });
});