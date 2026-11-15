import { test, expect } from "@playwright/test";

// The embed is isolated from third-party availability in automated UI checks.
const widgetScript = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
test.beforeEach(async ({ page }) => {
  await page.route(widgetScript, (route) => route.fulfill({ contentType: "application/javascript", body: `(() => { const script = document.currentScript; const frame = document.createElement("iframe"); frame.src = "https://www.tradingview-widget.com/embed-widget/advanced-chart/?fixture=1"; frame.style.cssText = "width:100%;height:100%;border:0"; script.parentElement.querySelector(".tradingview-widget-container__widget").append(frame); })();` }));
  await page.route("https://www.tradingview-widget.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>TradingView test fixture</title><p>Isolated widget fixture</p>" }));
});

test("all pages and RSC are public, missing data stays empty and demo routes are removed", async ({ request }) => {
  for (const path of ["/", "/strategy", "/market", "/trades", "/portfolio", "/engine", "/dashboard", "/healthz"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["www-authenticate"]).toBeUndefined();
    if (path !== "/healthz") expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.text()).not.toContain("8023.76");
  }
  for (const path of ["/", "/strategy", "/market", "/trades", "/portfolio", "/engine", "/dashboard"]) expect((await request.get(path, { headers: { RSC: "1" } })).status()).toBe(200);
  for (const path of ["/demo", "/demo/market", "/demo/trades", "/api/demo/status", "/api/demo/market", "/api/dashboard/market"]) expect((await request.get(path)).status()).toBe(404);
  const response = await request.get("/api/dashboard/status");
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({ source: "disabled", data: null, error: "not_configured" });
});

