import { PreciseDecimal as Decimal } from "@/lib/decimal";
import type { Overview } from "@/lib/contracts";
import { label, money, percent, time } from "@/lib/format";

export function StrategyPanel({ data }: { data: Overview }) {
  const status = data.status.data;
  const assessment = status?.assessment;
  const cycle = data.portfolio.data?.portfolio?.cycle;
  const currentVersion = data.versions.data?.items.find((item) => item.strategy_version === status?.strategy_version && !item.deactivated_at);
  const config = currentVersion?.config_snapshot;
  const lots = data.portfolio.data?.portfolio?.spym_lots;
  const budget = lots ? lots.reduce((sum, lot) => sum.plus(lot.amount), new Decimal(0)).toString() : null;
  return <aside className="panel strategy-panel">
    <div className="panel-heading"><div><p className="eyebrow">STRATEGY</p><h2>전략 상태</h2></div><span className="badge">v{status?.strategy_version ?? "—"}</span></div>
    <div className="signal-summary"><span className="status-dot" /><div><strong>{assessment?.trend ? label(assessment.trend.reason) : assessment?.status === "evaluated" ? "신규 추세 신호 없음" : "판단 결과 확인 필요"}</strong><small>QQQ {config?.sma_period ? `SMA${config.sma_period}` : "SMA"} / 신호 판단용</small></div></div>
    <dl className="compact-list"><div><dt>현재 매수 / 매도 완충</dt><dd>{percent(assessment?.trend_buffer?.buy)} / {percent(assessment?.trend_buffer?.sell)}</dd></div>
      <div><dt>완충 확대 만료</dt><dd>{time(assessment?.trend_buffer?.expires_at)}</dd></div>
      <div><dt>TQQQ 사이클</dt><dd>{cycle ? <span title={cycle.id}>{cycle.id}</span> : "없음 / 미제공"}</dd></div>
      <div><dt>최초 매수 체결 기준가</dt><dd>{money(cycle?.entry_price)}</dd></div>
      <div><dt>현재 잔여 수량</dt><dd>{cycle ? `${cycle.remaining}주` : "제공되지 않음"}</dd></div>
      <div><dt>SPYM 배정 예산</dt><dd>{money(budget)}</dd></div></dl>
    <p className="small-title">분할 익절 진행</p>
    <div className="profit-steps">{config?.steps.map((step) => {
      const completed = cycle?.completed.some((key) => { try { return new Decimal(key).eq(step.threshold); } catch { return false; } });
      const unavailable = cycle?.unavailable.some((key) => { try { return new Decimal(key).eq(step.threshold); } catch { return false; } });
      return <div key={step.threshold} className={completed ? "step-complete" : ""}><span>+{percent(step.threshold)}</span><small>{!cycle ? "사이클 없음 / 미제공" : completed ? "완료" : unavailable ? "실행 불가" : "대기"}</small><small>잔량의 {percent(step.fraction)}</small></div>;
    }) ?? <p className="muted">현재 전략 설정 미제공</p>}</div>
    <p className="footnote">단계 완료는 목표 수량의 실제 체결 기준입니다. 예산은 사용 가능일 전 금액을 포함한 배정 잔액입니다.</p>
    {assessment?.requirements?.length ? <p className="notice">필요 조건: {assessment.requirements.join(", ")}</p> : null}
  </aside>;
}
