import type { Overview } from "./contracts.ts";
import { threshold } from "./format.ts";
import { PreciseDecimal as Decimal } from "./decimal.ts";

function positive(value: string | null | undefined): value is string {
  return value != null && new Decimal(value).gt(0);
}

export function strategyReference(data: Overview) {
  const status = data.status.error ? null : data.status.data;
  const assessment = status?.assessment;
  const reference = assessment?.trend_reference;
  const version = data.versions.error ? null : data.versions.data?.items.find((item) => item.strategy_version === status?.strategy_version && !item.deactivated_at);
  const signal = assessment?.trend?.signal_symbol === "QQQ" ? assessment.trend : null;
  if (reference?.status === "ready" && reference.close_confirmed && reference.sma_period === 200 && reference.close_count === 200 &&
    reference.source_day && positive(reference.close) && positive(reference.sma_value) && reference.buy_buffer != null &&
    reference.sell_buffer != null && reference.buy_threshold != null && reference.sell_threshold != null) {
    return { source: "reference" as const, close: reference.close, sma: reference.sma_value,
      buy: reference.buy_threshold, sell: reference.sell_threshold, buyBuffer: reference.buy_buffer,
      sellBuffer: reference.sell_buffer, day: reference.source_day, at: reference.evaluated_at };
  }
  // An explicit unavailable snapshot supersedes old signal evidence.
  if (!reference && version?.config_snapshot?.sma_period === 200 && signal?.strategy_version === status?.strategy_version &&
    signal && positive(signal.sma_value) && positive(signal.signal_price) && status?.last_evaluation_at) {
    return { source: "signal" as const, close: signal.signal_price, sma: signal.sma_value,
      buy: threshold(signal.sma_value, signal.effective_buy_buffer, "BUY"),
      sell: threshold(signal.sma_value, signal.effective_sell_buffer, "SELL"),
      buyBuffer: signal.effective_buy_buffer, sellBuffer: signal.effective_sell_buffer,
      day: signal.source_day, at: status.last_evaluation_at };
  }
  return { source: "missing" as const, close: null, sma: null, buy: null, sell: null,
    buyBuffer: assessment?.trend_buffer?.buy, sellBuffer: assessment?.trend_buffer?.sell, day: null, at: null };
}
