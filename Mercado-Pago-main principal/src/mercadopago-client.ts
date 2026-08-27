const API_BASE = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 15_000;

export type ApiRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  idempotencyKey?: string;
};

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Defina MERCADOPAGO_ACCESS_TOKEN no ambiente do processo MCP.");
  return token;
}

export async function mercadoPagoRequest(request: ApiRequest): Promise<unknown> {
  if (!request.path.startsWith("/")) throw new Error("O caminho da API deve começar com '/'.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken()}`,
      Accept: "application/json"
    };
    if (request.body) headers["Content-Type"] = "application/json";
    if (request.idempotencyKey) headers["X-Idempotency-Key"] = request.idempotencyKey;
    const response = await fetch(`${API_BASE}${request.path}`, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Mercado Pago retornou HTTP ${response.status}: ${JSON.stringify(payload)}`);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export function isReadOnly(): boolean {
  return process.env.MERCADOPAGO_READ_ONLY !== "false";
}

export function requireWritesEnabled(): void {
  if (isReadOnly()) {
    throw new Error("Modo somente leitura ativo. Defina MERCADOPAGO_READ_ONLY=false para criar pagamentos.");
  }
}

export function requireMutationConfirmation(confirmed: boolean, idempotencyKey?: string): void {
  if (isReadOnly()) throw new Error("Modo somente leitura ativo. Defina MERCADOPAGO_READ_ONLY=false para habilitar alteracoes.");
  if (!confirmed) throw new Error("Esta operacao exige confirmacao explicita: use confirmed=true.");
  if (!idempotencyKey?.trim()) throw new Error("Esta operacao exige um idempotencyKey.");
}
