import type { Overview } from "@/lib/contracts";
import { money, threshold, time, label } from "@/lib/format";

export function StrategyGuide({ data }: { data: Overview }) {
  const status = data.status.data;
  const signal = status?.assessment?.trend;
  const qqq = signal?.signal_symbol === "QQQ" ? signal : null;
  return <div className="page-sections strategy-guide">
    <section className="panel"><div className="panel-heading"><h2>QQQ SMA200으로 판단하고 TQQQ를 매매</h2><span className="badge">전략 명세 1.3</span></div>
      <p>QQQ는 전략 판단용, TQQQ는 추세 매매용, SPYM은 장기 적립용 종목입니다. TQQQ 자체의 200일 이동평균선으로 판단하지 않습니다.</p>
      <p>SMA200은 최근 연속된 200개 거래일의 확정 정규장 종가 평균입니다. 현재 거래일의 확정 종가를 포함하며 미국 거래일을 기준으로 합니다. 자료 부족, 누락, 중복, 미확정 종가 또는 서로 다른 가격 조정 기준이면 신호를 만들지 않습니다. 프리마켓·애프터마켓 가격은 신호 입력에서 제외합니다.</p>
      <dl className="health-list"><div><dt>매수</dt><dd>QQQ 종가 &gt; SMA200 × (1 + 매수 완충 폭)</dd></div><div><dt>매도</dt><dd>QQQ 종가 &lt; SMA200 × (1 − 매도 완충 폭)</dd></div></dl>
      <p>기본 완충 폭은 각각 1%입니다. 미보유 상태에서 매수 조건을 만족하면 TQQQ 매수 신호를, 보유 상태에서 매도 조건을 만족하면 잔여 TQQQ 전량 매도 신호를 생성합니다. 기준선과 같거나 완충 구간이면 기존 상태를 유지합니다.</p>
      <p>보유 중 중복 신규 매수는 금지하며 최초 주문의 부분 체결 잔량 복구는 구분합니다. 기본 전략에는 별도의 고정 손절률이 없습니다. 신호 생성, 주문 전송과 실제 체결은 서로 다릅니다.</p>
    </section>
    <section className="panel"><div className="panel-heading"><h2>동적 완충 폭</h2></div>
      <p>TQQQ 최초 매수의 첫 실제 체결과 SMA 전량 매도로 잔량이 0이 된 체결마다 매수·매도 완충 폭을 각각 1%포인트 확대합니다. 같은 최초 주문의 후속 부분 체결, 분할 익절과 SPYM 거래는 확대 횟수에 포함하지 않습니다.</p>
      <p>확대분은 마지막 해당 체결부터 30일(30 × 24시간) 동안 유지합니다. 기간 중 해당 체결이 다시 발생하면 확대분을 누적하고 만료 시각을 다시 30일 뒤로 갱신합니다. 만료 시각 이상에서는 기본 ±1%로 복귀합니다.</p>
      <div className="table-scroll"><table><thead><tr><th>설명용 예시</th><th>매수 기준</th><th>매도 기준</th></tr></thead><tbody><tr><td>기본</td><td>SMA의 101%</td><td>SMA의 99%</td></tr><tr><td>확대 1회</td><td>102%</td><td>98%</td></tr><tr><td>확대 2회</td><td>103%</td><td>97%</td></tr></tbody></table></div>
      <p className="footnote">예시는 기본 설정 설명입니다. 실제 현재 완충 폭과 만료는 아래 엔진 API 상태를 사용합니다.</p>
    </section>
    <section className="panel"><div className="panel-heading"><h2>정규장 분할 익절</h2></div>
      <p>사이클 최초 TQQQ 매수의 실제 가중평균 체결 단가를 기준으로 정규장 현재가 수익률을 판단합니다. 최초 매수 처리가 끝나기 전에는 익절하지 않습니다.</p>
      <div className="table-scroll"><table><thead><tr><th>수익률 이상</th><th>실제 잔여 수량의 매도 비율</th></tr></thead><tbody>{[["+10%", "10%"], ["+25%", "10%"], ["+50%", "10%"], ["+100%", "50%"], ["+200%", "50%"], ["이후 +100%마다", "50%"]].map(([gain, fraction]) => <tr key={gain}><td>{gain}</td><td>{fraction}</td></tr>)}</tbody></table></div>
      <p>정규장에서만 판단·실행하며 종가를 기다리지 않습니다. 여러 단계를 넘으면 낮은 단계부터 실제 체결과 잔량을 확인하여 순차 처리합니다. 수량은 내림하고 0주이면 주문하지 않으며 해당 사이클의 실행 불가 단계로 기록합니다. 단계별 최초 목표 수량의 실제 체결이 끝나야 완료되며, 접수·취소·부분 체결만으로 완료 처리하지 않습니다.</p>
    </section>
    <section className="panel"><div className="panel-heading"><h2>SPYM 장기 적립</h2></div>
      <p>실제 TQQQ 익절 체결마다 전략상 원금(체결 수량 × 사이클 기준 단가)과 순매도 대금 중 작은 금액을 SPYM 예산으로 배정합니다. 나머지는 현금 수익으로 구분합니다.</p>
      <p>배정 원금은 다음 거래일부터 SPYM 매수에 사용하며 1주 미만 잔액은 이월합니다. 익절 수익은 같은 TQQQ 사이클에 재투자하지 않습니다. SMA 전량 매도 대금은 SPYM으로 전환하지 않습니다.</p>
      <p>SPYM은 기본적으로 장기 보유합니다. 연말 손익·비용·환율·증권사 귀속 기준과 세금 효과가 확인된 절세 조건을 모두 충족할 때만 예외적으로 매도·재매수합니다. 단기 매매나 TQQQ 자금 확보를 위한 매도는 하지 않습니다.</p>
    </section>
    <section className="panel"><div className="panel-heading"><h2>현재 평가에서 제공된 판단 근거</h2></div>
      <dl className="health-list">{[["현재 전략 버전", status?.strategy_version ?? "미제공"], ["마지막 전략 평가", time(status?.last_evaluation_at)], ["현재 신호", signal ? label(signal.reason) : status?.assessment?.status === "evaluated" ? "신규 추세 신호 없음" : "미제공"], ["QQQ 확정 종가 / 거래일", qqq ? `${money(qqq.signal_price)} / ${qqq.source_day} (미국)` : "미제공"], ["SMA200 판단값", money(qqq?.sma_value)], ["판단 당시 매수 기준선", money(threshold(qqq?.sma_value, qqq?.effective_buy_buffer, "BUY"))], ["판단 당시 매도 기준선", money(threshold(qqq?.sma_value, qqq?.effective_sell_buffer, "SELL"))]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <p className="footnote">종가·SMA·기준선은 같은 신호의 판단 근거로 제공된 경우에만 표시합니다. 현재 시세로 과거 판단값을 재구성하지 않습니다. 신호가 없는 평가에서는 API가 가격과 SMA를 제공하지 않을 수 있습니다.</p>
    </section>
  </div>;
}
