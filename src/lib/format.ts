import { PreciseDecimal as Decimal } from "./decimal.ts";

export type TimeZone = "Asia/Seoul" | "America/New_York";
export function money(value: string | null | undefined, currency = "USD"): string {
  if (value == null) return "제공되지 않음";
  // Group the original decimal string without converting it to binary floating point.
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = fraction?.replace(/0+$/, "");
  return `${grouped}${trimmed ? `.${trimmed}` : ""} ${currency}`;
}
export function percent(value: string | null | undefined): string {
  return value == null ? "제공되지 않음" : `${new Decimal(value).mul(100).toString()}%`;
}
export function time(value: string | null | undefined, zone: TimeZone = "Asia/Seoul"): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "확인되지 않음";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
export function threshold(sma: string | null | undefined, buffer: string | null | undefined, side: "BUY" | "SELL") {
  return sma == null || buffer == null ? null : new Decimal(sma).mul(new Decimal(1)[side === "BUY" ? "plus" : "minus"](buffer)).toString();
}
export const stateLabels: Record<string, string> = {
  FILLED: "체결 완료", PARTIALLY_FILLED: "부분 체결", PARTIAL: "부분 체결", CANCEL_PENDING: "취소 요청 중",
  CANCELLED: "취소 완료", UNKNOWN: "미확정", REJECTED: "거부", ORDER_PENDING: "주문 대기", PENDING: "주문 대기", READY: "준비",
  REGULAR: "정규장", PRE_MARKET: "프리마켓", AFTER_MARKET: "애프터마켓", CLOSED: "휴장 / 장 종료",
  SMA_BUY: "SMA 매수", SMA_SELL: "SMA 전량 매도", TAKE_PROFIT: "분할 익절", SPYM_BUY: "SPYM 적립",
  SPYM_ACCUMULATE: "SPYM 적립", TAX_SELL: "절세 매도", TAX_REBUY: "절세 재매수",
  EXTERNAL_BUY: "외부 매수", EXTERNAL_SELL: "외부 매도",
};
export function label(value: string | null | undefined) { return value ? stateLabels[value] ?? value : "확인되지 않음"; }
