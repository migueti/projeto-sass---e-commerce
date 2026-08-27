import { DOCUMENTATION_BASE, documentationCatalog, type DocumentationEntry } from "./catalog.js";

const ALLOWED_HOSTS = new Set(["www.mercadopago.com.br", "mercadopago.com.br"]);
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;

export function searchDocumentation(query: string, limit = 8): DocumentationEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedQuery) return [];

  return documentationCatalog
    .map((entry) => {
      const haystack = [entry.title, entry.description, entry.product, ...entry.keywords]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      const score = haystack.includes(normalizedQuery)
        ? 3
        : normalizedQuery.split(/\s+/).filter((term) => haystack.includes(term)).length;
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map(({ entry }) => entry);
}

function assertOfficialUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error("A URL deve usar HTTPS e pertencer ao dominio oficial do Mercado Pago Brasil.");
  }
  if (!url.pathname.startsWith("/developers/pt/docs/")) {
    throw new Error("Somente paginas da documentacao oficial em portugues podem ser consultadas.");
  }
  return url;
}

async function readResponse(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error("A resposta da documentacao excede o limite permitido.");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("A resposta da documentacao excede o limite permitido.");
  return text;
}

export async function fetchDocumentation(entry: DocumentationEntry): Promise<{ url: string; content: string }> {
  const url = assertOfficialUrl(`${DOCUMENTATION_BASE}${entry.path}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "text/html,text/plain" } });
    if (!response.ok) throw new Error(`A documentacao retornou HTTP ${response.status}.`);
    return { url: url.toString(), content: await readResponse(response) };
  } finally {
    clearTimeout(timeout);
  }
}
