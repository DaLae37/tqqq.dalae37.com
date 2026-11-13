import { test, expect } from "@playwright/test";

test("health is public while all private data and RSC access require authentication", async ({ request }) => {
  expect((await request.get("/healthz")).status()).toBe(200);
  for (const path of ["/", "/strategy", "/market", "/trades", "/portfolio", "/engine", "/dashboard", "/dashboard/portfolio", "/api/dashboard/status", "/api/dashboard/trades", "/api/dashboard/market?symbol=QQQ&interval=day&range=1Y"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401); expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.text()).not.toContain("8023.76");
  }
  for (const path of ["/", "/strategy", "/market", "/trades/order", "/portfolio", "/engine", "/dashboard"]) expect((await request.get(path, { headers: { RSC: "1" } })).status()).toBe(401);
});
test("public demo and private mock remain visibly labeled", async ({ page, request }) => {
  await page.goto("/demo"); await expect(page.getByText("MOCK / 디자인 초안")).toBeVisible();
  await expect(page.locator(".recharts-line").first()).toBeVisible();
  const authorization = `Basic ${Buffer.from(`test-reader:${process.env.E2E_PASSWORD}`).toString("base64")}`;
  const response = await request.get("/api/dashboard/status", { headers: { authorization } });
  expect(response.status()).toBe(200); expect((await response.json()).source).toBe("mock");
  expect(await response.text()).not.toContain("synthetic-e2e-engine-secret");
});
test("chart switches symbol, interval and timezone", async ({ page }) => {
  await page.goto("/demo/market");
  await expect(page.locator(".recharts-line").first()).toBeVisible();
  await page.getByRole("button", { name: "TQQQ", exact: true }).click();
  await expect(page.locator(".chart-heading > strong")).toContainText("TQQQ");
  await page.getByLabel("봉 간격").selectOption("minute");
  await page.getByLabel("차트 시간대").selectOption("America/New_York");
  await expect(page.locator(".chart-panel .data-source")).toContainText("ET");
});
test("table supports combined filters, sorting, pagination and order details", async ({ page }) => {
  await page.goto("/demo/orders");
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
test("empty results, upstream market errors and missing data are explicit", async ({ page }) => {
  await page.goto("/demo/orders"); await page.getByLabel("시작일", { exact: true }).fill("2099-01-01");
  await expect(page.getByText("조건에 맞는 거래가 없습니다")).toBeVisible();
  await page.route("**/api/demo/market?**", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
  await page.goto("/demo"); await expect(page.getByText("시세 조회에 실패했습니다")).toBeVisible();
  await page.unroute("**/api/demo/market?**");
  await page.route("**/api/demo/market?**", (route) => route.fulfill({ json: { bars: [], source: "unavailable", observedAt: null, message: "연결 미설정" } }));
  await page.reload(); await expect(page.getByText("시세 데이터가 없습니다")).toBeVisible();
});
test("BFF rejects arbitrary URLs, unrecognized symbols and write methods", async ({ request }) => {
  expect((await request.get("/api/demo/market?symbol=EVIL&interval=day&range=1Y")).status()).toBe(400);
  expect((await request.get("/api/demo/status?url=https://example.com")).status()).toBe(400);
  expect((await request.get("/api/demo/anything")).status()).toBe(404);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) expect((await request.fetch("/api/demo/orders", { method })).status()).toBe(405);
});
for (const width of [1440, 390]) {
  test(`layout and chart render at ${width}px without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/demo"); await expect(page.locator(".recharts-line").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/dashboard-${width}.png`, fullPage: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: `test-results/dashboard-${width}-dark.png`, fullPage: true });
    for (const path of ["/demo/strategy", "/demo/market", "/demo/trades", "/demo/portfolio", "/demo/engine"]) {
      await page.goto(path); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (path === "/demo/strategy") await page.screenshot({ path: `test-results/strategy-${width}-dark.png`, fullPage: true });
    }
  });
}


test("summary stays compact and each navigation opens its own page", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveTitle("TQQQ 200d MA Strategy Dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("TQQQ 200d MA Strategy Dashboard");
  await expect(page.locator(".summary-card")).toHaveCount(3);
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(page.locator(".chart-toolbar, .table-filters, .strategy-panel")).toHaveCount(0);
  await expect(page.locator(".chart-panel .recharts-scatter")).toHaveCount(1);
  for (const [name, path] of [["Strategy", "/demo/strategy"], ["Market", "/demo/market"], ["Trades", "/demo/trades"], ["Portfolio", "/demo/portfolio"], ["Engine", "/demo/engine"], ["Dashboard", "/demo"]]) {
    const link = page.getByRole("navigation").getByRole("link", { name, exact: true });
    await link.click();
    await expect(page).toHaveURL(path);
    await expect(link).toHaveAttribute("aria-current", "page");
  }
});

test("strategy explains the engine rules and distinguishes missing evidence", async ({ page }) => {
  await page.goto("/demo/strategy");
  await expect(page.getByRole("heading", { name: "QQQ SMA200으로 판단하고 TQQQ를 매매" })).toBeVisible();
  await expect(page.getByText("TQQQ 자체의 200일 이동평균선으로 판단하지 않습니다.", { exact: false })).toBeVisible();
  await expect(page.getByText("확대 2회", { exact: true })).toBeVisible();
  await expect(page.getByText("이후 +100%마다", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "SPYM 장기 적립" })).toBeVisible();
  await expect(page.getByText("현재 평가에서 제공된 판단 근거", { exact: true })).toBeVisible();
  await expect(page.locator("meta[property='og:title']")).toHaveAttribute("content", "TQQQ 200d MA Strategy Dashboard");
});

test("authenticated canonical routes retain the protected read-only API", async ({ request }) => {
  const authorization = `Basic ${Buffer.from(`test-reader:${process.env.E2E_PASSWORD}`).toString("base64")}`;
  for (const path of ["/", "/strategy", "/market", "/trades", "/portfolio", "/engine"]) {
    const response = await request.get(path, { headers: { authorization } });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.text()).toContain("MOCK / 디자인 초안");
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) expect((await request.fetch("/api/dashboard/orders", { method, headers: { authorization } })).status()).toBe(405);
});
