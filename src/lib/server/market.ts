import "server-only";
import { z } from "zod";

export const marketQuery = z.object({ symbol: z.enum(["QQQ", "TQQQ", "SPYM"]),
  interval: z.enum(["day", "minute"]), range: z.enum(["1D", "1M", "3M", "1Y"]) });
export type MarketQuery = z.infer<typeof marketQuery>;
export type Bar = { at: string; tradingDay: string; close: string; volume: number | null; sma: string | null; session: string };
export type MarketData = { bars: Bar[]; source: "mock" | "unavailable"; fetchedAt: string; observedAt: string | null; message: string | null };
const cache = new Map<string, { expires: number; data: MarketData }>();

export async function marketData(query: MarketQuery, demo: boolean): Promise<MarketData> {
  if (!demo && process.env.DATA_ADAPTER !== "mock") return {
    bars: [], source: "unavailable", fetchedAt: new Date().toISOString(), observedAt: null,
    message: "시세 어댑터 미연결. 종목별 거래소 코드, 인증 분리와 내부 조회 경로를 확인해야 합니다.",
  };
  const key = `${query.symbol}:${query.interval}:${query.range}`;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.data;
  const count = query.interval === "minute" ? 78 : query.range === "1M" ? 22 : query.range === "3M" ? 66 : 260;
  const base = { QQQ: 510, TQQQ: 54, SPYM: 66 }[query.symbol];
  const end = Date.parse("2026-11-12T20:45:00Z");
  const bars: Bar[] = [];
  for (let index = 0; index < count; index++) {
    const at = new Date(end - (count - 1 - index) * (query.interval === "minute" ? 300000 : 86400000));
    if (query.interval === "day" && [0, 6].includes(at.getUTCDay())) continue;
    bars.push({ at: at.toISOString(), tradingDay: at.toISOString().slice(0, 10),
      close: (base * (1 + index / count * .09 + Math.sin(index * .24) * .023 + Math.sin(index * 1.8) * .004)).toFixed(4),
      volume: 1200000 + Math.round((1 + Math.sin(index * .7)) * 1400000),
      sma: query.symbol === "QQQ" && query.interval === "day" ? (base * (.97 + index / count * .05)).toFixed(4) : null,
      session: "REGULAR" });
  }
  const data: MarketData = { bars, source: "mock", fetchedAt: new Date().toISOString(), observedAt: bars.at(-1)?.at ?? null,
    message: "합성 시세와 SMA 예시입니다. 실제 시세, 영업일, 투자 성과를 나타내지 않습니다." };
  cache.set(key, { expires: Date.now() + 30000, data });
  return data;
}
