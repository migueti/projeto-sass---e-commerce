import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: queryRaw },
}));

import { GET, HEAD } from "@/app/api/health/route";

describe("health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms application and database availability", async () => {
    queryRaw.mockResolvedValue([{ 1: 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns service unavailable without exposing database details", async () => {
    queryRaw.mockRejectedValue(new Error("database credentials leaked"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("supports bodyless readiness probes with HEAD", async () => {
    queryRaw.mockResolvedValue([{ 1: 1 }]);

    const response = await HEAD();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(queryRaw).toHaveBeenCalledOnce();
  });
});