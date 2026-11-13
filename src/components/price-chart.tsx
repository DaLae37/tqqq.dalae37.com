"use client";

import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { OrderEvent, Trade } from "@/lib/contracts";
import type { MarketData } from "@/lib/server/market";
import { label, money, threshold, time, type TimeZone } from "@/lib/format";
import { uniqueFills } from "@/lib/trades";
import { EmptyState } from "@/components/data-state";

type Point = { x: number; price: number; at: string; kind: string; detail: string; rawPrice: string; buy?: string | null; sell?: string | null };
function ChartTooltip({ active, payload, zone, smaLabel }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Partial<Point> & { rawClose?: string; volume?: number; sma?: number; session?: string } }>; zone: TimeZone; smaLabel: string }) {
  if (!active || !payload?.length) return null;
  const point = payload.find((item) => item.payload?.kind)?.payload ?? payload[0]?.payload;
  if (!point) return null;
  return <div className="chart-tooltip"><strong>{time(point.at, zone)}</strong><p>{point.kind ?? "가격"}: {money(point.rawPrice ?? point.rawClose)}</p>
    {point.detail && <p>{point.detail}</p>}{point.session && <p>{label(point.session)}</p>}
    {point.sma && <p>{smaLabel}: {money(String(point.sma))}</p>}{point.buy && <p>판단 당시 매수 기준: {money(point.buy)}</p>}{point.sell && <p>판단 당시 매도 기준: {money(point.sell)}</p>}
    {point.volume != null && <p>거래량: {point.volume.toLocaleString("ko-KR")}</p>}</div>;
}

