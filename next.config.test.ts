import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("next config security headers", () => {
  it("does not disable unload permission because Pluggy iframe needs it", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toBeTruthy();
    const permissionsHeader = headers?.[0]?.headers?.find(
      (header) => header.key === "Permissions-Policy",
    );

    expect(permissionsHeader).toBeDefined();
    expect(permissionsHeader?.value).not.toContain("unload");
  });
});
