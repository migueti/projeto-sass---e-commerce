import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getPlanPriceCents: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminUser: mocks.requireAdminUser }));
vi.mock("@/lib/billing", () => ({ getPlanPriceCents: mocks.getPlanPriceCents }));
vi.mock("@/app/admin/price-form", () => ({ PriceForm: () => null }));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

import AdminPage from "@/app/admin/page";

describe("AdminPage authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlanPriceCents.mockResolvedValue(2_990);
    mocks.notFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("REDIRECT");
    });
  });

  it("hides the page when the user is not an admin", async () => {
    mocks.requireAdminUser.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(AdminPage()).rejects.toThrow("NOT_FOUND");
    expect(mocks.getPlanPriceCents).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", async () => {
    mocks.requireAdminUser.mockRejectedValue(new Error("UNAUTHORIZED"));

    await expect(AdminPage()).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?callbackUrl=%2Fadmin");
  });
});