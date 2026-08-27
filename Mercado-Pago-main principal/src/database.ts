import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/mercado-pago.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

export const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS public_payments (
    public_payment_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    payment_id TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
  );
  CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key TEXT PRIMARY KEY,
    request_hash TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS webhook_events (
    event_key TEXT PRIMARY KEY,
    data_id TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

type StoredPayment = { publicPaymentId: string; orderId: string; paymentId?: string; status: string };

export function saveOrder(orderId: string, payload: Record<string, unknown>): void {
  database.prepare("INSERT OR REPLACE INTO orders (order_id, payload) VALUES (?, ?)").run(orderId, JSON.stringify(payload));
}

export function getOrder(orderId: string): Record<string, any> | undefined {
  const row = database.prepare("SELECT payload FROM orders WHERE order_id = ?").get(orderId) as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) : undefined;
}

export function savePayment(payment: StoredPayment): void {
  database.prepare("INSERT OR REPLACE INTO public_payments (public_payment_id, order_id, payment_id, status) VALUES (?, ?, ?, ?)").run(payment.publicPaymentId, payment.orderId, payment.paymentId ?? null, payment.status);
}

export function getPayment(publicPaymentId: string): StoredPayment | undefined {
  return database.prepare("SELECT public_payment_id as publicPaymentId, order_id as orderId, payment_id as paymentId, status FROM public_payments WHERE public_payment_id = ?").get(publicPaymentId) as StoredPayment | undefined;
}

export function updatePaymentStatus(publicPaymentId: string, status: string): void {
  database.prepare("UPDATE public_payments SET status = ? WHERE public_payment_id = ?").run(status, publicPaymentId);
}

export function findPaymentByExternalId(dataId: string): StoredPayment | undefined {
  return database.prepare("SELECT public_payment_id as publicPaymentId, order_id as orderId, payment_id as paymentId, status FROM public_payments WHERE order_id = ? OR payment_id = ? LIMIT 1").get(dataId, dataId) as StoredPayment | undefined;
}

export function saveWebhookEvent(eventKey: string, dataId: string): boolean {
  const result = database.prepare("INSERT OR IGNORE INTO webhook_events (event_key, data_id) VALUES (?, ?)").run(eventKey, dataId);
  return result.changes === 1;
}

export function getIdempotentResponse(key: string, requestHash: string): { response?: string; conflict: boolean } {
  const row = database.prepare("SELECT request_hash as requestHash, response FROM idempotency_keys WHERE idempotency_key = ?").get(key) as { requestHash: string; response: string } | undefined;
  if (!row) return { conflict: false };
  return row.requestHash === requestHash ? { response: row.response, conflict: false } : { conflict: true };
}

export function saveIdempotentResponse(key: string, requestHash: string, response: string): void {
  database.prepare("INSERT INTO idempotency_keys (idempotency_key, request_hash, response) VALUES (?, ?, ?)").run(key, requestHash, response);
}