export function PriceChart({ base, orders, events, signals, smaPeriod, preview = false }: { base: string; orders: Trade[]; events: OrderEvent[]; signals: Trade[]; smaPeriod?: number; preview?: boolean }) {
  const smaLabel = smaPeriod ? `SMA${smaPeriod}` : "SMA (기간 미제공)";
  const [symbol, setSymbol] = useState("QQQ");
  const [range, setRange] = useState("3M");
  const [interval, setInterval] = useState("day");
  const [zone, setZone] = useState<TimeZone>("Asia/Seoul");
  const [market, setMarket] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setMarket(null); setError(null); setLoading(true);
    fetch(`/api${base}/market?${new URLSearchParams({ symbol, range, interval })}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(response.status === 401 ? "인증이 필요합니다" : "시세 조회에 실패했습니다"); return response.json() as Promise<MarketData>; })
      .then((data) => { if (!controller.signal.aborted) setMarket(data); })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "시세 조회 실패"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [symbol, range, interval, base, refresh]);
  const chartData = market?.bars.map((bar) => ({ x: Date.parse(bar.at), price: Number(bar.close), rawClose: bar.close,
    at: bar.at, volume: bar.volume, sma: bar.sma == null ? null : Number(bar.sma), session: bar.session })) ?? [];
  function coordinate(at: string, day?: string | null) {
    if (interval === "minute") return Date.parse(at);
    const tradingDay = day ?? new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
    return Date.parse(market?.bars.find((bar) => bar.tradingDay === tradingDay)?.at ?? "");
  }
  const signalPoints: Point[] = symbol === "QQQ" ? signals.filter((item) => item.signal_symbol === "QQQ" && item.signal_price).map((item) => ({
    x: coordinate(item.created_at, item.source_day), price: Number(item.signal_price), rawPrice: item.signal_price!, at: item.created_at,
    kind: "신호", detail: `${label(item.reason)} / 신호일 ${item.source_day} (미국 거래일)`,
    buy: threshold(item.signal_sma_value, item.effective_buy_buffer, "BUY"), sell: threshold(item.signal_sma_value, item.effective_sell_buffer, "SELL"),
  })) : [];
  const fillPoints: Point[] = symbol === "QQQ" ? [] : uniqueFills(events).flatMap((event) => {
    const order = orders.find((item) => item.id === event.trade_id && item.symbol === symbol);
    return order ? [{ x: coordinate(event.occurred_at), price: Number(event.fill_price), rawPrice: event.fill_price!, at: event.occurred_at,
      kind: "실제 체결", detail: `${order.side === "BUY" ? "매수" : "매도"} ${event.fill_quantity}주 / ${label(order.reason)} / ${label(event.new_status)}` }] : [];
  });
  const orderPoints: Point[] = symbol === "QQQ" ? [] : events.filter((event) => event.event_type === "ORDER_SUBMITTED").flatMap((event) => {
    const order = orders.find((item) => item.id === event.trade_id && item.symbol === symbol);
    // A market order without a submitted price has no fabricated y coordinate.
    return order?.limit_price ? [{ x: coordinate(event.occurred_at), price: Number(order.limit_price), rawPrice: order.limit_price,
      at: event.occurred_at, kind: "주문 전송", detail: `${order.quantity}주 지정가 / 현재 ${label(order.status)} / 체결과 구분` }] : [];
  });
  const min = chartData[0]?.x ?? 0;
  const max = chartData.at(-1)?.x ?? 0;
  const inRange = (points: Point[]) => points.filter((point) => Number.isFinite(point.x) && point.x >= min && point.x <= max);
  const lastBar = market?.bars.at(-1);
  return <section className="panel chart-panel" aria-labelledby="chart-title">
    <div className="panel-heading"><div><p className="eyebrow">MARKET & EXECUTION</p><h2 id="chart-title">{preview ? "QQQ / SMA200 미리보기" : "시세와 거래 이벤트"}</h2></div><span className="badge">{market?.source === "mock" ? "합성 시세" : "연결 미확인"}</span></div>
    {!preview && <div className="chart-toolbar"><div className="segmented" aria-label="종목 선택">{["QQQ", "TQQQ", "SPYM"].map((item) => <button key={item} aria-pressed={symbol === item} onClick={() => setSymbol(item)}>{item}</button>)}</div>
      <label><span className="visually-hidden">봉 간격</span><select value={interval} onChange={(event) => { setInterval(event.target.value); setRange(event.target.value === "minute" ? "1D" : "3M"); }}><option value="day">일봉</option><option value="minute">분봉 (5분)</option></select></label>
      <label><span className="visually-hidden">조회 기간</span><select value={range} onChange={(event) => setRange(event.target.value)}>{(interval === "minute" ? ["1D"] : ["1M", "3M", "1Y"]).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span className="visually-hidden">차트 시간대</span><select value={zone} onChange={(event) => setZone(event.target.value as TimeZone)}><option value="Asia/Seoul">KST</option><option value="America/New_York">미국 동부</option></select></label><button className="button" onClick={() => setRefresh((value) => value + 1)}>갱신</button>
    </div>}
    <div className="chart-heading"><strong>{symbol}<small>{symbol === "QQQ" ? "전략 판단용 / 거래 종목 아님" : "거래 및 보유 종목"}</small></strong><div><b>{lastBar ? money(lastBar.close) : "—"}</b><small>{label(lastBar?.session)}</small></div></div>
    <div className="chart-canvas" aria-label={`${symbol} 가격 차트`}>
      {loading ? <EmptyState title="시세를 조회하고 있습니다" /> : error ? <EmptyState title={error}>다시 조회하거나 인증 상태를 확인하세요.</EmptyState> : chartData.length ?
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 8, bottom: 8, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke="var(--line)" vertical={false} strokeDasharray="3 4" />
            <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} tickLine={false} axisLine={false} minTickGap={40} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(value: number) => new Intl.DateTimeFormat("ko-KR", { timeZone: interval === "day" ? "America/New_York" : zone, ...(interval === "day" ? { month: "numeric", day: "numeric" } : { hour: "2-digit", minute: "2-digit" }) }).format(new Date(value))} />
            <YAxis yAxisId="price" domain={["auto", "auto"]} orientation="right" tickLine={false} axisLine={false} width={58} tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis yAxisId="volume" hide domain={[0, (maximum: number) => maximum * 5]} />
            <Tooltip content={<ChartTooltip zone={zone} smaLabel={smaLabel} />} />
            <Bar yAxisId="volume" dataKey="volume" fill="var(--chart-volume)" isAnimationActive={false} />
            <Line yAxisId="price" dataKey="price" name="가격" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {symbol === "QQQ" && <Line yAxisId="price" dataKey="sma" name={smaLabel} stroke="var(--chart-sma)" strokeWidth={1.5} dot={false} strokeDasharray="5 4" isAnimationActive={false} connectNulls={false} />}
            {inRange(signalPoints).length > 0 && <Scatter yAxisId="price" data={inRange(signalPoints)} dataKey="price" name="신호" fill="var(--chart-sma)" shape="diamond" isAnimationActive={false} />}
            {inRange(orderPoints).length > 0 && <Scatter yAxisId="price" data={inRange(orderPoints)} dataKey="price" name="주문 전송" fill="var(--warning)" shape="square" isAnimationActive={false} />}
            {inRange(fillPoints).length > 0 && <Scatter yAxisId="price" data={inRange(fillPoints)} dataKey="price" name="실제 체결" fill="var(--chart-fill)" shape="circle" isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer> : <EmptyState title="시세 데이터가 없습니다">{market?.message}</EmptyState>}
    </div>
    <div className="chart-legend"><span className="legend-price">━ 가격</span>{symbol === "QQQ" && <><span className="legend-sma">┄ {smaLabel}</span><span className="legend-sma">◆ 신호</span></>}{symbol !== "QQQ" && <><span className="legend-order">■ 주문 전송</span><span className="legend-fill">● 실제 체결</span></>}</div>
    <p className="footnote">{market?.message} {symbol !== "QQQ" ? "전송가 없는 시장가 주문은 마커를 만들지 않습니다." : "신호 마커에서 당시 SMA와 완충 폭으로 계산한 기준값을 확인할 수 있습니다."}</p>
    <p className="data-source">{market?.source === "mock" ? "MOCK" : "시세 미연결"} · 시세 기준 {time(market?.observedAt, zone)} {zone === "Asia/Seoul" ? "KST" : "ET"} · 일봉 거래일 America/New_York</p>
  </section>;
}
