import Link from "next/link";
import type { Overview } from "@/lib/contracts";
import { strategyReference } from "@/lib/strategy-reference";
import { label, money, percent, time } from "@/lib/format";

export function StrategyReference({ data }: { data: Overview }) {
  const reference = strategyReference(data);
  const assessment = data.status.error ? null : data.status.data?.assessment;
  return <section className="panel strategy-reference" aria-labelledby="strategy-reference-title">
    <div className="panel-heading"><div><p className="eyebrow">QQQ SMA200 / TQQQ</p><h2 id="strategy-reference-title">200일선 매매 판단</h2></div><Link className="text-link" href="/strategy">전략 상세 ↗</Link></div>
    <p className="reference-intro">QQQ의 확정 정규장 종가와 200일 이동평균선으로 TQQQ 매수·전량 매도 조건을 확인합니다.</p>
    <dl className="reference-grid">
      <div><dt>QQQ 확정 종가</dt><dd>{money(reference.close)}</dd><small>{reference.day ? `${reference.day} 미국 거래일` : "확정 종가 미제공"}</small></div>
      <div><dt>QQQ SMA200</dt><dd>{money(reference.sma)}</dd><small>확정 정규장 종가 200개 기준</small></div>
      <div className="reference-buy"><dt>{reference.source === "signal" ? "신호 당시 TQQQ 매수 기준" : "다음 TQQQ 매수 조건"}</dt><dd>{reference.buy == null ? "제공되지 않음" : <><span className="reference-condition">QQQ 종가 &gt;</span>{" "}<strong>{money(reference.buy)}</strong></>}</dd><small>SMA200 × (1 + 매수 완충 {percent(reference.buyBuffer)})</small></div>
      <div className="reference-sell"><dt>{reference.source === "signal" ? "신호 당시 TQQQ 전량 매도 기준" : "다음 TQQQ 전량 매도 조건"}</dt><dd>{reference.sell == null ? "제공되지 않음" : <><span className="reference-condition">QQQ 종가 &lt;</span>{" "}<strong>{money(reference.sell)}</strong></>}</dd><small>SMA200 × (1 − 매도 완충 {percent(reference.sellBuffer)})</small></div>
    </dl>
    <p className="footnote">{reference.source === "missing" ? "엔진에서 확정 종가와 SMA200 판단값을 아직 제공하지 않았습니다. 현재 시세나 과거 신호로 다음 기준값을 추정하지 않습니다." : `${reference.source === "signal" ? "현재 평가의 신호 판단 당시 기준" : "엔진이 제공한 매매 기준"} · 판단 ${time(reference.at)} KST. 기준 가격은 TQQQ 주문 단가가 아닌 QQQ 종가입니다.`}</p>
    <div className="reference-context"><span>엔진 추세 신호 <strong>{assessment?.trend ? label(assessment.trend.reason) : assessment?.status === "evaluated" ? "신규 추세 신호 없음" : "미제공"}</strong></span><span>시장 상태 <strong>{assessment?.session ? label(assessment.session) : "미제공"}</strong></span></div>
    <p className="footnote">매수는 미보유 시, 전량 매도는 보유 시 적용합니다. 신호 판단과 실제 주문·체결은 별도입니다.</p>
  </section>;
}
