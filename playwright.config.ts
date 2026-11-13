import { defineConfig } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";

// Ephemeral, isolated test credentials. No application default credentials.
const password = process.env.E2E_PASSWORD ?? randomBytes(24).toString("base64url");
process.env.E2E_PASSWORD = password;
const salt = randomBytes(16).toString("hex");
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1,
  use: { baseURL: "http://127.0.0.1:3107", trace: "retain-on-failure" },
  webServer: {
    command: "node scripts/start-e2e.mjs", url: "http://127.0.0.1:3107/healthz", reuseExistingServer: false,
    env: { HOSTNAME: "127.0.0.1", PORT: "3107", NEXT_TELEMETRY_DISABLED: "1", DATA_ADAPTER: "mock", DASHBOARD_USERNAME: "test-reader",
      DASHBOARD_PASSWORD_HASH: `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
      ENGINE_READ_API_TOKEN: "synthetic-e2e-engine-secret-must-stay-server-side" },
  },
});
