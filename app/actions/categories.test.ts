import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePaidUser: vi.fn(),
  deleteMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePaidUser: mocks.requirePaidUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { category: { deleteMany: mocks.deleteMany } },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { deleteCategory } from "@/app/actions/categories";

describe("deleteCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePaidUser.mockResolvedValue({ id: "user-1", hasPaid: true });
  });

  it("deletes only a category owned by the authenticated user", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    await deleteCategory("category-1");

    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: "category-1", userId: "user-1" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/categorias");
  });

  it("does not revalidate when the category is not owned or does not exist", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteCategory("category-1")).rejects.toThrow(
      "Categoria não encontrada.",
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});