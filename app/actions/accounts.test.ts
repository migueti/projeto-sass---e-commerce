import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePaidUser: vi.fn(),
  create: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePaidUser: mocks.requirePaidUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { financialAccount: { create: mocks.create } },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createAccount } from "@/app/actions/transactions";

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