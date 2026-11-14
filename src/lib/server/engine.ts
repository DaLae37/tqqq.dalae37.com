import "server-only";
import { resourceSchemas, type Resource, type ResourceData, type DataResult, type Overview } from "../contracts.ts";
import { permitRead } from "./rate-limit.ts";
import { engineToken, invalidateEngineToken } from "./engine-token.ts";

function failureCode(error: unknown, depth = 0): string {
  if (!error || typeof error !== "object" || depth > 4) return "request_failed";
  const value = error as { code?: unknown; name?: unknown; cause?: unknown; errors?: unknown };
  const codes: Record<string, string> = {
    ENOTFOUND: "dns_lookup_failed", EAI_AGAIN: "dns_lookup_failed",
    ECONNREFUSED: "connection_refused", ECONNRESET: "connection_reset",
    ENETUNREACH: "network_unreachable", EHOSTUNREACH: "network_unreachable",
    ETIMEDOUT: "connection_timeout", UND_ERR_CONNECT_TIMEOUT: "connection_timeout",
    TimeoutError: "connection_timeout", AbortError: "request_aborted",
    AccessDeniedException: "secret_access_denied", ResourceNotFoundException: "secret_not_found",
    CredentialsProviderError: "aws_credentials_unavailable", SyntaxError: "invalid_json",
    ENGINE_RESPONSE_TOO_LARGE: "response_too_large", ENGINE_EMPTY_BODY: "empty_body",
    CERT_HAS_EXPIRED: "tls_verification_failed", UNABLE_TO_VERIFY_LEAF_SIGNATURE: "tls_verification_failed",
    DEPTH_ZERO_SELF_SIGNED_CERT: "tls_verification_failed", ERR_TLS_CERT_ALTNAME_INVALID: "tls_verification_failed",
  };
  for (const key of [value.code, value.name]) if (typeof key === "string" && Object.hasOwn(codes, key)) return codes[key];
  for (const cause of [value.cause, ...(Array.isArray(value.errors) ? value.errors.slice(0, 5) : [])]) {
    const code = failureCode(cause, depth + 1);
    if (code !== "request_failed") return code;
  }
  return "request_failed";
}

function logReadFailure(resource: Resource, stage: string, code: string, httpStatus?: number) {
  // Fixed resource names and allowlisted codes only. Never log URLs, tokens or raw exceptions.
  console.warn(JSON.stringify({ event: "engine_read_failed", resource, stage, code,
    ...(httpStatus == null ? {} : { http_status: httpStatus }) }));
}

export function engineBaseUrl(): URL {
  const url = new URL(process.env.ENGINE_API_BASE_URL ?? "");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("invalid origin");
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  const suffix = process.env.ENGINE_PRIVATE_DNS_SUFFIX;
  const privateHttp = process.env.ENGINE_API_TRANSPORT === "vpc-http" && suffix &&
    /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(suffix) && url.hostname.endsWith(`.${suffix}`) && url.port === "8080";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && (privateHttp || process.env.NODE_ENV !== "production" && local))) throw new Error("TLS or explicit private HTTP required");
  if (url.hostname !== process.env.ENGINE_API_ALLOWED_HOST) throw new Error("host not allowed");
  return url;
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw Object.assign(new Error(), { code: "ENGINE_EMPTY_BODY" });
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2_000_000) { await reader.cancel(); throw Object.assign(new Error(), { code: "ENGINE_RESPONSE_TOO_LARGE" }); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function readResource<R extends Resource>(resource: R, limit = 100, offset = 0): Promise<DataResult<ResourceData<R>>> {
  const source = process.env.DATA_ADAPTER === "engine" ? "engine" : "disabled";
  const result: DataResult<ResourceData<R>> = { data: null, source, fetchedAt: new Date().toISOString(), error: null };
  if (source === "disabled") return { ...result, error: "not_configured" };
  let payload: unknown;
  if (!permitRead("engine")) {
    logReadFailure(resource, "rate_limit", "rate_limited");
    return { ...result, error: "unavailable" };
  }
  let url: URL;
  try {
    url = engineBaseUrl();
  } catch {
    logReadFailure(resource, "configuration", "invalid_origin");
    return { ...result, error: "not_configured" };
  }
  const health = resource === "live" || resource === "ready";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!health) {
    try { headers.Authorization = `Bearer ${await engineToken()}`; }
    catch (error) {
      logReadFailure(resource, "token", failureCode(error));
      return { ...result, error: "not_configured" };
    }
  }
  url.pathname = health ? `/health/${resource}` : `/v1/${resource}`;
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET", headers,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    logReadFailure(resource, "request", failureCode(error));
    return { ...result, error: "unavailable" };
  }
  if (response.status === 401 || response.status === 403) {
    invalidateEngineToken();
    logReadFailure(resource, "response", "unauthorized", response.status);
    return { ...result, error: "unauthorized" };
  }
  // Health 503 with {ok:false} is a known state, rather than an old healthy result.
  if (!response.ok && !(health && response.status === 503)) {
    logReadFailure(resource, "response", "http_error", response.status);
    return { ...result, error: "unavailable" };
  }
  try { payload = await boundedJson(response); }
  catch (error) {
    logReadFailure(resource, "response", failureCode(error));
    return { ...result, error: "invalid_response" };
  }
  const parsed = resourceSchemas[resource].safeParse(payload);
  if (!parsed.success) {
    logReadFailure(resource, "response", "invalid_schema");
    return { ...result, error: "invalid_response" };
  }
  return { ...result, data: parsed.data as ResourceData<R>, fetchedAt: new Date().toISOString() };
}

export async function overview(): Promise<Overview> {
  const [status, portfolio, versionRecords, annual, live, ready] = await Promise.all([
    readResource("status"), readResource("portfolio"), records("strategy-versions"),
    readResource("annual-pnl"), readResource("live"), readResource("ready"),
  ]);
  const versions = { ...versionRecords, data: versionRecords.data ? { items: versionRecords.data.items, limit: 200, offset: 0 } : null };
  return { status, portfolio, versions, annual, live, ready };
}

export async function records<R extends "orders" | "signals" | "order-events" | "tax-ledger" | "strategy-versions">(resource: R) {
  const items: Array<ResourceData<R>["items"][number]> = [];
  for (let offset = 0; offset < 2000; offset += 200) {
    const result = await readResource(resource, 200, offset);
    if (!result.data) return { ...result, data: null, truncated: false };
    items.push(...result.data.items as Array<ResourceData<R>["items"][number]>);
    if (result.data.items.length < 200) return { ...result, data: { items }, truncated: false };
  }
  return { data: { items }, source: "engine" as const,
    fetchedAt: new Date().toISOString(), error: null, truncated: true };
}
