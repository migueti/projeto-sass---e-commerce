import { describe, expect, it } from "vitest";

import { publicRoutePattern } from "@/proxy";

const isPublicRoute = new RegExp(`^(?:${publicRoutePattern})`);

describe("protected route matcher", () => {
  it("keeps only exact public route segments outside authentication", () => {
    expect(isPublicRoute.test("login")).toBe(true);
    expect(isPublicRoute.test("login/reset")).toBe(true);
    expect(isPublicRoute.test("cadastro")).toBe(true);
    expect(isPublicRoute.test("api/auth/session")).toBe(true);
    expect(isPublicRoute.test("api/me")).toBe(true);
    expect(isPublicRoute.test("api/dashboard")).toBe(true);
    expect(isPublicRoute.test("api/payments/webhook")).toBe(true);
    expect(isPublicRoute.test("api/payments/webhook/extra")).toBe(true);
    expect(isPublicRoute.test("login-admin")).toBe(false);
    expect(isPublicRoute.test("api/authz")).toBe(true);
  });
});