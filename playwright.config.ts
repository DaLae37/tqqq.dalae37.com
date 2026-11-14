import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1,
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "public", testMatch: "dashboard.spec.ts", use: { baseURL: "http://127.0.0.1:3107" } },
    { name: "engine", testMatch: "engine.spec.ts", use: { baseURL: "http://127.0.0.1:3108" } },
  ],
  webServer: [
    { command: "node scripts/start-e2e.mjs", url: "http://127.0.0.1:3107/healthz", reuseExistingServer: false,
      env: { HOSTNAME: "127.0.0.1", PORT: "3107", NEXT_TELEMETRY_DISABLED: "1" } },
    { command: "node scripts/start-e2e.mjs --engine", url: "http://127.0.0.1:3108/healthz", reuseExistingServer: false,
      env: { HOSTNAME: "127.0.0.1", PORT: "3108", NEXT_TELEMETRY_DISABLED: "1" } },
  ],
});
