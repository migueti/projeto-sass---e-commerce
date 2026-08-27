import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  upsert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminUser: mocks.requireAdminUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { appSettings: { upsert: mocks.upsert } } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updatePlanPrice } from "@/app/actions/admin";

describe("updatePlanPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("persists a valid Brazilian price", async () => {
    const formData = new FormData();
    formData.set("price", "49,90");

    await expect(updatePlanPrice({}, formData)).resolves.toEqual({ success: true });
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { id: "global" },
      create: { id: "global", planPriceCents: 4_990 },
      update: { planPriceCents: 4_990 },
    });
  });

  it("does not update an invalid price", async () => {
    const formData = new FormData();
    formData.set("price", "0,00");

    await expect(updatePlanPrice({}, formData)).resolves.toEqual({
      error: "Informe um preço válido maior que zero.",
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
