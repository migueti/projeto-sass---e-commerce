import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePaidUser: vi.fn(),
  accountFindFirst: vi.fn(),
  categoryFindFirst: vi.fn(),
  recurrenceCreate: vi.fn(),
  recurrenceDeleteMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePaidUser: mocks.requirePaidUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: { findFirst: mocks.accountFindFirst },
    category: { findFirst: mocks.categoryFindFirst },
    recurringTransaction: {
      create: mocks.recurrenceCreate,
      deleteMany: mocks.recurrenceDeleteMany,
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createRecurrence, deleteRecurrence } from "@/app/actions/recurrences";

function recurrenceForm() {
  const formData = new FormData();
  formData.set("description", "Aluguel");
  formData.set("amount", "1.000,00");
  formData.set("type", "EXPENSE");
  formData.set("frequency", "MONTHLY");
  formData.set("accountId", "account-1");
  formData.set("nextOccurrence", "2026-09-05");
  return formData;
}

describe("recurrence ownership mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
  });

  it("rejects an account that is not owned by the authenticated user", async () => {
    mocks.accountFindFirst.mockResolvedValue(null);

    await expect(createRecurrence(recurrenceForm())).rejects.toThrow(
      "Conta não encontrada.",
    );
    expect(mocks.accountFindFirst).toHaveBeenCalledWith({
      where: { id: "account-1", userId: "user-1" },
    });
    expect(mocks.recurrenceCreate).not.toHaveBeenCalled();
  });

  it("rejects a category that is not owned by the authenticated user", async () => {
    mocks.accountFindFirst.mockResolvedValue({ id: "account-1" });
    mocks.categoryFindFirst.mockResolvedValue(null);

    const formData = recurrenceForm();
    formData.set("categoryId", "category-1");

    await expect(createRecurrence(formData)).rejects.toThrow(
      "Categoria não encontrada.",
    );
    expect(mocks.categoryFindFirst).toHaveBeenCalledWith({
      where: { id: "category-1", userId: "user-1" },
    });
    expect(mocks.recurrenceCreate).not.toHaveBeenCalled();
  });

  it("does not delete a recurrence that is not owned by the user", async () => {
    mocks.recurrenceDeleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteRecurrence("recurrence-1")).rejects.toThrow(
      "Recorrência não encontrada.",
    );
    expect(mocks.recurrenceDeleteMany).toHaveBeenCalledWith({
      where: { id: "recurrence-1", userId: "user-1" },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
