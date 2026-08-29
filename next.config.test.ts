import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("next config security headers", () => {
  it("allows unload only for the Pluggy iframe origin", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toBeTruthy();
    const permissionsHeader = headers?.[0]?.headers?.find(
      (header) => header.key === "Permissions-Policy",
    );

    expect(permissionsHeader).toBeDefined();
    expect(permissionsHeader?.value).toContain('unload=(self "https://connect.pluggy.ai")');
  });
});
