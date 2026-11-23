import type { Resource } from "../src/lib/contracts.ts";

// Synthetic, deterministic examples. Never used as a fallback for the engine.
export const mockAt = "2026-11-12T20:45:00Z";
const config = {
  version: "1.3", sma_period: 200, buy_buffer: "0.01", sell_buffer: "0.01",
  take_profit_enabled: true, steps: [
    { threshold: "0.10", fraction: "0.10" }, { threshold: "0.25", fraction: "0.10" },
    { threshold: "0.50", fraction: "0.10" }, { threshold: "1", fraction: "0.50" },
    { threshold: "2", fraction: "0.50" },
  ], repeat_every: "1", repeat_fraction: "0.50", trend_buffer_increment: "0.01", trend_buffer_reset_days: 30,
};
const statuses = ["FILLED", "PARTIALLY_FILLED", "CANCEL_PENDING", "CANCELLED", "UNKNOWN", "REJECTED", "ORDER_PENDING"];
const orders = Array.from({ length: 24 }, (_, index) => ({
  id: index === 0 ? "external:00000000-0000-5000-8000-000000000001:order" : `demo-order-${index + 1}`, parent_id: `demo-signal-${index + 1}`, symbol: index % 3 === 2 ? "SPYM" : "TQQQ",
  reason: index % 3 === 2 ? index % 2 ? "TAX_SELL" : "SPYM_BUY" : index % 2 === 0 ? "SMA_BUY" : "TAKE_PROFIT",
  side: index % 2 === 0 ? "BUY" : "SELL", quantity: 10, filled_quantity: index % 7 === 0 ? 10 : index % 7 === 1 ? 4 : 0,
  signal_price: index % 2 === 0 && index % 3 !== 2 ? "530.1200000000" : "62.4100000000", actual_price: index % 7 < 2 ? "62.4100000000" : null,
  order_type: index % 2 === 0 ? "LIMIT" : "MARKET", limit_price: index % 2 === 0 ? "62.4100000000" : null,
  session: "REGULAR", source_day: "2026-11-12", strategy_version: "1.3", status: statuses[index % 7],
  created_at: new Date(Date.parse(mockAt) - index * 86400000).toISOString(), updated_at: mockAt,
  cycle_id: "demo-cycle-001", signal_symbol: index % 3 === 2 ? "SPYM" : index % 2 === 0 ? "QQQ" : "TQQQ", signal_sma_value: "510.0000000000",
  effective_buy_buffer: "0.02", effective_sell_buffer: "0.02",
}));
const events = orders.flatMap((order, index) => {
  const common = { trade_id: order.id, broker_order_id: null, broker_execution_id: null,
    fill_quantity: null, fill_price: null, fee_amount: null, fee_currency: null,
    cumulative_filled_quantity: 0, broker_response_code: null, occurred_at: order.created_at, created_at: order.created_at };
  const submitted = { ...common, event_id: `demo-submit-${index}`, event_key: `demo-submit-${index}`,
    sequence: 1, event_type: "ORDER_SUBMITTED", previous_status: "READY", new_status: "ORDER_PENDING" };
  if (!order.filled_quantity) {
    if (["CANCEL_PENDING", "CANCELLED"].includes(order.status)) {
      const cancel = { ...common, event_id: `demo-cancel-request-${index}`, event_key: `demo-cancel-request-${index}`,
        sequence: 2, event_type: "CANCEL_REQUESTED", previous_status: "ORDER_PENDING", new_status: "CANCEL_PENDING" };
      return order.status === "CANCELLED" ? [submitted, cancel, { ...common, event_id: `demo-cancelled-${index}`,
        event_key: `demo-cancelled-${index}`, sequence: 3, event_type: "CANCELLED", previous_status: "CANCEL_PENDING", new_status: "CANCELLED" }] : [submitted, cancel];
    }
    if (["UNKNOWN", "REJECTED"].includes(order.status)) return [submitted, { ...common, event_id: `demo-state-${index}`,
      event_key: `demo-state-${index}`, sequence: 2, event_type: order.status === "REJECTED" ? "ORDER_REJECTED" : "UNKNOWN",
      previous_status: "ORDER_PENDING", new_status: order.status }];
    return [submitted];
  }
  return [submitted, { ...common, event_id: `demo-fill-${index}`, event_key: `demo-fill-${index}`, sequence: 2,
    event_type: "FILL", previous_status: "ORDER_PENDING", new_status: order.status,
    broker_execution_id: `demo-execution-${index}`, fill_quantity: order.filled_quantity,
    fill_price: order.actual_price, fee_amount: "0.1200000000", fee_currency: "USD",
    cumulative_filled_quantity: order.filled_quantity }];
});

