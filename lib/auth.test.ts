import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

import { requirePaidUser } from "@/lib/auth";

describe("requirePaidUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.redirect.mockImplementation(() => {
      throw new Error("REDIRECT");
    });
  });

  it("allows the configured admin without payment", async () => {
    process.env.ADMIN_EMAIL = "vinipedro629@gmail.com";
    const user = {
      id: "admin-1",
      email: "vinipedro629@gmail.com",
      role: "USER",
      hasPaid: false,
    };
    mocks.findUnique.mockResolvedValue(user);

    await expect(requirePaidUser()).resolves.toEqual(user);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("still redirects unpaid regular users", async () => {
    process.env.ADMIN_EMAIL = "vinipedro629@gmail.com";
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      role: "USER",
      hasPaid: false,
    });

    await expect(requirePaidUser()).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/assinar");
  });
});