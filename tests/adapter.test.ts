import test from "node:test";
import assert from "node:assert/strict";
import { engineBaseUrl, readResource } from "../src/lib/server/engine.ts";
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
