import { PreciseDecimal as Decimal } from "@/lib/decimal";
import type { Overview } from "@/lib/contracts";
import { money, time } from "@/lib/format";
import { DataState } from "@/components/data-state";
import { ProfitLoss } from "@/components/profit-loss";

export function SummaryCards({ data, compact = false }: { data: Overview; compact?: boolean }) {
  const portfolio = data.portfolio.data?.portfolio;
  const snapshots = Object.values(data.portfolio.data?.daily_snapshots ?? {}).filter((item) => item.at).sort((a, b) => Date.parse(b.at!) - Date.parse(a.at!));
  const snapshot = snapshots[0];
  const annual = data.annual.data?.items;
  const verified = annual?.length ? annual.reduce((sum, item) => sum.plus(item.verified_broker_pnl_krw), new Decimal(0)).toString() : null;
  return <>
    <div className={`summary-grid${compact ? " summary-preview" : ""}`}>
      <article className="summary-card"><span className="card-label">USD 평가자산</span><strong>{snapshot?.currency === "USD" ? money(snapshot.equity, "USD") : "제공되지 않음"}</strong><small>원화·다른 통화 제외 / 계좌 관측 {time(snapshot?.at)} KST</small></article>
      <article className="summary-card"><span className="card-label">평가손익</span><strong className="muted-value"><ProfitLoss value={null} /></strong><small>현재 조회 API에 검증된 평가손익 없음</small></article>
      <article className="summary-card"><span className="card-label">확인된 실현손익</span><strong><ProfitLoss value={verified} currency="KRW" /></strong><small>조회된 연도 메리츠 검증분 합계. 외부 손익 제외{annual?.some((item) => item.pending_count > 0) ? " / 미확정 내역 있음" : ""}</small></article>
      {!compact && <article className="summary-card"><span className="card-label">보유 자산</span><strong className="holdings-value">TQQQ <b>{portfolio?.tqqq ?? "—"}</b><span>주</span><i />SPYM <b>{portfolio?.spym ?? "—"}</b><span>주</span></strong><small>엔진 장부 수량. 실계좌 최신 잔고와 구분</small></article>}
    </div>
    <div className="source-row"><DataState result={data.portfolio} name="자산" /><DataState result={data.annual} name="실현손익" /></div>
  </>;
}
