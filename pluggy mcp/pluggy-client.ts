export interface PluggyClientConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export interface PluggyRequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface PluggyResponse {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

interface CachedKey {
  apiKey: string;
  expiresAt: number;
}

export interface PluggyClient {
  pluggyRequest: (
    method: string,
    path: string,
    options?: PluggyRequestOptions
  ) => Promise<PluggyResponse>;
  ok: (result: PluggyResponse) => { content: { type: "text"; text: string }[] };
}

export function assertConfig(): PluggyClientConfig {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "missing PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET — refusing to start."
    );
  }
  return {
    clientId,
    clientSecret,
    baseUrl: process.env.PLUGGY_API_BASE ?? "https://api.pluggy.ai",
  };
}

export function createPluggyClient(config?: PluggyClientConfig): PluggyClient {
  const {
    clientId,
    clientSecret,
    baseUrl = "https://api.pluggy.ai",
  } = config ?? assertConfig();

  let cachedKey: CachedKey | null = null;

  async function mintApiKey(): Promise<CachedKey> {
    const res = await fetch(`${baseUrl}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pluggy /auth ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      apiKey: string;
      expiresAt?: string;
    };
    const expiresAt = json.expiresAt
      ? new Date(json.expiresAt).getTime()
      : Date.now() + 2 * 60 * 60 * 1000;

    return { apiKey: json.apiKey, expiresAt };
  }

  async function getApiKey(forceRefresh = false): Promise<string> {
    if (
      !forceRefresh &&
      cachedKey &&
      cachedKey.expiresAt - Date.now() > 60_000
    ) {
      return cachedKey.apiKey;
    }
    cachedKey = await mintApiKey();
    return cachedKey.apiKey;
  }

  async function pluggyRequest(
    method: string,
    path: string,
    options: PluggyRequestOptions = {}
  ): Promise<PluggyResponse> {
    const url = new URL(`${baseUrl}${path}`);

    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }

    const bodyStr =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;

    const doFetch = async (apiKey: string) =>
      fetch(url.toString(), {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: bodyStr,
      });

    let apiKey = await getApiKey();
    let res = await doFetch(apiKey);

    if (res.status === 401 || res.status === 403) {
      apiKey = await getApiKey(true);
      res = await doFetch(apiKey);
    }

    let data: unknown;
    const text = await res.text();

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof data === "string" ? data : JSON.stringify(data),
      };
    }

    return { ok: true, status: res.status, data };
  }

  function ok(result: PluggyResponse) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  return { pluggyRequest, ok };
}