test("official widget switches symbols and follows the site theme without engine data", async ({ page }) => {
  await page.goto("/market");
  await expect(page.getByTitle("TQQQ 시세 — TradingView 공식 위젯")).toBeVisible();
  const config = () => page.locator(`script[src="${widgetScript}"]`).textContent().then((value) => JSON.parse(value!));
  expect(await config()).toMatchObject({ symbol: "NASDAQ:TQQQ", interval: "D", allow_symbol_change: false });
  await page.getByRole("button", { name: "QQQ", exact: true }).click();
  await expect(page.getByTitle("QQQ 시세 — TradingView 공식 위젯")).toBeVisible();
  expect(await config()).toMatchObject({ symbol: "NASDAQ:QQQ" });
  await page.getByRole("button", { name: "SPYM", exact: true }).click();
  await expect(page.getByTitle("SPYM 시세 — TradingView 공식 위젯")).toBeVisible();
  expect(await config()).toMatchObject({ symbol: "AMEX:SPYM" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(async () => (await config()).theme).toBe("dark");
  expect(await page.locator(".chart-panel iframe").count()).toBe(1);
  expect(JSON.stringify(await config())).not.toMatch(/token|orders|signals|fills|8023/);
  await expect(page.locator("footer").getByRole("link", { name: "TradingView", exact: true })).toBeVisible();
});

test("blocked widget offers retry and a source link without synthetic prices", async ({ page }) => {
  await page.route(widgetScript, (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("TradingView 위젯을 불러오지 못했습니다.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 불러오기", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "TQQQ chart", exact: true })).toHaveAttribute("href", "https://www.tradingview.com/symbols/NASDAQ-TQQQ/");
  await expect(page.locator(".chart-heading")).not.toContainText("$");
  await expect(page.locator(".summary-card")).toHaveCount(3);
});

test("public BFF rejects arbitrary resources, URLs, invalid pagination and writes", async ({ request }) => {
  for (const path of ["/api/dashboard/status?url=https://example.com", "/api/dashboard/orders?limit=201", "/api/dashboard/orders?offset=-1", "/api/dashboard/overview?url=https://example.com"]) expect((await request.get(path)).status()).toBe(400);
  expect((await request.get("/api/dashboard/anything")).status()).toBe(404);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) expect((await request.fetch("/api/dashboard/orders", { method })).status()).toBe(405);
});

for (const width of [1440, 390]) {
  test(`public navigation and Light/Dark layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTitle("TQQQ 시세 — TradingView 공식 위젯")).toBeVisible();
    await expect(page).toHaveTitle("200TQQQ");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("TQQQ 200d MA Strategy Dashboard");
    await expect(page.locator(".site-header")).not.toContainText("TQQQ 200d MA Strategy Dashboard");
    await expect(page.locator("body")).not.toContainText("READ ONLY");
    await expect(page.locator("meta[property='og:title']")).toHaveAttribute("content", "200TQQQ");
    await expect(page.locator(".site-header .brand")).toHaveText("200TQQQ메리츠증권 Open API · Super365");
    const license = page.locator("footer .cc-license");
    await expect(license).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
    await expect(license).toHaveAttribute("rel", "license noreferrer noopener");
    await expect(license).toContainText("CC BY 4.0.");
    await expect(license.locator("img")).toHaveCount(2);
    for (const icon of await license.locator("img").all()) expect(await icon.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(page.locator(".header-links").getByRole("link", { name: "메리츠 Open API ↗", exact: true })).toHaveAttribute("href", "https://openapi.imeritz.com/");
    await expect(page.locator(".page-heading > div > p:last-child")).toHaveText("메리츠증권 Open API와 Super365 계좌로 운용하는 TQQQ자동매매 대시보드입니다.");
    await expect(page.getByRole("heading", { name: "200일선 매매 판단" })).toBeVisible();
    await expect(page.locator(".strategy-reference")).toContainText("엔진에서 확정 종가와 SMA200 판단값을 아직 제공하지 않았습니다.");
    await expect(page.locator(".summary-card")).toHaveCount(3);
    await expect(page.locator(".chart-toolbar, .table-filters, .strategy-panel, .demo-banner")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/dashboard-${width}.png`, fullPage: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => page.locator(`script[src="${widgetScript}"]`).textContent().then((value) => JSON.parse(value!).theme)).toBe("dark");
    await page.screenshot({ path: `test-results/dashboard-${width}-dark.png`, fullPage: true });
    for (const [name, path] of [["Strategy", "/strategy"], ["Market", "/market"], ["Trades", "/trades"], ["Portfolio", "/portfolio"], ["Engine", "/engine"], ["Dashboard", "/"]]) {
      const link = page.getByRole("navigation").getByRole("link", { name, exact: true });
      await link.click(); await expect(page).toHaveURL(path); await expect(link).toHaveAttribute("aria-current", "page");
      const descriptions: Record<string, string> = {
        Strategy: "QQQ SMA200 기반 매매 전략과 동적 완충 폭, 분할 익절 및 SPYM 적립 현황을 확인합니다.",
        Market: "TradingView 공식 위젯으로 TQQQ·QQQ·SPYM의 시세와 거래량을 확인합니다.",
        Trades: "TQQQ·SPYM의 주문 및 체결 이력을 조회하고 종목·기간·상태별로 확인합니다.",
        Portfolio: "TQQQ·SPYM의 보유 현황, 계좌 평가금액과 확인된 실현손익 및 SPYM 적립 예산을 확인합니다.",
        Engine: "엔진의 실행 모드, 읽기 API 준비 상태와 거래 모듈별 연결·오류 상태를 확인합니다.",
        Dashboard: "메리츠증권 Open API와 Super365 계좌로 운용하는 TQQQ자동매매 대시보드입니다.",
      };
      await expect(page.locator(".page-heading > div > p:last-child")).toHaveText(descriptions[name]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (name === "Strategy") {
        await expect(page.getByRole("heading", { name: "QQQ SMA200으로 판단하고 TQQQ를 매매" })).toBeVisible();
        await expect(page.getByText("확대 2회", { exact: true })).toBeVisible();
        await expect(page.getByText("이후 +100%마다", { exact: true })).toBeVisible();
        await page.emulateMedia({ colorScheme: "light" });
        await page.screenshot({ path: `test-results/strategy-${width}-light.png`, fullPage: true });
        await page.emulateMedia({ colorScheme: "dark" });
        await page.screenshot({ path: `test-results/strategy-${width}-dark.png`, fullPage: true });
      }
    }
    expect(errors).toEqual([]);
  });
}
