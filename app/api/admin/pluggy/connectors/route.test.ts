import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  listPluggyConnectors: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminUser: mocks.requireAdminUser }));
vi.mock("@/lib/pluggy", () => ({ listPluggyConnectors: mocks.listPluggyConnectors }));

import { GET } from "@/app/api/admin/pluggy/connectors/route";

describe("GET /api/admin/pluggy/connectors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista conectores para administradores sem cache", async () => {
    mocks.requireAdminUser.mockResolvedValue({ id: "admin-1" });
    mocks.listPluggyConnectors.mockResolvedValue([{ id: 1, name: "Pluggy Bank" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ connectors: [{ id: 1, name: "Pluggy Bank" }] });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
  });

  it("bloqueia usuários que não são administradores", async () => {
    mocks.requireAdminUser.mockRejectedValue(new Error("FORBIDDEN"));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Acesso negado." });
  });
});