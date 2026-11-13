import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { authenticate } from "../src/lib/server/auth.ts";

test("auth fails closed without configuration, validates only the configured reader", async () => {
  delete process.env.DASHBOARD_USERNAME; delete process.env.DASHBOARD_PASSWORD_HASH;
  assert.equal(await authenticate(null), false);
  const password = randomBytes(24).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  process.env.DASHBOARD_USERNAME = "test-reader";
  process.env.DASHBOARD_PASSWORD_HASH = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  const basic = (user: string, value: string) => `Basic ${Buffer.from(`${user}:${value}`).toString("base64")}`;
  assert.equal(await authenticate(basic("test-reader", password)), true);
  assert.equal(await authenticate(basic("test-reader", "incorrect")), false);
  assert.equal(await authenticate(basic("other-reader", password)), false);
  assert.equal(await authenticate("Bearer untrusted"), false);
  assert.equal(await authenticate("Basic invalid"), false);
});
