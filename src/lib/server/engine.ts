import "server-only";
import { resourceSchemas, type Resource, type ResourceData, type DataResult, type Overview } from "../contracts.ts";
import { permitRead } from "./rate-limit.ts";
import { engineToken, invalidateEngineToken } from "./engine-token.ts";

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
  if (!response.body) throw new Error("empty body");
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2_000_000) { await reader.cancel(); throw new Error("response too large"); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function readResource<R extends Resource>(resource: R, limit = 100, offset = 0): Promise<DataResult<ResourceData<R>>> {
  const source = process.env.DATA_ADAPTER === "engine" ? "engine" : "disabled";
  const result: DataResult<ResourceData<R>> = { data: null, source, fetchedAt: new Date().toISOString(), error: null };
  if (source === "disabled") return { ...result, error: "not_configured" };
  let payload: unknown;
  if (!permitRead("engine")) return { ...result, error: "unavailable" };
  let url: URL;
  let token: string;
  try {
    url = engineBaseUrl();
    token = await engineToken();
  } catch { return { ...result, error: "not_configured" }; }
  url.pathname = resource === "live" || resource === "ready" ? `/health/${resource}` : `/v1/${resource}`;
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  try {
    const response = await fetch(url, {
      method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401 || response.status === 403) {
      invalidateEngineToken();
      return { ...result, error: "unauthorized" };
    }
    // Health 503 with {ok:false} is a known state, rather than an old healthy result.
    if (!response.ok && !(["live", "ready"].includes(resource) && response.status === 503)) return { ...result, error: "unavailable" };
    payload = await boundedJson(response);
  } catch { return { ...result, error: "unavailable" }; }
  const parsed = resourceSchemas[resource].safeParse(payload);
  if (!parsed.success) return { ...result, error: "invalid_response" };
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
