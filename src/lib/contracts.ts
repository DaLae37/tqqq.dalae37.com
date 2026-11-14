import { z } from "zod";

const text = z.string().max(500);
const decimal = z.string().max(80).regex(/^-?\d+(?:\.\d+)?$/);
const maybeDecimal = decimal.nullish();
const maybeText = text.nullish();
const integer = z.number().int().nonnegative();
const timestamp = z.string().max(80).refine((value) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), "timezone required");
const diagnostic = z.object({ stage: maybeText, code: maybeText, response_code: maybeText }).nullish();
const signal = z.object({
  key: maybeText, symbol: text, side: text, reason: text, signal_price: decimal,
  sma_value: maybeDecimal, signal_symbol: maybeText, source_day: text,
  strategy_version: text, effective_buy_buffer: maybeDecimal, effective_sell_buffer: maybeDecimal,
});

export const statusSchema = z.object({
  mode: z.enum(["pause", "start", "test", "stop"]), orders_enabled: z.boolean(),
  dry_run: z.boolean().optional(), health: z.object({ db: z.boolean(), api: z.boolean(), schema: z.boolean().optional() }),
  reason: maybeText, last_check_at: timestamp.nullish(), last_evaluation_at: timestamp.nullish(),
  strategy_version: text, live_trading_enabled: z.boolean(), execution_adapter_available: z.boolean().optional(),
  live_profile_configured: z.boolean().optional(), migration_in_progress: z.boolean().optional(),
  extended_hours_verified: z.boolean().optional(), last_error: maybeText, last_start_error: maybeText,
  last_error_details: diagnostic, last_start_error_details: diagnostic, tax_status: maybeText,
  assessment: z.object({
    status: maybeText, session: maybeText, requirements: z.array(text).optional(),
    trend: signal.nullish(), take_profit: signal.nullish(), close_count: integer.optional(),
    signals_persisted: z.boolean().optional(),
    trend_buffer: z.object({ buy: decimal, sell: decimal, steps: integer, expires_at: timestamp.nullish() }).optional(),
    funding: z.object({ mode: maybeText, cash: maybeDecimal, settled_cash: maybeDecimal, orderable: maybeDecimal,
      trading_cash: maybeDecimal, protected_cash: maybeDecimal, funding_debit: maybeDecimal }).optional(),
  }).nullish(),
});

const cycleSchema = z.object({
  id: text, strategy_version: text, opened_at: timestamp, entry_price: decimal,
  initial_quantity: integer, remaining: integer, completed: z.array(text), unavailable: z.array(text),
  stage_fills: z.record(z.string(), integer).optional(),
});
const snapshotSchema = z.object({
  at: timestamp.optional(), cash: maybeDecimal, settled_cash: maybeDecimal, orderable: maybeDecimal,
  equity: maybeDecimal, currency: maybeText, tqqq: integer.optional(), spym: integer.optional(),
  funding_mode: maybeText, funding_fx_rate: maybeDecimal, other_currency_collateral: maybeDecimal,
});
export const portfolioSchema = z.object({
  initialized: z.boolean().optional(), strategy_version: maybeText, halted: z.boolean().optional(),
  revision: integer.optional(), halt_reason: maybeText,
  portfolio: z.object({
    tqqq: integer, spym: integer, trading_cash: decimal, profit_cash: decimal, tax_cash: decimal,
    funding_debit: decimal.optional(), integrated_orderable: maybeDecimal,
    spym_lots: z.array(z.object({ fill_id: text, available_day: text, amount: decimal })),
    cycle: cycleSchema.nullish(), trend_buffer_steps: integer.optional(), trend_buffer_expires_at: timestamp.nullish(),
  }).optional(),
  daily_snapshots: z.record(z.string(), snapshotSchema).optional(),
});

