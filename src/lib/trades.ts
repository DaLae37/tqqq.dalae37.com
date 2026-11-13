import type { OrderEvent, Trade } from "./contracts.ts";

export function uniqueFills(events: OrderEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (event.event_type !== "FILL" || !event.broker_execution_id || !event.fill_quantity || !event.fill_price) return false;
    const key = `${event.trade_id}:${event.broker_execution_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export type TradeFilter = { symbol: string; side: string; status: string; from: string; to: string; direction: "desc" | "asc"; zone: string };
function dayAt(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function filterTrades(items: Trade[], filter: TradeFilter) {
  return items.filter((item) => {
    const day = dayAt(item.created_at, filter.zone);
    return (!filter.symbol || item.symbol === filter.symbol) && (!filter.side || item.side === filter.side) &&
      (!filter.status || item.status === filter.status) && (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to);
  }).sort((a, b) => (Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id)) * (filter.direction === "asc" ? 1 : -1));
}
