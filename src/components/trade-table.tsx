"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Trade } from "@/lib/contracts";
import { filterTrades, type TradeFilter } from "@/lib/trades";
import { label, money, time, type TimeZone } from "@/lib/format";
import { EmptyState } from "@/components/data-state";

export function TradeTable({ items, base, compact = false, truncated = false }: { items: Trade[]; base: string; compact?: boolean; truncated?: boolean }) {
  const [filter, setFilter] = useState<TradeFilter>({ symbol: "", side: "", status: "", from: "", to: "", direction: "desc", zone: "Asia/Seoul" });
  const [page, setPage] = useState(0);
  function update(key: keyof TradeFilter, value: string) { setFilter((current) => ({ ...current, [key]: value })); setPage(0); }
  const filtered = useMemo(() => filterTrades(items, filter), [items, filter]);
  const pageSize = compact ? 5 : 10;
  const maxPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const actualPage = Math.min(page, maxPage);
  const visible = filtered.slice(actualPage * pageSize, (actualPage + 1) * pageSize);
  return <section className="panel trade-panel" aria-labelledby="trade-title">
    <div className="panel-heading"><div><p className="eyebrow">ORDER HISTORY</p><h2 id="trade-title">{compact ? "최근 거래 이력" : "주문 및 체결 이력"}</h2></div><span className="badge">{filtered.length}건</span>{compact && <Link className="text-link" href={`${base}/trades`}>전체 이력 ↗</Link>}</div>
    {truncated && <p className="notice">최신 2,000개 주문 범위입니다. 필터와 건수는 이 범위에만 적용됩니다.</p>}
    {!compact && <div className="table-filters">
      <label>종목<select value={filter.symbol} onChange={(event) => update("symbol", event.target.value)}><option value="">전체 종목</option><option>TQQQ</option><option>SPYM</option></select></label>
      <label>매매<select value={filter.side} onChange={(event) => update("side", event.target.value)}><option value="">전체</option><option value="BUY">매수</option><option value="SELL">매도</option></select></label>
      <label>상태<select value={filter.status} onChange={(event) => update("status", event.target.value)}><option value="">전체 상태</option>{Array.from(new Set(items.map((item) => item.status))).sort().map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
      <label>시작일<input type="date" value={filter.from} onChange={(event) => update("from", event.target.value)} /></label><label>종료일<input type="date" value={filter.to} min={filter.from} onChange={(event) => update("to", event.target.value)} /></label>
      <label>시간 기준<select value={filter.zone} onChange={(event) => update("zone", event.target.value)}><option value="Asia/Seoul">한국 (KST)</option><option value="America/New_York">미국 동부 (DST 적용)</option></select></label>
      <label>정렬<select value={filter.direction} onChange={(event) => update("direction", event.target.value)}><option value="desc">최신순</option><option value="asc">과거순</option></select></label>
    </div>}
    <div className="table-scroll" tabIndex={0} role="region" aria-label="거래 이력 표">
      {compact ? (
      <table><thead><tr><th>거래 시각 KST<small>주문 생성 기준</small></th><th>종목</th><th>매매</th><th>체결 상태</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td>{time(item.created_at)}</td><td><Link className="text-link" href={`${base}/trades/${encodeURIComponent(item.id)}`}>{item.symbol}</Link></td><td>{item.side === "BUY" ? "매수" : "매도"}</td><td><span className={`badge state-${item.status.toLowerCase()}`}>{label(item.status)}</span></td></tr>)}</tbody></table>
      ) : (
      <table><thead><tr><th>주문 생성 시각 <small>{filter.zone === "Asia/Seoul" ? "KST" : "ET"}</small></th><th>종목 / 사유</th><th>매매</th><th>유형 / 세션</th><th className="numeric">주문 / 체결 수량</th><th className="numeric">평균 체결가</th><th>주문 상태</th><th>전략</th><th><span className="visually-hidden">상세</span></th></tr></thead>
        <tbody>{visible.map((item) => <tr key={item.id}><td className="mono">{time(item.created_at, filter.zone as TimeZone)}</td><td><strong>{item.symbol}</strong><small>{label(item.reason)}</small></td><td><span className={`side side-${item.side?.toLowerCase()}`}>{item.side === "BUY" ? "매수" : item.side === "SELL" ? "매도" : "—"}</span></td><td>{item.order_type ?? "—"}<small>{label(item.session)}</small></td><td className="numeric mono">{item.quantity ?? "—"} / {item.filled_quantity}주</td><td className="numeric mono">{money(item.actual_price)}</td><td><span className={`badge state-${item.status.toLowerCase()}`}>{label(item.status)}</span></td><td className="mono">{item.strategy_version ?? "—"}</td><td><Link className="text-link" href={`${base}/trades/${encodeURIComponent(item.id)}`}>상세 ↗</Link></td></tr>)}</tbody>
      </table>
      )}
    </div>
    {!visible.length && <EmptyState title="조건에 맞는 거래가 없습니다">기간과 필터를 확인하세요.</EmptyState>}
    {!compact && <div className="pagination"><span>{filtered.length}건 / {actualPage + 1}페이지</span><div><button className="button" disabled={actualPage === 0} onClick={() => setPage(actualPage - 1)}>이전</button><button className="button" disabled={actualPage >= maxPage} onClick={() => setPage(actualPage + 1)}>다음</button></div></div>}
  </section>;
}
