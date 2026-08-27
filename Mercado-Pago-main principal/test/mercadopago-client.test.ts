/// <reference types="node" />

import test from "node:test";
import assert from "node:assert/strict";
import { isReadOnly, requireMutationConfirmation, requireWritesEnabled } from "../src/mercadopago-client.js";
import { paymentStatus, publicPaymentStatus } from "../src/pix-status.js";

test("mantem modo somente leitura por padrao", () => {
  const previous = process.env.MERCADOPAGO_READ_ONLY;
  delete process.env.MERCADOPAGO_READ_ONLY;
  assert.equal(isReadOnly(), true);
  if (previous === undefined) delete process.env.MERCADOPAGO_READ_ONLY;
  else process.env.MERCADOPAGO_READ_ONLY = previous;
});

test("bloqueia mutacao sem modo explicitamente habilitado", () => {
  const previous = process.env.MERCADOPAGO_READ_ONLY;
  process.env.MERCADOPAGO_READ_ONLY = "true";
  assert.throws(() => requireMutationConfirmation(true, "idempotency-test"), /somente leitura/i);
  if (previous === undefined) delete process.env.MERCADOPAGO_READ_ONLY;
  else process.env.MERCADOPAGO_READ_ONLY = previous;
});

test("bloqueia escrita web no modo somente leitura", () => {
  const previous = process.env.MERCADOPAGO_READ_ONLY;
  process.env.MERCADOPAGO_READ_ONLY = "true";
  assert.throws(() => requireWritesEnabled(), /somente leitura/i);
  if (previous === undefined) delete process.env.MERCADOPAGO_READ_ONLY;
  else process.env.MERCADOPAGO_READ_ONLY = previous;
});

test("permite escrita somente quando read-only e false", () => {
  const previous = process.env.MERCADOPAGO_READ_ONLY;
  process.env.MERCADOPAGO_READ_ONLY = "false";
  assert.doesNotThrow(() => requireWritesEnabled());
  if (previous === undefined) delete process.env.MERCADOPAGO_READ_ONLY;
  else process.env.MERCADOPAGO_READ_ONLY = previous;
});

test("exige confirmacao e idempotencia para mutacoes", () => {
  const previous = process.env.MERCADOPAGO_READ_ONLY;
  process.env.MERCADOPAGO_READ_ONLY = "false";
  assert.throws(() => requireMutationConfirmation(false, "idempotency-test"), /confirmacao/i);
  assert.throws(() => requireMutationConfirmation(true), /idempotencyKey/i);
  assert.doesNotThrow(() => requireMutationConfirmation(true, "idempotency-test"));
  if (previous === undefined) delete process.env.MERCADOPAGO_READ_ONLY;
  else process.env.MERCADOPAGO_READ_ONLY = previous;
});

test("so marca Pix como aprovado quando o pagamento esta aprovado", () => {
  assert.equal(paymentStatus({ transactions: { payments: [{ status: "approved" }] } }), "approved");
  assert.equal(paymentStatus({ status: "processed", status_detail: "accredited" }), "approved");
  assert.equal(paymentStatus({ transactions: { payments: [{ status: "processed", status_detail: "accredited" }] } }), "approved");
  assert.equal(paymentStatus({ transactions: { payments: [{ status: "action_required" }] } }), "pending");
  assert.equal(paymentStatus({ transactions: { payments: [{ status: "rejected" }] } }), "rejected");
});

test("retorna mensagens publicas sem dados da API ou credenciais", () => {
  assert.deepEqual(publicPaymentStatus("approved"), { status: "approved", message: "Pagamento recebido e aprovado" });
});
