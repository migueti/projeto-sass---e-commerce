import { describe, expect, it } from "vitest";

import { PRIVATE_NO_STORE_HEADERS } from "@/lib/http";

describe("private response headers", () => {
  it("prevents authenticated data from being stored by caches", () => {
    expect(PRIVATE_NO_STORE_HEADERS).toEqual({
      "Cache-Control": "private, no-store, max-age=0",
    });
  });
});