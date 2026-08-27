import test from "node:test";
import assert from "node:assert/strict";
import { searchDocumentation } from "../src/docs-client.js";

test("encontra documentacao de Pix no catalogo brasileiro", () => {
  const results = searchDocumentation("Pix");
  assert.ok(results.length > 0);
  assert.ok(results.some((entry) => entry.path.includes("pix")));
});

test("nao retorna resultados para busca vazia", () => {
  assert.deepEqual(searchDocumentation("   "), []);
});
