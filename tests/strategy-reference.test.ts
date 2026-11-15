import test from "node:test";
import assert from "node:assert/strict";
import { resourceSchemas, type Overview } from "../src/lib/contracts.ts";
import { strategyReference } from "../src/lib/strategy-reference.ts";
import { mockResource } from "./fixtures.ts";

function overview(): Overview {
  const result = <T>(data: T) => ({ data, source: "engine" as const, error: null, fetchedAt: "2026-11-12T20:45:00Z" });
  return { status: result(resourceSchemas.status.parse(mockResource("status"))),
    portfolio: result(resourceSchemas.portfolio.parse(mockResource("portfolio"))),
    versions: result(resourceSchemas["strategy-versions"].parse(mockResource("strategy-versions"))),
    annual: result(resourceSchemas["annual-pnl"].parse(mockResource("annual-pnl"))),
    live: result({ ok: true }), ready: result({ ok: true }) };
}

test("next thresholds use one confirmed engine snapshot and retain decimal strings", () => {
  const data = overview();
  const reference = strategyReference(data);
  assert.equal(reference.source, "reference");
  assert.equal(reference.sma, "510.0000000000");
  assert.equal(reference.buy, "520.2000000000");
  assert.equal(reference.sell, "499.8000000000");
  data.status.data!.assessment!.trend_buffer!.buy = "0.99";
  assert.equal(strategyReference(data).buy, "520.2000000000");
});

test("unconfirmed, incomplete and different-period snapshots are never shown as SMA200", () => {
  for (const change of [{ close_confirmed: false }, { close_count: 199 }, { sma_period: 50 },
    { source_day: null }, { sma_value: null }, { sma_value: "0" }, { close: "-1" }, { status: "unavailable" as const }]) {
    const data = overview(); Object.assign(data.status.data!.assessment!.trend_reference!, change);
    assert.equal(strategyReference(data).source, "missing");
    assert.equal(strategyReference(data).buy, null);
  }
  const data = overview(); data.status.error = "unavailable";
  assert.equal(strategyReference(data).source, "missing");
});

test("old engine responses show missing prices without synthesizing SMA from buffers", () => {
  const data = overview(); delete data.status.data!.assessment!.trend_reference;
  assert.equal(strategyReference(data).source, "missing");
  assert.equal(strategyReference(data).sma, null);
  assert.equal(strategyReference(data).buyBuffer, "0.02");
});

test("legacy signal evidence uses its own buffers and requires the matching SMA200 version", () => {
  const data = overview(); const assessment = data.status.data!.assessment!;
  delete assessment.trend_reference;
  assessment.trend = { symbol: "TQQQ", side: "BUY", reason: "SMA_BUY", signal_symbol: "QQQ", signal_price: "530.12",
    sma_value: "510", source_day: "2026-11-12", strategy_version: "1.3", effective_buy_buffer: "0.01", effective_sell_buffer: "0.01" };
  assert.equal(strategyReference(data).source, "signal");
  assert.equal(strategyReference(data).buy, "515.1");
  assert.equal(strategyReference(data).sell, "504.9");
  assessment.trend.strategy_version = "1.2";
  assert.equal(strategyReference(data).source, "missing");
  assessment.trend.strategy_version = "1.3";
  data.versions.data!.items[0].config_snapshot!.sma_period = 50;
  assert.equal(strategyReference(data).source, "missing");
});

test("an unavailable new snapshot supersedes legacy signal evidence", () => {
  const data = overview(); const assessment = data.status.data!.assessment!;
  assessment.trend_reference!.status = "unavailable";
  assessment.trend = { symbol: "TQQQ", side: "BUY", reason: "SMA_BUY", signal_symbol: "QQQ", signal_price: "530.12",
    sma_value: "510", source_day: "2026-11-12", strategy_version: "1.3", effective_buy_buffer: "0.01", effective_sell_buffer: "0.01" };
  assert.equal(strategyReference(data).source, "missing");
});