const fixtures: Record<Resource, unknown> = {
  status: {
    mode: "pause", orders_enabled: false, dry_run: false, health: { db: true, api: true, schema: true },
    reason: "operator_pause", last_check_at: mockAt, last_evaluation_at: mockAt, strategy_version: "1.3",
    live_trading_enabled: false, execution_adapter_available: true, live_profile_configured: true,
    migration_in_progress: false, last_error: null, last_start_error: null, tax_status: "not_evaluated",
    api_health_checked: false, api_health_checked_at: mockAt, consecutive_api_failures: 0,
    modules: {
      read_api: { status: "ready", reason: null, blocked_by: [], last_check_at: mockAt, last_success: mockAt, last_error_details: null },
      decision: { status: "ready", reason: null, blocked_by: [], last_check_at: mockAt, last_success: mockAt, last_error_details: null },
      orders: { status: "blocked", reason: "operator_pause", blocked_by: [], last_check_at: mockAt, last_success: null, last_error_details: null },
    },
    assessment: { status: "evaluated", session: "REGULAR", close_count: 200, signals_persisted: false,
      // Engine read-only snapshot, exercised only in isolated tests.
      trend_reference: { status: "ready", reason: null, signal_symbol: "QQQ", trade_symbol: "TQQQ",
        evaluated_at: mockAt, source_day: "2026-11-12", sma_period: 200, close_count: 200, close_confirmed: true,
        close: "530.1200000000", sma_value: "510.0000000000", buy_buffer: "0.02", sell_buffer: "0.02",
        buy_threshold: "520.2000000000", sell_threshold: "499.8000000000" },
      trend: null, take_profit: null, trend_buffer: { buy: "0.02", sell: "0.02", steps: 1, expires_at: "2026-11-30T15:00:00Z" },
      funding: { mode: "INTEGRATED_MARGIN", cash: "1420.5000000000", settled_cash: "1200.0000000000", orderable: "3200.0000000000" } },
  },
  portfolio: {
    strategy_version: "1.3", halted: false, revision: 12, halt_reason: null,
    portfolio: { tqqq: 86, spym: 20, trading_cash: "1000.0000000000", profit_cash: "220.5000000000",
      tax_cash: "0.0000000000", funding_debit: "0.0000000000", integrated_orderable: "3200.0000000000",
      spym_lots: [{ fill_id: "demo-fill-1", available_day: "2026-11-13", amount: "200.0000000000" }],
      cycle: { id: "demo-cycle-001", strategy_version: "1.3", opened_at: "2026-10-31T15:00:00Z",
        entry_price: "54.2300000000", initial_quantity: 100, remaining: 86,
        completed: ["0.10"], unavailable: [], stage_fills: { "0.10": 10, "0.25": 4 } } },
    daily_snapshots: { "2026-11-12": { at: mockAt, cash: "1420.5000000000", settled_cash: "1200.0000000000",
      orderable: "3200.0000000000", equity: "8023.7600000000", currency: "USD", tqqq: 86, spym: 20 } },
  },
  orders: { items: orders, limit: 100, offset: 0 },
  signals: { items: [{ ...orders[0], id: "demo-signal-1", symbol: "TQQQ", reason: "SMA_BUY", side: "BUY",
    status: "READY", signal_symbol: "QQQ", filled_quantity: 0, actual_price: null }], limit: 100, offset: 0 },
  fills: { items: events.filter((event) => event.event_type === "FILL"), limit: 100, offset: 0 },
  "order-events": { items: events, limit: 100, offset: 0 },
  "open-orders": { items: orders.filter((order) => ["ORDER_PENDING", "PARTIALLY_FILLED", "CANCEL_PENDING", "UNKNOWN"].includes(order.status)), limit: 100, offset: 0 },
  errors: { items: orders.filter((order) => ["UNKNOWN", "REJECTED"].includes(order.status)), limit: 100, offset: 0 },
  "strategy-versions": { items: [{ strategy_version_id: "demo-version-1", version: "1.3", config_hash: "demo-config-hash",
    verification_status: "VERIFIED", created_at: mockAt, activated_at: mockAt, deactivated_at: null, config_snapshot: config }], limit: 100, offset: 0 },
  "annual-pnl": { items: [{ year: 2026, verified_broker_pnl_krw: "324500.1250", pending_count: 1, external_pnl_complete: false }] },
  "tax-ledger": { items: [{ id: "demo-tax-1", tax_year: 2026, symbol: "TQQQ", recognized_day: "2026-11-12",
    quantity: 10, realized_krw: "324500.1250", verification_status: "VERIFIED", rebuy_quantity: 0 }], limit: 100, offset: 0 },
  live: { ok: true }, ready: { ok: true },
};

export function mockResource(resource: Resource, limit = 100, offset = 0): unknown {
  const fixture = fixtures[resource];
  if (fixture && typeof fixture === "object" && "items" in fixture && Array.isArray(fixture.items) && resource !== "annual-pnl") {
    return { items: fixture.items.slice(offset, offset + limit), limit, offset };
  }
  return fixture;
}
