import type { Overview, ResourceData } from "@/lib/contracts";
import { money, time } from "@/lib/format";

export function PortfolioPanel({ data, ledger }: { data: Overview; ledger: ResourceData<"tax-ledger"> | null }) {
  const portfolio = data.portfolio.data?.portfolio;
  const snapshot = Object.values(data.portfolio.data?.daily_snapshots ?? {}).filter((item) => item.at).sort((a, b) => Date.parse(b.at!) - Date.parse(a.at!))[0];
  const funding = data.status.data?.assessment?.funding;
  return <div className="page-sections">
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">POSITIONS</p><h2>보유 종목</h2></div></div><div className="table-scroll"><table><thead><tr><th>종목</th><th>장부 수량</th><th>매입 기준</th><th>평가금액 / 평가손익</th></tr></thead><tbody>
      <tr><td><strong>TQQQ</strong></td><td>{portfolio?.tqqq ?? "—"}주</td><td>{money(portfolio?.cycle?.entry_price)}<small>현재 사이클의 최초 매수 가중평균</small></td><td>제공되지 않음</td></tr>
      <tr><td><strong>SPYM</strong></td><td>{portfolio?.spym ?? "—"}주</td><td>평균 매입 단가 미제공</td><td>제공되지 않음</td></tr>
    </tbody></table></div><p className="footnote">엔진 장부 수량은 /v1/portfolio 기준입니다. 증권사 잔고의 종목별 평가 필드는 현재 API에 없습니다.</p></section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">CASH & ALLOCATION</p><h2>자금별 잔액</h2></div><span className="badge">{funding?.mode ?? snapshot?.funding_mode ?? "모드 미제공"}</span></div>
      <dl className="health-list">{[
        ["TQQQ 매매용 현금", money(portfolio?.trading_cash), "엔진 목적별 장부"], ["익절 수익금 잔액", money(portfolio?.profit_cash), "누적 실현손익과 다름"],
        ["절세 재매수 예약금", money(portfolio?.tax_cash), "보호 예산"], ["실제 기준 예수금", money(snapshot?.settled_cash), `계좌 스냅샷 ${time(snapshot?.at)} KST`],
        ["추정 예수금", money(snapshot?.cash), "실제 예수금과 합산하지 않음"], ["주문 가능 한도", money(funding?.orderable), `엔진 판단 ${time(data.status.data?.last_evaluation_at)} KST / 현금 자산과 합산하지 않음`],
        ["USD 결제 예정 차액", money(portfolio?.funding_debit), "funding_debit"], ["RP 자동투자 / 출금 가능액", "제공되지 않음", "검증된 별도 API 필요"],
      ].map(([name, value, note]) => <div key={name}><dt>{name}</dt><dd className="mono">{value}</dd><dd className="muted">{note}</dd></div>)}</dl>
    </section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">SPYM BUDGET</p><h2>SPYM 적립 배정 잔액</h2></div></div><div className="table-scroll"><table><thead><tr><th>체결 근거</th><th>사용 가능 미국 거래일</th><th>잔액</th></tr></thead><tbody>{portfolio?.spym_lots.map((lot) => <tr key={lot.fill_id}><td className="mono">{lot.fill_id}</td><td>{lot.available_day}</td><td>{money(lot.amount)}</td></tr>)}</tbody></table></div>{!portfolio?.spym_lots.length && <p className="muted">배정 내역 없음 / 미제공</p>}</section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">TAX LEDGER</p><h2>연도별 검증 손익과 세무 원장</h2></div></div><p className="notice">외부 증권사 손익이 반영되지 않았습니다. 전체 과세 손익이나 확정 세금으로 해석하지 않습니다.</p>
      <div className="table-scroll"><table><thead><tr><th>연도</th><th>메리츠 확인 손익</th><th>미확정 건수</th><th>외부 손익 반영</th></tr></thead><tbody>{data.annual.data?.items.map((item) => <tr key={item.year}><td>{item.year}</td><td>{money(item.verified_broker_pnl_krw, "KRW")}</td><td>{item.pending_count}</td><td>{item.external_pnl_complete ? "엔진 확인 완료" : "미반영"}</td></tr>)}</tbody></table></div>
      <div className="table-scroll"><table><thead><tr><th>귀속일</th><th>종목 / 수량</th><th>원화 실현손익</th><th>검증 상태</th></tr></thead><tbody>{ledger?.items.map((item) => <tr key={item.id}><td>{item.recognized_day ?? "미확정"}</td><td>{item.symbol} / {item.quantity}주</td><td>{money(item.realized_krw, "KRW")}</td><td>{item.verification_status}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
