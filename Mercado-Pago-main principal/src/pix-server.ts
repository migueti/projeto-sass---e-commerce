import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { findPaymentByExternalId, getIdempotentResponse, getOrder, getPayment, saveIdempotentResponse, saveOrder, savePayment, saveWebhookEvent, updatePaymentStatus } from "./database.js";
import { mercadoPagoRequest, requireWritesEnabled } from "./mercadopago-client.js";
import { paymentStatus, publicPaymentStatus, type PixStatus } from "./pix-status.js";

const port = Number(process.env.PORT ?? 3000);
export type PixInput = { amount: string; email: string };

export type PixPaymentData = {
  order_id: string;
  status: unknown;
  status_detail: unknown;
  payment_id?: unknown;
  ticket_url?: unknown;
  qr_code: string;
  qr_code_base64: string;
};

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Pix Sandbox | Mercado Pago</title>
  <style>
    :root { color-scheme: light; --ink:#14211b; --muted:#607068; --green:#009b72; --mint:#e5f7ef; --line:#d8e5df; --paper:#fbfdfc; }
    * { box-sizing:border-box } body { margin:0; background:linear-gradient(135deg,#f3faf6,#fff 55%,#e8f6ef); color:var(--ink); font:16px/1.5 Georgia,serif; min-height:100vh }
    main { width:min(980px,calc(100% - 32px)); margin:0 auto; padding:56px 0 72px; display:grid; grid-template-columns:1.1fr .9fr; gap:40px; align-items:start; animation:page-enter .8s ease-out both }
    main > section:first-child { animation:copy-enter .8s .12s ease-out both }
    main > section:last-child { animation:copy-enter .8s .24s ease-out both }
    .eyebrow { color:var(--green); font:700 12px/1.2 Arial,sans-serif; letter-spacing:2px; text-transform:uppercase }
    h1 { font-size:clamp(40px,7vw,72px); line-height:.95; margin:18px 0; max-width:600px; font-weight:500 }
    p { color:var(--muted); max-width:560px } form, .result { background:rgba(255,255,255,.84); border:1px solid var(--line); padding:24px; box-shadow:0 14px 45px rgba(22,83,60,.08) }
    label { display:block; font:700 12px Arial,sans-serif; margin:0 0 7px; color:var(--muted); text-transform:uppercase; letter-spacing:.7px }
    input { width:100%; border:1px solid var(--line); padding:13px 14px; margin-bottom:17px; font:16px Georgia,serif; background:var(--paper) }
    button { width:100%; cursor:pointer; border:0; padding:14px; background:var(--green); color:white; font:700 14px Arial,sans-serif; text-transform:uppercase; letter-spacing:.5px; transition:transform .2s ease, box-shadow .2s ease }
    button:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 18px rgba(0,155,114,.2) }
    button:disabled { opacity:.55; cursor:wait } .result { margin-top:20px; display:none; animation:result-enter .45s ease-out both } .result.visible { display:block }
    .qr { width:min(100%,280px); display:block; margin:0 auto 18px; background:#fff; padding:10px; border:1px solid var(--line); animation:qr-in .6s .15s ease-out both }
    .copy { font-family:monospace; font-size:12px; word-break:break-all; background:var(--mint); padding:12px; color:var(--ink) }
    .status { font:700 12px Arial,sans-serif; text-transform:uppercase; color:var(--green) } .status.waiting { animation:status-pulse 1.8s ease-in-out infinite } .error { color:#b42318 }
    .payment-received { display:none; position:relative; overflow:hidden; text-align:center; padding:20px 10px 12px; background:var(--mint); margin:-8px -8px 18px }
    .payment-received.visible { display:block; animation:success-reveal .7s cubic-bezier(.2,.9,.2,1.2) both }
    .payment-received h2 { margin:12px 0 4px; font-size:28px; font-weight:500 }
    .payment-received p { margin:0 auto; color:var(--ink) }
    .success-mark { width:64px; height:64px; margin:auto; border-radius:50%; display:grid; place-items:center; background:var(--green); color:white; font:36px Arial,sans-serif; animation:mark-pop .65s .12s cubic-bezier(.2,1.5,.4,1) both }
    .confetti { position:absolute; inset:0; pointer-events:none }
    .confetti i { position:absolute; width:7px; height:14px; background:#f5b700; animation:confetti-fall 1s ease-out both }
    .confetti i:nth-child(1) { left:15%; top:8%; transform:rotate(22deg); background:#e65f5c }
    .confetti i:nth-child(2) { left:30%; top:2%; transform:rotate(-18deg); background:#1976d2; animation-delay:.08s }
    .confetti i:nth-child(3) { right:28%; top:4%; transform:rotate(36deg); background:#e65f5c; animation-delay:.16s }
    .confetti i:nth-child(4) { right:12%; top:12%; transform:rotate(-28deg); background:#1976d2; animation-delay:.24s }
    @keyframes page-enter { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
    @keyframes copy-enter { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
    @keyframes result-enter { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
    @keyframes qr-in { from { opacity:0; transform:scale(.94) } to { opacity:1; transform:scale(1) } }
    @keyframes status-pulse { 50% { opacity:.55 } }
    @keyframes success-reveal { from { opacity:0; transform:translateY(16px) scale(.97) } to { opacity:1; transform:none } }
    @keyframes mark-pop { from { opacity:0; transform:scale(.2) rotate(-30deg) } to { opacity:1; transform:scale(1) rotate(0) } }
    @keyframes confetti-fall { from { opacity:0; transform:translateY(-18px) rotate(0) } to { opacity:1; transform:translateY(42px) rotate(130deg) } }
    @media (prefers-reduced-motion:reduce) { *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important } }
    @media (max-width:720px) { main { grid-template-columns:1fr; padding-top:32px; gap:24px } h1 { font-size:48px } }
  </style>
</head>
<body><main>
  <section><div class="eyebrow">Mercado Pago · Brasil · Sandbox</div><h1>Pix, pronto para testar.</h1><p>Gere uma Order de teste e visualize o QR Code ou o Pix Copia e Cola. Nenhuma credencial sai do backend.</p></section>
  <section><form id="pix-form"><label for="amount">Valor em reais</label><input id="amount" name="amount" type="number" value="10.00" min="0.01" step="0.01" required><label for="email">E-mail do pagador</label><input id="email" name="email" type="email" value="test_user_br@testuser.com" required><button id="submit" type="submit">Gerar Pix de teste</button></form>
  <article id="result" class="result"><div id="received" class="payment-received"><div class="confetti"><i></i><i></i><i></i><i></i></div><div class="success-mark">&#10003;</div><h2>Pagamento recebido!</h2><p>O Pix foi aprovado com sucesso.</p></div><div id="status" class="status waiting"></div><p id="order"></p><img id="qr" class="qr" alt="QR Code Pix"><div class="copy" id="copy"></div><p><a id="ticket" target="_blank" rel="noreferrer">Abrir instruções de pagamento</a></p></article></section>
</main><script>
const form=document.querySelector('#pix-form'), button=document.querySelector('#submit'), result=document.querySelector('#result');
form.addEventListener('submit', async (event)=>{ event.preventDefault(); button.disabled=true; button.textContent='Gerando...'; result.classList.remove('visible');
  try { const body={amount:Number(form.amount.value),email:form.email.value}; const response=await fetch('/api/orders/pix',{method:'POST',headers:{'content-type':'application/json','X-Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)}); const data=await response.json(); if(!response.ok) throw new Error(data.error||'Nao foi possivel criar a Order.');
    document.querySelector('#status').textContent='Aguardando pagamento · '+data.status_detail; document.querySelector('#order').textContent='Order: '+data.order_id; document.querySelector('#qr').src='data:image/png;base64,'+data.qr_code_base64; document.querySelector('#copy').textContent=data.qr_code; document.querySelector('#ticket').href=data.ticket_url; result.classList.add('visible');
    const checkStatus=async()=>{ const statusResponse=await fetch('/api/payments/'+encodeURIComponent(data.public_payment_id)+'/status'); const statusData=await statusResponse.json(); if(!statusResponse.ok) throw new Error(statusData.error||'Nao foi possivel consultar o pagamento.'); document.querySelector('#status').textContent=statusData.message; if(statusData.status==='approved'){ clearInterval(statusTimer); document.querySelector('#status').classList.remove('waiting'); document.querySelector('#received').classList.add('visible'); document.querySelector('#qr').style.display='none'; document.querySelector('#copy').style.display='none'; document.querySelector('#ticket').parentElement.style.display='none'; } if(statusData.status==='rejected'){ clearInterval(statusTimer); document.querySelector('#status').classList.remove('waiting'); document.querySelector('#status').classList.add('error'); } }; const statusTimer=setInterval(()=>{ checkStatus().catch(error=>{ clearInterval(statusTimer); document.querySelector('#status').textContent=error.message; document.querySelector('#status').classList.add('error'); }); },5000); checkStatus();
  } catch(error) { document.querySelector('#status').textContent=error.message; document.querySelector('#status').classList.add('error'); result.classList.add('visible'); } finally { button.disabled=false; button.textContent='Gerar Pix de teste'; }
});
</script></body></html>`;

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function requestBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 100_000) throw new Error("Corpo da requisicao excede o limite permitido.");
  }
  return JSON.parse(body || "{}");
}

export function validatePixInput(body: Record<string, unknown>): PixInput {
  const amount = Number(body.amount);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) throw new Error("Informe um valor entre 0,01 e 100.000,00.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Informe um e-mail valido.");
  return { amount: amount.toFixed(2), email };
}

export function resolveIdempotencyKey(candidate: string | string[] | undefined): string {
  const normalized = Array.isArray(candidate) ? candidate[0] : candidate;
  const value = typeof normalized === "string" ? normalized.trim() : "";
  if (value.length >= 8) return value;
  return `pix-${randomUUID().replace(/-/g, "")}`;
}

export function createPixOrderPayload(body: PixInput, idempotencyKey: string): Record<string, unknown> {
  return {
    type: "online",
    total_amount: body.amount,
    external_reference: `pix-sandbox-${idempotencyKey}`,
    processing_mode: "automatic",
    transactions: { payments: [{ amount: body.amount, payment_method: { id: "pix", type: "bank_transfer" } }] },
    payer: { email: body.email }
  };
}

export function extractPixPaymentData(order: Record<string, any>): PixPaymentData {
  const payment = order.transactions?.payments?.[0];
  const paymentMethod = payment?.payment_method;
  if (
    typeof order.id !== "string" ||
    typeof paymentMethod?.qr_code !== "string" ||
    typeof paymentMethod?.qr_code_base64 !== "string"
  ) {
    throw new Error("A API nao retornou os dados necessarios para gerar o QR Code Pix.");
  }

  return {
    order_id: order.id,
    status: order.status,
    status_detail: order.status_detail,
    payment_id: payment?.id,
    ticket_url: paymentMethod.ticket_url,
    qr_code: paymentMethod.qr_code,
    qr_code_base64: paymentMethod.qr_code_base64
  };
}

export type WebhookSignatureHeaders = {
  signature?: string;
  requestId?: string;
};

export function webhookSignatureIsValid(headers: WebhookSignatureHeaders, dataId: string, secret: string | undefined): boolean {
  const signature = headers.signature;
  const requestId = headers.requestId;
  if (!secret || typeof signature !== "string" || typeof requestId !== "string" || !requestId.trim() || !dataId.trim()) {
    console.error("Webhook rejeitado: assinatura incompleta", {
      hasSecret: Boolean(secret),
      hasSignature: typeof signature === "string",
      hasRequestId: typeof requestId === "string",
      hasDataId: Boolean(dataId)
    });
    return false;
  }
  const values: Record<string, string> = {};
  for (const part of signature.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0 || values[part.slice(0, separator).trim()]) return false;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key || !value) return false;
    values[key] = value;
  }
  if (!/^\d+$/.test(values.ts ?? "") || !/^[a-f\d]{64}$/i.test(values.v1 ?? "")) {
    console.error("Webhook rejeitado: formato de x-signature invalido", { hasTimestamp: Boolean(values.ts), hasHash: Boolean(values.v1) });
    return false;
  }
  const manifest = `id:${dataId};request-id:${requestId};ts:${values.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(values.v1, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  if (!valid) console.error("Webhook rejeitado: assinatura nao confere", { hasDataId: Boolean(dataId), hasRequestId: true });
  return valid;
}

function webhookSignatureIsValidForRequest(request: IncomingMessage, dataId: string): boolean {
  return webhookSignatureIsValid({
    signature: typeof request.headers["x-signature"] === "string" ? request.headers["x-signature"] : undefined,
    requestId: typeof request.headers["x-request-id"] === "string" ? request.headers["x-request-id"] : undefined
  }, dataId, process.env.MERCADOPAGO_WEBHOOK_SECRET);
}

async function createPixOrder(request: IncomingMessage, response: ServerResponse): Promise<void> {
  requireWritesEnabled();
  const body = validatePixInput(await requestBody(request));
  const idempotencyKey = resolveIdempotencyKey(request.headers["x-idempotency-key"]);
  const payload = createPixOrderPayload(body, idempotencyKey);
  const requestHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const previous = getIdempotentResponse(idempotencyKey, requestHash);
  if (previous.conflict) { json(response, 409, { error: "A chave de idempotencia ja foi usada com dados diferentes." }); return; }
  if (previous.response) { json(response, 200, JSON.parse(previous.response)); return; }
  const order = await mercadoPagoRequest({ method: "POST", path: "/v1/orders", body: payload, idempotencyKey }) as Record<string, any>;
  if (typeof order.id === "string") saveOrder(order.id, order);
  const paymentData = extractPixPaymentData(order);
  const publicPaymentId = randomUUID();
  savePayment({ publicPaymentId, orderId: paymentData.order_id, paymentId: typeof paymentData.payment_id === "string" ? paymentData.payment_id : undefined, status: paymentStatus(order) });
  const result = { ...paymentData, public_payment_id: publicPaymentId };
  saveIdempotentResponse(idempotencyKey, requestHash, JSON.stringify(result));
  json(response, 201, result);
}

async function getPaymentStatus(publicPaymentId: string, response: ServerResponse): Promise<void> {
  const payment = getPayment(publicPaymentId);
  if (!payment) { json(response, 404, { error: "Pagamento nao encontrado." }); return; }
  const order = await mercadoPagoRequest({ method: "GET", path: `/v1/orders/${encodeURIComponent(payment.orderId)}` }) as Record<string, any>;
  const status = paymentStatus(order);
  updatePaymentStatus(publicPaymentId, status);
  json(response, 200, publicPaymentStatus(status));
}

async function receiveWebhook(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  const webhook = await requestBody(request);
  const bodyDataId = typeof webhook.data === "object" && webhook.data !== null && "id" in webhook.data ? String(webhook.data.id) : "";
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? bodyDataId;
  if (!dataId || !webhookSignatureIsValidForRequest(request, dataId)) { json(response, 401, { error: "Webhook nao autorizado." }); return; }
  const eventKey = `${requestIdFrom(request)}:${dataId}`;
  if (!saveWebhookEvent(eventKey, dataId)) { json(response, 200, { received: true, duplicate: true }); return; }
  const payment = findPaymentByExternalId(dataId);
  if (payment) {
    const order = await mercadoPagoRequest({ method: "GET", path: `/v1/orders/${encodeURIComponent(payment.orderId)}` }) as Record<string, any>;
    updatePaymentStatus(payment.publicPaymentId, paymentStatus(order));
  }
  json(response, 200, { received: true });
}

function requestIdFrom(request: IncomingMessage): string {
  return typeof request.headers["x-request-id"] === "string" ? request.headers["x-request-id"] : "unknown";
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (request.method === "GET" && url.pathname === "/") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(html); return; }
    if (request.method === "POST" && url.pathname === "/api/orders/pix") { await createPixOrder(request, response); return; }
    if (request.method === "GET" && url.pathname.startsWith("/api/payments/") && url.pathname.endsWith("/status")) { await getPaymentStatus(url.pathname.split("/")[3] ?? "", response); return; }
    if (request.method === "GET" && url.pathname.startsWith("/api/orders/")) { const order = getOrder(url.pathname.split("/").pop() ?? ""); if (!order) { json(response, 404, { error: "Order nao encontrada." }); return; } json(response, 200, order); return; }
    if (request.method === "POST" && url.pathname === "/webhooks/mercadopago") { await receiveWebhook(request, response, url); return; }
    json(response, 404, { error: "Rota nao encontrada." });
  } catch (error) { json(response, 400, { error: error instanceof Error ? error.message : "Erro inesperado." }); }
});

export function startPixServer(): void {
  server.listen(port, () => console.log(`Pix sandbox em http://localhost:${port}`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startPixServer();
}
