import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isAdminUser: vi.fn(),
  getPlanPriceCents: vi.fn(),
  createCheckoutPreference: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
  isAdminUser: mocks.isAdminUser,
}));
vi.mock("@/lib/billing", () => ({ getPlanPriceCents: mocks.getPlanPriceCents }));
vi.mock("@/lib/mercado-pago", () => ({
  createCheckoutPreference: mocks.createCheckoutPreference,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));

import { POST as checkout } from "@/app/api/payments/checkout/route";
import { GET as plan } from "@/app/api/payments/plan/route";
import { GET as status } from "@/app/api/payments/status/route";

const expectPrivateResponse = (response: Response) => {
  expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
};

describe("payment routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdminUser.mockReturnValue(false);
  });

  it("returns the user's payment status without caching it", async () => {
    mocks.requireUser.mockResolvedValue({ hasPaid: true, email: "user@example.com" });

    const response = await status();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hasPaid: true });
    expectPrivateResponse(response);
  });

  it("returns the plan price only to authenticated users", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.getPlanPriceCents.mockResolvedValue(2_990);

    const response = await plan();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ priceCents: 2_990 });
    expectPrivateResponse(response);
  });

  it("returns 401 for unauthenticated payment status requests", async () => {
    mocks.requireUser.mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await status();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Não autenticado." });
    expectPrivateResponse(response);
  });

  it("does not create checkout preferences for users who already paid", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1", email: "user@example.com", hasPaid: true });

    const response = await checkout();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ alreadyPaid: true });
    expect(mocks.createCheckoutPreference).not.toHaveBeenCalled();
    expectPrivateResponse(response);
  });

  it("does not create checkout preferences for administrators", async () => {
    mocks.requireUser.mockResolvedValue({ id: "admin-1", email: "admin@example.com", hasPaid: false });
    mocks.isAdminUser.mockReturnValue(true);

    const response = await checkout();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ alreadyPaid: true });
    expect(mocks.createCheckoutPreference).not.toHaveBeenCalled();
    expectPrivateResponse(response);
  });

  it("returns a recoverable error when checkout is not configured", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1", email: "user@example.com", hasPaid: false });
    mocks.createCheckoutPreference.mockRejectedValue(new Error("MERCADOPAGO_NOT_CONFIGURED"));

    const response = await checkout();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "O pagamento ainda não está configurado." });
    expectPrivateResponse(response);
  });
});