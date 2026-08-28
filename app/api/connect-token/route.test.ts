import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isAdminUser: vi.fn(),
  createPluggyConnectToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser, isAdminUser: mocks.isAdminUser }));
vi.mock("@/lib/pluggy", () => ({ createPluggyConnectToken: mocks.createPluggyConnectToken }));

import { POST } from "@/app/api/connect-token/route";

describe("POST /api/connect-token", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria token usando somente o id da sessão", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.isAdminUser.mockReturnValue(false);
    mocks.createPluggyConnectToken.mockResolvedValue({ accessToken: "token" });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accessToken: "token" });
    expect(mocks.createPluggyConnectToken).toHaveBeenCalledWith("user-1");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
  });

  it("retorna 503 sem expor falhas de autenticação Pluggy", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1", hasPaid: true });
    mocks.isAdminUser.mockReturnValue(false);
    mocks.createPluggyConnectToken.mockRejectedValue(new Error("PLUGGY_AUTH_FAILED"));

    const response = await POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "A integração bancária ainda não está configurada." });
  });

  it("permite administradores sem assinatura", async () => {
    mocks.requireUser.mockResolvedValue({ id: "admin-1", hasPaid: false });
    mocks.isAdminUser.mockReturnValue(true);
    mocks.createPluggyConnectToken.mockResolvedValue({ accessToken: "admin-token" });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accessToken: "admin-token" });
  });
});