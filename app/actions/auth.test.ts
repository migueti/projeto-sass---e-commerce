import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hash: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash } }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));

import { registerUser } from "@/app/actions/auth";

describe("registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue("hashed-password");
  });

  it("does not reveal whether an email is already registered", async () => {
    mocks.findUnique.mockResolvedValue({ id: "user-1" });
    const formData = new FormData();
    formData.set("name", "Pessoa Teste");
    formData.set("email", `existing-${Date.now()}@example.com`);
    formData.set("password", "password-valid");

    const result = await registerUser({}, formData);

    expect(result).toEqual({ error: "Não foi possível criar sua conta agora." });
    expect(mocks.hash).toHaveBeenCalledWith("password-valid", 12);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});