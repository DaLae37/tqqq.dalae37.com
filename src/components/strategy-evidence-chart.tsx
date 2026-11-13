"use client";

import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Trade } from "@/lib/contracts";
import { threshold } from "@/lib/format";
import { EmptyState } from "@/components/data-state";

export function StrategyEvidenceChart({ signals }: { signals: Trade[] }) {
  const points = signals.filter((signal) => signal.signal_symbol === "QQQ" && signal.source_day && signal.signal_price && signal.signal_sma_value && signal.effective_buy_buffer != null && signal.effective_sell_buffer != null)
    .sort((a, b) => a.source_day!.localeCompare(b.source_day!)).map((signal) => ({
      day: signal.source_day, close: Number(signal.signal_price), sma: Number(signal.signal_sma_value),
      buy: Number(threshold(signal.signal_sma_value, signal.effective_buy_buffer, "BUY")),
      sell: Number(threshold(signal.signal_sma_value, signal.effective_sell_buffer, "SELL")),
    }));
  return <section className="panel"><div className="panel-heading"><h2>신호 판단 당시 QQQ / SMA200 / 기준선</h2></div>
    <div className="chart-canvas" aria-label="동일 신호의 QQQ 종가, SMA와 매수 매도 기준선">{points.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0}><ComposedChart data={points} accessibilityLayer>
      <CartesianGrid stroke="var(--line)" /><XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis domain={["auto", "auto"]} width={60} tick={{ fill: "var(--muted)", fontSize: 11 }} /><Tooltip contentStyle={{ background: "var(--surface)", color: "var(--text)", borderColor: "var(--line)" }} />
      <Line dataKey="close" name="QQQ 확정 종가" stroke="var(--accent)" isAnimationActive={false} />
      <Line dataKey="sma" name="SMA200" stroke="var(--chart-sma)" isAnimationActive={false} />
      <Line dataKey="buy" name="매수 기준선" stroke="var(--chart-fill)" strokeDasharray="5 4" isAnimationActive={false} />
      <Line dataKey="sell" name="매도 기준선" stroke="var(--warning)" strokeDasharray="5 4" isAnimationActive={false} />
    </ComposedChart></ResponsiveContainer> : <EmptyState title="동일 시점의 전략 판단 자료가 없습니다" />}</div>
    <div className="chart-legend"><span className="legend-price">━ QQQ 확정 종가</span><span className="legend-sma">━ SMA200</span><span className="legend-fill">┄ 매수 기준선</span><span className="legend-order">┄ 매도 기준선</span></div>
    <p className="footnote">연속 시세가 아닌 신호 발생 거래일의 기록입니다. 각 지점은 하나의 QQQ 신호에 보존된 종가·SMA·완충 폭만 사용합니다. 현재 시세 참고값이나 현재 완충 폭을 과거 시점에 적용하지 않습니다.</p>
  </section>;
}
