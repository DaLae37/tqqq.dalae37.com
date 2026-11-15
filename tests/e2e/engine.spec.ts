import { test, expect } from "@playwright/test";

// Only this test server uses synthetic upstream responses; the app has no mock adapter.
test("public BFF reads the authenticated engine on the server and strips credentials", async ({ request }) => {
  const response = await request.get("/api/dashboard/status");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["www-authenticate"]).toBeUndefined();
  expect(await response.json()).toMatchObject({ source: "engine", data: { mode: "pause" } });
  expect(await response.text()).not.toContain("synthetic-e2e-engine-secret");
  for (const resource of ["live", "ready"]) {
    const health = await request.get(`/api/dashboard/${resource}`);
    expect(health.status()).toBe(200);
    expect(await health.json()).toMatchObject({ source: "engine", data: { ok: true } });
  }
  const orders = await request.get("/api/dashboard/orders");
  expect(orders.status()).toBe(200);
  expect((await orders.json()).data.items).toHaveLength(24);
});

test("public summary and portfolio retain actual upstream values without demo labels", async ({ page }) => {
  await page.route("https://s3.tradingview.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".strategy-reference")).toContainText("QQQ 종가 > 520.2 USD");
  await expect(page.locator(".strategy-reference")).toContainText("QQQ 종가 < 499.8 USD");
  await expect(page.locator(".strategy-reference")).toContainText("510 USD");
  await expect(page.locator(".summary-card")).toHaveCount(3);
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(page.locator(".summary-grid")).toContainText("8,023.76");
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await page.screenshot({ path: "test-results/strategy-reference-engine.png", fullPage: true });
  await page.goto("/portfolio");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("보유 현황");
  await expect(page.locator(".data-error")).toHaveCount(0);
});

test("public trade filters, pagination and individual fills still work", async ({ page }) => {
  await page.goto("/trades");
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await expect(page.locator(".pagination")).toContainText("2페이지");
  await page.getByRole("combobox", { name: "종목", exact: true }).selectOption("TQQQ");
  await page.getByRole("combobox", { name: "매매", exact: true }).selectOption("SELL");
  await page.getByRole("combobox", { name: "상태", exact: true }).selectOption("PARTIALLY_FILLED");
  await page.getByRole("combobox", { name: "정렬", exact: true }).selectOption("asc");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("link", { name: "상세 ↗", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "확인된 개별 체결" })).toBeVisible();
  await expect(page.getByText("ORDER_SUBMITTED", { exact: true })).toBeVisible();
  await expect(page.getByText("FILL", { exact: true })).toBeVisible();
});

test("empty trade filters remain explicit", async ({ page }) => {
  await page.goto("/trades"); await page.getByLabel("시작일", { exact: true }).fill("2099-01-01");
  await expect(page.getByText("조건에 맞는 거래가 없습니다")).toBeVisible();
});
