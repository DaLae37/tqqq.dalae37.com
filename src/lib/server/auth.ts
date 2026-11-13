import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key)));
}

let failedAttempts = 0;
let resetAt = Date.now() + 60000;
let activeChecks = 0;

export async function authenticate(authorization: string | null): Promise<boolean> {
  const username = process.env.DASHBOARD_USERNAME;
  const hash = process.env.DASHBOARD_PASSWORD_HASH;
  if (Date.now() >= resetAt) { failedAttempts = 0; resetAt = Date.now() + 60000; }
  if (failedAttempts >= 20 || activeChecks >= 8) return false;
  if (!username || !hash || !authorization?.startsWith("Basic ") || authorization.length > 2048) return false;
  const [algorithm, salt, encoded] = hash.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(encoded ?? "")) return false;
  const credentials = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  const separator = credentials.indexOf(":");
  if (separator < 1) return false;
  const suppliedUser = Buffer.from(credentials.slice(0, separator));
  const expectedUser = Buffer.from(username);
  activeChecks++;
  try {
    const actual = await derive(credentials.slice(separator + 1), salt);
    const valid = suppliedUser.length === expectedUser.length && timingSafeEqual(suppliedUser, expectedUser) &&
      timingSafeEqual(actual, Buffer.from(encoded, "hex"));
    if (!valid) failedAttempts++;
    return valid;
  } finally { activeChecks--; }
}

export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization, Cookie", "X-Robots-Tag": "noindex, nofollow" };
export function unauthorized() {
  const configured = Boolean(process.env.DASHBOARD_USERNAME && process.env.DASHBOARD_PASSWORD_HASH);
  return Response.json({ error: configured ? "unauthorized" : "authentication_not_configured" }, {
    status: configured ? 401 : 503,
    headers: { ...privateHeaders, ...(configured ? { "WWW-Authenticate": 'Basic realm="tqqq.dalae37.com", charset="UTF-8"' } : {}) },
  });
}
