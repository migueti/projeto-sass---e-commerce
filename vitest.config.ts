import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    exclude: [
      "node_modules",
      ".next/**",
      "Mercado-Pago-main principal/**",
      "pluggy mcp/**",
      "index*.ts",
      "pluggy-client*.ts",
      "tools*.ts",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "."),
    },
  },
});
