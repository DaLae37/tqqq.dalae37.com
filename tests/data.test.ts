import test from "node:test";
import assert from "node:assert/strict";
import { resourceSchemas, type OrderEvent } from "../src/lib/contracts.ts";
import { mockResource } from "./fixtures.ts";
import { money, threshold, time } from "../src/lib/format.ts";
import { uniqueFills, filterTrades } from "../src/lib/trades.ts";

test("all mock resources satisfy the engine response contracts", () => {
  for (const resource of Object.keys(resourceSchemas) as Array<keyof typeof resourceSchemas>) {
    const result = resourceSchemas[resource].safeParse(mockResource(resource));
    assert.equal(result.success, true, `${resource}: ${result.success ? "" : result.error.message}`);
  }
});
test("whitelist strips credentials, original payloads and unknown nested fields", () => {
  const fixture = mockResource("status") as Record<string, unknown>;
  const parsed = resourceSchemas.status.parse({ ...fixture, token: "secret", account_number: "private",
    assessment: { status: "evaluated", account_number: "private", raw_response: { key: "secret" } } });
  assert.equal(JSON.stringify(parsed).includes("secret"), false);
  assert.equal(JSON.stringify(parsed).includes("private"), false);
});
test("money keeps original precision, unknown values stay unknown", () => {
  assert.equal(money("9007199254740993.1234567890"), "9,007,199,254,740,993.123456789 USD");
  assert.equal(money(null, "KRW"), "제공되지 않음");
  assert.equal(threshold("510.0000000001", "0.02", "BUY"), "520.200000000102");
  assert.equal(threshold("9007199254740993.1234567890", "0.02", "BUY"), "9187343239835812.98592592478");
});
test("fills deduplicate by order and execution, never cumulative quantity", () => {
  const events = resourceSchemas["order-events"].parse(mockResource("order-events")).items;
  const fill = events.find((item) => item.event_type === "FILL")!;
  const duplicate = { ...fill, event_id: "duplicate", cumulative_filled_quantity: 999 };
  const otherOrder: OrderEvent = { ...fill, trade_id: "different-order", event_id: "other" };
  const unique = uniqueFills([fill, duplicate, otherOrder, ...events.filter((item) => item.event_type !== "FILL")]);
  assert.equal(unique.length, 2);
  assert.equal(unique[0].fill_quantity, fill.fill_quantity);
});
test("filters combine and order by actual timestamp with an explicit date zone", () => {
  const items = resourceSchemas.orders.parse(mockResource("orders")).items;
  const filter = { symbol: "TQQQ", side: "SELL", status: "PARTIALLY_FILLED", from: "", to: "", direction: "asc" as const, zone: "America/New_York" };
  const result = filterTrades(items, filter);
  assert.ok(result.length > 0);
  assert.ok(result.every((item) => item.symbol === "TQQQ" && item.side === "SELL" && item.status === "PARTIALLY_FILLED"));
  assert.ok(result.every((item, index) => index === 0 || item.created_at >= result[index - 1].created_at));
  assert.equal(filterTrades(items, { ...filter, from: "2099-01-01" }).length, 0);
});
test("time zones handle the US daylight saving transition", () => {
  assert.match(time("2026-11-01T05:30:00Z", "America/New_York"), /01:30:00/);
  assert.match(time("2026-11-01T06:30:00Z", "America/New_York"), /01:30:00/);
  assert.match(time("2026-11-01T06:30:00Z", "Asia/Seoul"), /15:30:00/);
});
test("non decimal money and naive timestamps are rejected", () => {
  const orders = mockResource("orders") as { items: object[]; limit: number; offset: number };
  assert.equal(resourceSchemas.orders.safeParse({ ...orders, items: [{ ...orders.items[0], actual_price: 62.4 }] }).success, false);
  assert.equal(resourceSchemas.orders.safeParse({ ...orders, items: [{ ...orders.items[0], created_at: "2026-11-12 20:00:00" }] }).success, false);
});
