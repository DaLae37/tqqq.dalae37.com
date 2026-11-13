import test from "node:test";
import assert from "node:assert/strict";
import { createTokenCache, engineToken } from "../src/lib/server/engine-token.ts";
import { engineBaseUrl } from "../src/lib/server/engine.ts";

test("read token cache coalesces requests, refreshes and never serves expired data on failure", async () => {
  let now = 0, calls = 0;
  const token = "synthetic-token-000000000000000000000000";
  const cache = createTokenCache(async () => { calls++; if (calls > 1) throw new Error("secret unavailable"); return JSON.stringify({ token }); }, () => now);
  assert.deepEqual(await Promise.all([cache.get(), cache.get()]), [token, token]);
  assert.equal(calls, 1); now = 60001;
  await assert.rejects(cache.get());
  await assert.rejects(cache.get());
});
test("invalid read secret and production plaintext fallback are rejected", async () => {
  for (const payload of ['{}', '{"token":"short"}', 'invalid']) await assert.rejects(createTokenCache(async () => payload).get());
  Object.assign(process.env, { NODE_ENV: "production", ENGINE_READ_API_TOKEN: "must-not-be-used-in-production-000000000" });
  delete process.env.ENGINE_READ_API_TOKEN_SECRET_ARN;
  await assert.rejects(engineToken());
});
test("production private HTTP requires explicit transport, namespace, host and port", () => {
  Object.assign(process.env, { NODE_ENV: "production", ENGINE_API_TRANSPORT: "vpc-http", ENGINE_PRIVATE_DNS_SUFFIX: "test.internal",
    ENGINE_API_ALLOWED_HOST: "engine.test.internal", ENGINE_API_BASE_URL: "http://engine.test.internal:8080" });
  assert.equal(engineBaseUrl().port, "8080");
  for (const url of ["http://engine.test.internal:3000", "http://engine.test.internal.evil:8080", "http://127.0.0.1:8080"]) {
    process.env.ENGINE_API_BASE_URL = url; assert.throws(engineBaseUrl);
  }
  process.env.ENGINE_API_BASE_URL = "http://engine.test.internal:8080";
  process.env.ENGINE_API_TRANSPORT = "tls"; assert.throws(engineBaseUrl);
});
