import test from "node:test";
import assert from "node:assert/strict";
import { engineBaseUrl, overview, readResource } from "../src/lib/server/engine.ts";
import { mockResource } from "./fixtures.ts";

test("disabled and removed mock adapters never fetch or produce synthetic account data", async () => {
  process.env.DATA_ADAPTER = "disabled";
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("unexpected external call"); };
  try {
    assert.equal((await readResource("status")).error, "not_configured");
    process.env.DATA_ADAPTER = "mock";
    const result = await readResource("status");
    assert.equal(result.source, "disabled");
    assert.equal(result.data, null);
  } finally { globalThis.fetch = original; }
});
test("fixed engine origin rejects insecure production URL and userinfo", () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  process.env.ENGINE_API_ALLOWED_HOST = "engine.internal";
  for (const url of ["http://engine.internal", "https://user:password@engine.internal", "https://other.internal", "https://engine.internal/private", "https://engine.internal?url=http://evil"]) {
    process.env.ENGINE_API_BASE_URL = url;
    assert.throws(() => engineBaseUrl());
  }
  process.env.ENGINE_API_BASE_URL = "https://engine.internal";
  assert.equal(engineBaseUrl().hostname, "engine.internal");
});
test("upstream request is GET only, no-store, fixed path and no redirects", async () => {
  Object.assign(process.env, { NODE_ENV: "test" });
  process.env.DATA_ADAPTER = "engine";
  process.env.ENGINE_READ_API_TOKEN = "synthetic-read-token-for-unit-test-000000";
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(new URL(String(input)).pathname, "/v1/status");
    assert.equal(new URL(String(input)).search, "");
    assert.equal(init?.method, "GET"); assert.equal(init?.cache, "no-store"); assert.equal(init?.redirect, "error");
    assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${process.env.ENGINE_READ_API_TOKEN}`);
    return Response.json(mockResource("status"));
  };
  try { assert.equal((await readResource("status")).data?.mode, "pause"); }
  finally { globalThis.fetch = original; }
});
test("failures return no previous healthy data and never fall back to mock", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [401, 503]) {
      globalThis.fetch = async () => Response.json({ error: "private upstream detail" }, { status });
      const result = await readResource("status");
      assert.equal(result.data, null); assert.equal(result.source, "engine");
      assert.equal(result.error, status === 401 ? "unauthorized" : "unavailable");
      assert.equal(JSON.stringify(result).includes("private upstream detail"), false);
    }
    globalThis.fetch = async () => Response.json({ ok: false }, { status: 503 });
    assert.equal((await readResource("ready")).data?.ok, false);
    globalThis.fetch = async () => Response.json({ wrong: "schema" });
    assert.equal((await readResource("status")).error, "invalid_response");
    globalThis.fetch = async () => { throw new Error("private connection detail"); };
    const disconnected = await readResource("status");
    assert.equal(disconnected.error, "unavailable");
    assert.equal(disconnected.data, null);
    assert.equal(JSON.stringify(disconnected).includes("private connection detail"), false);
  } finally { globalThis.fetch = original; }
});

test("health probes remain available without a read-token Secret", async () => {
  const previousMode = process.env.NODE_ENV;
  const original = globalThis.fetch;
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.ENGINE_READ_API_TOKEN_SECRET_ARN;
  globalThis.fetch = async (input, init) => {
    assert.ok(["/health/live", "/health/ready"].includes(new URL(String(input)).pathname));
    assert.equal(new URL(String(input)).search, "");
    assert.equal((init?.headers as Record<string, string>).Authorization, undefined);
    return Response.json({ ok: true });
  };
  try {
    assert.equal((await readResource("live")).data?.ok, true);
    assert.equal((await readResource("ready")).data?.ok, true);
    assert.equal((await readResource("status")).error, "not_configured");
  } finally { globalThis.fetch = original; Object.assign(process.env, { NODE_ENV: previousMode }); }
});

test("Engine overview reads memory status and health without querying trading records", async () => {
  const original = globalThis.fetch, calls: string[] = [];
  const status = { ...mockResource("status") as object, mode: "stop", orders_enabled: false,
    health: { db: false, api: false, schema: false } };
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    if (path === "/v1/status") return Response.json(status);
    if (path === "/health/live") return Response.json({ ok: true });
    if (path === "/health/ready") return Response.json({ ok: false }, { status: 503 });
    throw new Error("unexpected DB dependency");
  };
  try {
    const result = await overview(["status", "live", "ready"]);
    assert.deepEqual(calls.sort(), ["/health/live", "/health/ready", "/v1/status"]);
    assert.equal(result.status.data?.mode, "stop");
    assert.equal(result.status.error, null);
    assert.equal(result.live.data?.ok, true);
    assert.equal(result.ready.data?.ok, false);
    assert.equal(result.portfolio.data, null);
  } finally { globalThis.fetch = original; }
});

test("broker and read DB failures stay local to their resources", async () => {
  const original = globalThis.fetch;
  let dbUnavailable = false;
  const status = { ...mockResource("status") as object, mode: "start", orders_enabled: false,
    health: { db: true, api: false, schema: true }, reason: "broker_unavailable" };
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/v1/status") return Response.json(status);
    if (path === "/health/live") return Response.json({ ok: true });
    if (path === "/health/ready") return Response.json({ ok: !dbUnavailable }, { status: dbUnavailable ? 503 : 200 });
    if (dbUnavailable) return Response.json({ error: "dependency_unavailable" }, { status: 503 });
    return Response.json(mockResource(path.slice(4) as "portfolio" | "strategy-versions" | "annual-pnl"));
  };
  try {
    const brokerDown = await overview();
    assert.equal(brokerDown.status.data?.health.api, false);
    assert.equal(brokerDown.status.data?.orders_enabled, false);
    assert.equal(brokerDown.portfolio.error, null);
    assert.ok(brokerDown.portfolio.data);
    assert.equal(brokerDown.ready.data?.ok, true);
    dbUnavailable = true;
    const dbDown = await overview();
    assert.equal(dbDown.status.error, null);
    assert.equal(dbDown.status.data?.mode, "start");
    assert.equal(dbDown.live.data?.ok, true);
    assert.equal(dbDown.ready.data?.ok, false);
    assert.equal(dbDown.portfolio.error, "unavailable");
    assert.equal(dbDown.portfolio.data, null);
    assert.equal(dbDown.versions.error, "unavailable");
    assert.equal(dbDown.annual.error, "unavailable");
  } finally { globalThis.fetch = original; }
});

test("network diagnostics distinguish causes and never log exception details", async () => {
  const original = globalThis.fetch, warn = console.warn;
  const logs: string[] = [];
  console.warn = (message: string) => logs.push(message);
  try {
    for (const [error, expected] of [
      [new TypeError("private-host-and-token", { cause: { code: "ENOTFOUND" } }), "dns_lookup_failed"],
      [new TypeError("private-host-and-token", { cause: { code: "EAI_AGAIN" } }), "dns_lookup_failed"],
      [new TypeError("private-host-and-token", { cause: new AggregateError([{ code: "ECONNREFUSED" }]) }), "connection_refused"],
      [new TypeError("private-host-and-token", { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }), "connection_timeout"],
      [{ name: "TimeoutError", message: "private-host-and-token" }, "connection_timeout"],
      [{ code: "unknown-private-value", message: "private-host-and-token" }, "request_failed"],
    ] as const) {
      globalThis.fetch = async () => { throw error; };
      assert.equal((await readResource("live")).error, "unavailable");
      assert.deepEqual(JSON.parse(logs.at(-1)!), { event: "engine_read_failed", resource: "live", stage: "request", code: expected });
    }
    globalThis.fetch = async () => new Response("private invalid payload");
    assert.equal((await readResource("live")).error, "invalid_response");
    assert.equal(JSON.parse(logs.at(-1)!).code, "invalid_json");
    globalThis.fetch = async () => Response.json({ error: "private response body" }, { status: 502 });
    assert.equal((await readResource("live")).error, "unavailable");
    assert.deepEqual(JSON.parse(logs.at(-1)!), { event: "engine_read_failed", resource: "live", stage: "response", code: "http_error", http_status: 502 });
    assert.doesNotMatch(logs.join("\n"), /private|https?:|Bearer|unknown-private-value/);
  } finally { globalThis.fetch = original; console.warn = warn; }
});
