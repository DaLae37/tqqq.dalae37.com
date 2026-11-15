import { PreciseDecimal as Decimal } from "@/lib/decimal";
import { money } from "@/lib/format";

export function ProfitLoss({ value, currency = "USD" }: { value: string | null | undefined; currency?: string }) {
  const amount = value == null ? null : new Decimal(value);
  const direction = amount == null ? "missing" : amount.gt(0) ? "gain" : amount.lt(0) ? "loss" : "neutral";
  return <span className="pnl-value" data-direction={direction}>{direction === "gain" ? "+" : ""}{money(value, currency)}</span>;
}