export const tradeSchema = z.object({
  id: text, parent_id: maybeText, symbol: text, reason: maybeText, side: maybeText,
  quantity: integer.nullish(), filled_quantity: integer, signal_price: maybeDecimal, actual_price: maybeDecimal,
  order_type: maybeText, limit_price: maybeDecimal, session: maybeText, source_day: maybeText,
  strategy_version: maybeText, status: text, broker_id: maybeText, cycle_id: maybeText,
  created_at: timestamp, updated_at: timestamp.nullish(), intent_id: maybeText, signal_key: maybeText,
  order_group_id: maybeText, signal_symbol: maybeText, signal_sma_value: maybeDecimal,
  effective_buy_buffer: maybeDecimal, effective_sell_buffer: maybeDecimal,
  trend_buffer_steps: integer.nullish(), trend_buffer_expires_at: timestamp.nullish(),
});
export const eventSchema = z.object({
  event_id: text, trade_id: text, sequence: integer, event_type: text,
  previous_status: maybeText, new_status: maybeText, broker_order_id: maybeText,
  broker_execution_id: maybeText, fill_quantity: integer.nullish(), fill_price: maybeDecimal,
  fee_amount: maybeDecimal, fee_currency: maybeText, cumulative_filled_quantity: integer.nullish(),
  broker_response_code: maybeText, event_key: text, occurred_at: timestamp, created_at: timestamp,
});
export const versionSchema = z.object({
  strategy_version_id: maybeText, version: text, config_hash: text, verification_status: text,
  created_at: timestamp, activated_at: timestamp.nullish(), deactivated_at: timestamp.nullish(),
  config_snapshot: z.object({
    version: text, sma_period: integer, buy_buffer: decimal, sell_buffer: decimal,
    take_profit_enabled: z.boolean(), steps: z.array(z.object({ threshold: decimal, fraction: decimal })),
    repeat_every: decimal, repeat_fraction: decimal, trend_buffer_increment: decimal.optional(),
    trend_buffer_reset_days: integer.optional(),
  }).nullish(),
}).transform(({ strategy_version_id, version, ...rest }) => ({ ...rest, version_id: strategy_version_id, strategy_version: version }));
export const taxSchema = z.object({
  id: text, tax_year: integer, recognized_day: maybeText, symbol: text, quantity: integer,
  proceeds_krw: maybeDecimal, cost_krw: maybeDecimal, expenses_krw: maybeDecimal, realized_krw: maybeDecimal,
  verification_status: text, order_event_id: maybeText, rebuy_quantity: integer,
});
export const annualSchema = z.object({ year: integer, verified_broker_pnl_krw: decimal,
  pending_count: integer, external_pnl_complete: z.boolean() });
function page<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item).max(200), limit: integer, offset: integer });
}
export const resourceSchemas = {
  status: statusSchema, portfolio: portfolioSchema, signals: page(tradeSchema), orders: page(tradeSchema),
  fills: page(eventSchema), "order-events": page(eventSchema), "open-orders": page(tradeSchema),
  errors: page(tradeSchema), "tax-ledger": page(taxSchema),
  "annual-pnl": z.object({ items: z.array(annualSchema) }), "strategy-versions": page(versionSchema),
  live: z.object({ ok: z.boolean() }), ready: z.object({ ok: z.boolean() }),
};
export type Resource = keyof typeof resourceSchemas;
export type ResourceData<R extends Resource> = z.infer<(typeof resourceSchemas)[R]>;
export type Status = z.infer<typeof statusSchema>;
export type Portfolio = z.infer<typeof portfolioSchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type OrderEvent = z.infer<typeof eventSchema>;
export type StrategyVersion = z.infer<typeof versionSchema>;
export type DataResult<T> = {
  data: T | null; source: "engine" | "disabled"; fetchedAt: string;
  error: "unavailable" | "unauthorized" | "invalid_response" | "not_configured" | null;
};
export type Overview = {
  status: DataResult<Status>; portfolio: DataResult<Portfolio>;
  versions: DataResult<ResourceData<"strategy-versions">>;
  annual: DataResult<ResourceData<"annual-pnl">>;
  live: DataResult<{ ok: boolean }>; ready: DataResult<{ ok: boolean }>;
};
