import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    exclude: ["node_modules", "Mercado-Pago-main principal/**"],
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "."),
    },
  },
});
