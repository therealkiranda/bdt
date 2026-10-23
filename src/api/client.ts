import { API_BASE_URL, REFRESH_SKEW_SECONDS, REQUEST_TIMEOUT_MS } from "./config";
import { clearSession, loadSession, saveSession } from "./token-store";
import type { Envelope, ErrorEnvelope, TokenPair } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  errors: Record<string, string> | null;
  retryAfter: number | null;
  constructor(init: { status: number; code: string; message: string; errors?: Record<string, string> | null; retryAfter?: number | null }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.errors = init.errors ?? null;
    this.retryAfter = init.retryAfter ?? null;
  }
  /** No response at all: offline, DNS failure, timeout. */
  get isNetwork() { return this.status === 0; }
}

export type AuthMode =
  | "required" // sign-in needed; refreshes the token on 401
  | "optional" // send the token if we have one (personalises is_saved) but never fail because of it
  | "none"; // never send a token

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  auth?: AuthMode;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export type ApiResult<T> = { data: T; meta: Record<string, any>; message: string | null; status: number };

let onSessionExpired: (() => void) | null = null;
/** AuthProvider registers here so a dead refresh token signs the user out in the UI. */
export function setSessionExpiredHandler(fn: (() => void) | null) { onSessionExpired = fn; }

function buildUrl(path: string, query?: RequestOptions["query"]) {
  let url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (query) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    if (parts.length) url += `?${parts.join("&")}`;
  }
  return url;
}

async function fetchWithTimeout(url: string, init: RequestInit, outerSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  outerSignal?.addEventListener("abort", onAbort);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (outerSignal?.aborted) throw e; // caller cancelled on purpose
    throw new ApiError({ status: 0, code: "network_error", message: "Can't reach the server. Check your connection and try again." });
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onAbort);
  }
}

async function parse<T>(res: Response): Promise<ApiResult<T>> {
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  if (res.ok && json && json.success === true) {
    const env = json as Envelope<T>;
    return { data: env.data, meta: (env.meta ?? {}) as Record<string, any>, message: env.message ?? null, status: res.status };
  }
  const err = json as Partial<ErrorEnvelope> | null;
  const ra = Number(res.headers.get("Retry-After"));
  throw new ApiError({
    status: res.status,
    code: err?.code ?? (res.status >= 500 ? "server_error" : "request_failed"),
    message: err?.message ?? (res.status >= 500 ? "Something went wrong on our side. Please try again." : "The request could not be completed."),
    errors: err?.errors ?? null,
    retryAfter: Number.isFinite(ra) && ra > 0 ? ra : null
  });
}

// ---- token refresh (single flight) ----

let refreshing: Promise<string | null> | null = null;

/** Exchanges the refresh token for a NEW pair. Returns the new access token, or null if the session is dead.
 *  Refresh tokens are single-use: concurrent callers must share ONE refresh call, otherwise the second use is
 *  treated by the server as token theft and revokes the whole session. */
function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const session = await loadSession();
    if (!session) return null;
    try {
      const res = await fetchWithTimeout(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh_token: session.refreshToken })
      });
      const { data } = await parse<TokenPair>(res);
      const saved = await saveSession(data);
      return saved.accessToken;
    } catch (e) {
      if (e instanceof ApiError && !e.isNetwork && e.status >= 400 && e.status < 500) {
        // Invalid / expired / reused refresh token: the session is over.
        await clearSession();
        onSessionExpired?.();
        return null;
      }
      throw e; // offline or server hiccup: keep the session and let the caller show the error
    }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

async function currentAccessToken(mode: AuthMode): Promise<string | null> {
  if (mode === "none") return null;
  const session = await loadSession();
  if (!session) return null;
  const expiresSoon = session.accessExpiresAt - Date.now() < REFRESH_SKEW_SECONDS * 1000;
  if (!expiresSoon) return session.accessToken;
  if (mode === "optional") {
    // Browsing must never fail because of auth: try to refresh (so is_saved stays personalised), but fall back to anonymous.
    try { return await refreshAccessToken(); } catch { return null; }
  }
  return refreshAccessToken();
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const mode = opts.auth ?? "none";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const send = async (token: string | null) => {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    return fetchWithTimeout(buildUrl(path, opts.query), { method: opts.method ?? "GET", headers: h, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }, opts.signal);
  };

  let token = await currentAccessToken(mode);
  if (mode === "required" && !token) {
    throw new ApiError({ status: 401, code: "unauthenticated", message: "Please sign in to continue." });
  }
  let res = await send(token);

  if (res.status === 401 && mode === "required") {
    // Access token revoked/expired earlier than we expected: refresh once and retry.
    const fresh = await refreshAccessToken();
    if (!fresh) throw new ApiError({ status: 401, code: "unauthenticated", message: "Your session has expired. Please sign in again." });
    res = await send(fresh);
  }
  return parse<T>(res);
}

/** Authenticated absolute-URL access (document downloads need the Bearer header). */
export async function authHeader(): Promise<Record<string, string>> {
  const token = await currentAccessToken("required");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Convenience for forms: maps `errors` from a 422 to a field -> message record. */
export function fieldErrors(e: unknown): Record<string, string> {
  return e instanceof ApiError && e.errors ? e.errors : {};
}

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof ApiError) {
    if (e.code === "rate_limited" && e.retryAfter) {
      const mins = Math.ceil(e.retryAfter / 60);
      return `Too many attempts. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
    }
    return e.message;
  }
  return fallback;
}
