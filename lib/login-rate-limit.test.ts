import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeLoginAttempt,
  consumeRegistrationAttempt,
  loginRateLimit,
  resetLoginAttempts,
} from "@/lib/login-rate-limit";

describe("login rate limit", () => {
  const identifier = "user@example.com";

  beforeEach(() => resetLoginAttempts(identifier));

  it("blocks attempts after the window limit", () => {
    const now = 1_000;

    for (let attempt = 0; attempt < loginRateLimit.maxAttempts; attempt += 1) {
      expect(consumeLoginAttempt(identifier, now)).toBe(true);
    }
    expect(consumeLoginAttempt(identifier, now)).toBe(false);
  });

  it("allows attempts after the window expires", () => {
    const now = 1_000;

    for (let attempt = 0; attempt < loginRateLimit.maxAttempts; attempt += 1) {
      consumeLoginAttempt(identifier, now);
    }

    expect(consumeLoginAttempt(identifier, now + loginRateLimit.windowMs)).toBe(true);
  });

  it("resets attempts after a successful login", () => {
    const now = 1_000;
    consumeLoginAttempt(identifier, now);
    resetLoginAttempts(identifier);

    expect(consumeLoginAttempt(identifier, now)).toBe(true);
  });

  it("keeps registration attempts isolated from login attempts", () => {
    const now = 1_000;

    for (let attempt = 0; attempt < loginRateLimit.maxAttempts; attempt += 1) {
      consumeRegistrationAttempt(identifier, now);
    }

    expect(consumeRegistrationAttempt(identifier, now)).toBe(false);
    expect(consumeLoginAttempt(identifier, now)).toBe(true);
  });
});