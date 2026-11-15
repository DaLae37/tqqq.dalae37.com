import { StrategyGuide } from "@/components/strategy-guide";
import { StatusBadge, modeTone } from "@/components/status-badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { overview, records, readResource } from "@/lib/server/engine";
import { SummaryCards } from "@/components/summary-cards";
import { StrategyReference } from "@/components/strategy-reference";
import { StrategyPanel } from "@/components/strategy-panel";
import { PriceChart } from "@/components/price-chart";
import { TradeTable } from "@/components/trade-table";
import { PortfolioPanel } from "@/components/portfolio-panel";
import { HealthPanel } from "@/components/health-panel";
import { RefreshControl } from "@/components/refresh-control";
import { DataState, EmptyState } from "@/components/data-state";
import { label, money, time } from "@/lib/format";
import { uniqueFills } from "@/lib/trades";

export async function DashboardView({ segments }: { segments: string[] }) {
  const section = ({ orders: "trades", health: "engine" } as Record<string, string>)[segments[0]] ?? segments[0] ?? "";
  if (segments.length > 2 || !["", "strategy", "market", "trades", "portfolio", "engine"].includes(section) || segments.length > 1 && section !== "trades") notFound();
  const base = "";
  const resources = section === "engine" ? ["status", "live", "ready"] as const
    : section === "market" || section === "trades" ? ["status"] as const
    : section === "portfolio" ? ["status", "portfolio", "annual"] as const
    : section === "strategy" ? ["status", "portfolio", "versions"] as const
    : ["status", "portfolio", "versions", "annual"] as const;
  const data = await overview(resources);
  const status = data.status.data;
  const title = { "": "TQQQ 200d MA Strategy Dashboard", strategy: "Strategy", market: "Market", trades: segments[1] ? "거래 상세" : "거래 이력", portfolio: "보유 현황", engine: "엔진 상태" }[section];
  const description = {
    "": "메리츠증권 Open API와 Super365 계좌로 운용하는 TQQQ자동매매 대시보드입니다.",
    strategy: "TQQQ 200d MA 기반 매매 전략 소개입니다.",
    market: "TradingView 공식 위젯으로 TQQQ·QQQ·SPYM의 시세와 거래량을 확인합니다.",
    trades: segments[1] ? "선택한 주문의 접수·상태 변경과 실제 체결 내역을 확인합니다." : "TQQQ·SPYM의 주문 및 체결 이력을 조회하고 종목·기간·상태별로 확인합니다.",
    portfolio: "TQQQ·SPYM의 보유 현황, 계좌 평가금액과 확인된 실현손익 및 SPYM 적립 예산을 확인합니다.",
    engine: "엔진의 실행 모드, 읽기 API 준비 상태와 거래 모듈별 연결·오류 상태를 확인합니다.",
  }[section];
  const stale = Boolean(status?.last_check_at && Date.now() - Date.parse(status.last_check_at) > 120000);
  let content: React.ReactNode;
  if (section === "engine") content = <HealthPanel data={data} />;
  else if (section === "portfolio") {
    const ledger = await readResource("tax-ledger", 200);
    content = <><SummaryCards data={data} /><PortfolioPanel data={data} ledger={ledger.data} /><DataState result={ledger} name="최근 세무 원장 최대 200건" /></>;
  } else if (section === "strategy") {
    content = <div className="page-sections"><StrategyGuide data={data} /><StrategyPanel data={data} /><div className="strategy-copy"><p className="footnote">시세 차트는 TradingView 공식 위젯에서 제공합니다.</p><p className="footnote">위젯의 현재 시세와 엔진이 평가한 확정 종가·SMA·기준선은 시점과 출처가 다를 수 있습니다.</p></div></div>;
  } else if (section === "market") content = <PriceChart />;
  else {
    const ordersResult = await records("orders");
    const orders = ordersResult.data?.items ?? [];
    if (segments[1]) {
      const [eventsResult, signalsResult] = await Promise.all([records("order-events"), records("signals")]);
      const events = eventsResult.data?.items ?? [];
      const signals = signalsResult.data?.items ?? [];
      const order = orders.find((item) => item.id === segments[1]);
      if (!order) content = <EmptyState title={ordersResult.error ? "주문 조회에 실패했습니다" : "조회 범위에서 주문을 찾을 수 없습니다"}>이력은 최신 2,000개 주문 범위에서 확인합니다. <Link className="text-link" href={`${base}/trades`}>이력으로 돌아가기</Link></EmptyState>;
      else {
        const related = events.filter((event) => event.trade_id === order.id);
        const fills = uniqueFills(related);
        const parent = orders.find((item) => item.id === order.parent_id) ?? signals.find((item) => item.id === order.parent_id);
        content = <div className="page-sections"><Link className="text-link" href={`${base}/trades`}>← 거래 이력</Link>
          <section className="panel"><div className="panel-heading"><div><p className="eyebrow">ORDER DETAIL</p><h2>{order.symbol} / {order.side === "BUY" ? "매수" : "매도"}</h2></div><span className={`badge state-${order.status.toLowerCase()}`}>{label(order.status)}</span></div>
            <dl className="health-list">{[
              ["주문 ID", order.id], ["사유 / 세션", `${label(order.reason)} / ${label(order.session)}`],
              ["유형 / 지정가", `${order.order_type ?? "미제공"} / ${money(order.limit_price)}`],
              ["주문 / 체결 수량", `${order.quantity ?? "미제공"} / ${order.filled_quantity}주`], ["평균 체결 단가", money(order.actual_price)],
              ["생성 / 최종 변경", `${time(order.created_at)} / ${time(order.updated_at)} KST`], ["전략 버전", order.strategy_version ?? "미제공"],
              ["상위 주문 또는 신호", `${order.parent_id ?? "없음"}${parent ? ` / ${label(parent.reason)} / ${label(parent.status)}` : ""}`],
              ["신호 거래일 / 신호 가격", `${order.source_day ?? "미제공"} (미국) / ${money(order.signal_price)} (${order.signal_symbol ?? "종목 미제공"})`],
            ].map(([name, value]) => <div key={name}><dt>{name}</dt><dd className="mono">{value}</dd></div>)}</dl>
            {order.status === "UNKNOWN" && <p className="notice">미확정 주문입니다. 체결 완료 또는 주문 실패로 간주하지 않습니다.</p>}
            {order.status === "CANCEL_PENDING" && <p className="notice">취소 요청 상태입니다. 취소 완료 전에는 기존 주문이 살아 있을 수 있습니다.</p>}
          </section>
          <section className="panel"><div className="panel-heading"><div><p className="eyebrow">EXECUTIONS</p><h2>확인된 개별 체결</h2></div></div><div className="table-scroll"><table><thead><tr><th>체결 시각 KST</th><th>체결 수량</th><th>체결 단가</th><th>비용</th><th>체결 ID</th></tr></thead><tbody>{fills.map((event) => <tr key={event.event_id}><td>{time(event.occurred_at)}</td><td>{event.fill_quantity}주</td><td>{money(event.fill_price)}</td><td>{event.fee_currency ? money(event.fee_amount, event.fee_currency) : "미제공"}</td><td className="mono">{event.broker_execution_id}</td></tr>)}</tbody></table></div>{!fills.length && <EmptyState title="확인된 체결 없음" />}</section>
          <section className="panel"><div className="panel-heading"><div><p className="eyebrow">EVENT TIMELINE</p><h2>주문 이벤트</h2></div></div>{eventsResult.truncated && <p className="notice">최신 2,000개 이벤트 범위입니다. 이 주문의 이전 이벤트가 포함되지 않을 수 있습니다.</p>}
            <ol className="event-timeline">{related.sort((a, b) => a.sequence - b.sequence).map((event) => <li key={event.event_id}><span className="event-sequence">{event.sequence}</span><div><strong>{event.event_type}</strong><p>{label(event.previous_status)} → {label(event.new_status)}</p><small>{time(event.occurred_at)} KST</small></div></li>)}</ol><DataState result={eventsResult} name="주문 이벤트" />
          </section>
        </div>;
      }
    } else if (section === "trades") content = <><TradeTable items={orders} base={base} truncated={ordersResult.truncated} /><DataState result={ordersResult} name="주문" /><p className="footnote">주문 생성 시각은 체결 시각과 다릅니다. 상세 화면에서 개별 체결 시각과 이벤트를 확인하세요.</p></>;
    else content = <><SummaryCards data={data} compact /><Link className="text-link" href={`${base}/portfolio`}>자산 및 손익 상세 ↗</Link>
      <div className="page-sections"><StrategyReference data={data} /><PriceChart preview />
      <div className="preview-links"><Link className="text-link" href={`${base}/market`}>시세 차트 상세 ↗</Link><Link className="text-link" href={`${base}/strategy`}>현재 추세: {status?.assessment?.trend ? label(status.assessment.trend.reason) : status?.assessment?.status === "evaluated" ? "신규 신호 없음" : "미제공"} / 전략 상세 ↗</Link></div>
      <TradeTable items={orders} base={base} compact /><DataState result={ordersResult} name="최근 주문" /></div></>;

  }
  return <div className="dashboard-page">
    <header className="page-heading"><div><p className="eyebrow">{section ? section.toUpperCase() : "DASHBOARD"}</p><h1>{title}</h1><p>{description}</p></div><RefreshControl /></header>
    <div className="engine-strip"><StatusBadge tone={data.status.error || stale ? "neutral" : modeTone(status?.mode)}>{data.status.error ? "상태 확인 불가" : `${status?.mode.toUpperCase() ?? "—"}${stale ? " / 관측 오래됨" : ""}`}</StatusBadge>
      <span className="strip-orders">{status && !data.status.error ? <>주문 <StatusBadge tone={stale ? "neutral" : status.orders_enabled ? "active" : "paused"}>{stale ? "확인 필요" : status.orders_enabled ? "활성" : "비활성"}</StatusBadge>{status.mode === "pause" && <span className="strip-label">관찰 중</span>}</> : "엔진 연결을 확인하세요"}</span>
      <span className="strip-divider" /><span className="strip-version"><span className="strip-label">전략</span> <b>v{status?.strategy_version ?? "—"}</b></span>
      <span className="strip-time"><span className="strip-label">마지막 데이터 갱신</span> <time>{time(data.status.error ? null : data.status.fetchedAt)} KST</time></span><Link className="text-link" href={`${base}/engine`}>엔진 상세 ↗</Link></div>
    <DataState result={data.status} name="엔진" />{data.status.error && <p className="notice">현재 상태를 확인할 수 없습니다. 이전 정상 상태를 표시하지 않습니다.</p>}{content}
  </div>;
}
