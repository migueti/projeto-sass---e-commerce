import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { resolveIdempotencyKey, webhookSignatureIsValid } from "../src/pix-server.js";

const secret = "webhook-secret";
const dataId = "ORD_TESTE_123";
const requestId = "request-test-123";
const timestamp = "1720000000";
const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
const hash = createHmac("sha256", secret).update(manifest).digest("hex");

test("aceita uma assinatura Mercado Pago valida", () => {
  assert.equal(webhookSignatureIsValid({ signature: `ts=${timestamp},v1=${hash}`, requestId }, dataId, secret), true);
});

test("rejeita assinatura com hash malformado", () => {
  assert.equal(webhookSignatureIsValid({ signature: `ts=${timestamp},v1=nao-hex`, requestId }, dataId, secret), false);
});

test("rejeita assinatura duplicada ou sem request id", () => {
  assert.equal(webhookSignatureIsValid({ signature: `ts=${timestamp},ts=${timestamp},v1=${hash}`, requestId }, dataId, secret), false);
  assert.equal(webhookSignatureIsValid({ signature: `ts=${timestamp},v1=${hash}` }, dataId, secret), false);
});

test("gera uma chave de idempotencia valida quando o header vem ausente ou curto", () => {
  const fallback = resolveIdempotencyKey(undefined);
  assert.equal(typeof fallback, "string");
  assert.ok(fallback.length >= 8);
  assert.equal(resolveIdempotencyKey("abc").length >= 8, true);
  assert.equal(resolveIdempotencyKey("valid-key-123").length >= 8, true);
});