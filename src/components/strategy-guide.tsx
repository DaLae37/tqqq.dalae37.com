import type { Overview } from "@/lib/contracts";
import { money, time, label } from "@/lib/format";
import { strategyReference } from "@/lib/strategy-reference";

export function StrategyGuide({ data }: { data: Overview }) {
  const status = data.status.data;
  const signal = status?.assessment?.trend;
  const reference = strategyReference(data);
  return <div className="page-sections strategy-guide">
    <section className="panel"><div className="panel-heading"><h2>QQQ SMA200으로 판단하고 TQQQ를 매매</h2><span className="badge">전략 명세 1.3</span></div>
      <dl className="strategy-symbols"><div><dt>전략 판단</dt><dd>QQQ</dd></div><div><dt>추세 매매</dt><dd>TQQQ</dd></div><div><dt>장기 적립</dt><dd>SPYM</dd></div></dl>
      <div className="strategy-copy">
        <p><strong>QQQ의 SMA200으로 판단합니다.</strong></p>
        <p>TQQQ 자체의 200일 이동평균선으로 판단하지 않습니다.</p>
      </div>
      <div className="strategy-copy">
        <p>SMA200은 최근 연속된 <strong>200개 거래일의 확정 정규장 종가 평균</strong>입니다.</p>
        <p>현재 거래일의 확정 종가를 포함하며 미국 거래일을 기준으로 합니다.</p>
      </div>
      <ul className="strategy-notes">
        <li>자료 부족, 누락, 중복, 미확정 종가 또는 서로 다른 가격 조정 기준이면 신호를 만들지 않습니다.</li>
        <li><span className="strategy-nowrap">프리마켓·애프터마켓</span> 가격은 신호 입력에서 제외합니다.</li>
      </ul>
      <dl className="strategy-rules"><div className="reference-buy"><dt>매수 · 미보유 시</dt><dd><span className="strategy-nowrap">QQQ 종가 &gt; SMA200</span>{" "}<span className="strategy-nowrap">× (1 + 매수 완충 폭)</span></dd></div><div className="reference-sell"><dt>전량 매도 · 보유 시</dt><dd><span className="strategy-nowrap">QQQ 종가 &lt; SMA200</span>{" "}<span className="strategy-nowrap">× (1 − 매도 완충 폭)</span></dd></div></dl>
      <p>기본 완충 폭은 각각 <strong>1%</strong>입니다.</p>
      <ul className="strategy-points">
        <li>미보유 상태에서 매수 조건을 만족하면 <strong>TQQQ 매수 신호</strong>를 생성합니다.</li>
        <li>보유 상태에서 매도 조건을 만족하면 <strong>잔여 TQQQ 전량 매도 신호</strong>를 생성합니다.</li>
        <li>기준선과 같거나 완충 구간이면 기존 상태를 유지합니다.</li>
      </ul>
      <div className="strategy-copy">
        <p>보유 중 중복 신규 매수는 금지하며 최초 주문의 부분 체결 잔량 복구는 구분합니다.</p>
        <p>기본 전략에는 별도의 고정 손절률이 없습니다.</p>
        <p><strong>신호 생성, 주문 전송과 실제 체결은 서로 다릅니다.</strong></p>
      </div>
    </section>
    <section className="panel"><div className="panel-heading"><h2>동적 완충 폭</h2></div>
      <p>다음 체결이 발생할 때마다 <span className="strategy-nowrap">매수·매도</span> 완충 폭을 각각 <strong>1%포인트 확대</strong>합니다.</p>
      <ul className="strategy-points">
        <li>TQQQ 최초 매수의 첫 실제 체결</li>
        <li>SMA 전량 매도로 잔량이 0이 된 체결</li>
      </ul>
      <ul className="strategy-notes"><li>같은 최초 주문의 후속 부분 체결, 분할 익절과 SPYM 거래는 확대 횟수에 포함하지 않습니다.</li></ul>
      <div className="strategy-copy">
        <p>확대분은 <strong>마지막 해당 체결부터 <span className="strategy-nowrap">30일(30 × 24시간)</span></strong> 동안 유지합니다.</p>
        <p>기간 중 해당 체결이 다시 발생하면 확대분을 누적하고 만료 시각을 다시 30일 뒤로 갱신합니다.</p>
        <p>만료 시각 이상에서는 <span className="strategy-nowrap">기본 ±1%</span>로 복귀합니다.</p>
      </div>
      <div className="table-scroll"><table><thead><tr><th>설명용 예시</th><th>매수 기준</th><th>매도 기준</th></tr></thead><tbody><tr><td>기본</td><td>SMA의 101%</td><td>SMA의 99%</td></tr><tr><td>확대 1회</td><td>102%</td><td>98%</td></tr><tr><td>확대 2회</td><td>103%</td><td>97%</td></tr></tbody></table></div>
      <div className="strategy-copy"><p className="footnote">예시는 기본 설정 설명입니다.</p><p className="footnote">실제 현재 완충 폭과 만료는 아래 엔진 API 상태를 사용합니다.</p></div>
    </section>
    <section className="panel"><div className="panel-heading"><h2>정규장 분할 익절</h2></div>
      <div className="strategy-copy">
        <p><strong>사이클 최초 TQQQ 매수의 실제 가중평균 체결 단가</strong>를 기준으로 정규장 현재가 수익률을 판단합니다.</p>
        <p>최초 매수 처리가 끝나기 전에는 익절하지 않습니다.</p>
      </div>
      <div className="table-scroll"><table><thead><tr><th>수익률 이상</th><th>실제 잔여 수량의 매도 비율</th></tr></thead><tbody>{[["+10%", "10%"], ["+25%", "10%"], ["+50%", "10%"], ["+100%", "50%"], ["+200%", "50%"], ["이후 +100%마다", "50%"]].map(([gain, fraction]) => <tr key={gain}><td>{gain}</td><td>{fraction}</td></tr>)}</tbody></table></div>
      <ul className="strategy-points">
        <li>정규장에서만 <span className="strategy-nowrap">판단·실행</span>하며 종가를 기다리지 않습니다.</li>
        <li>여러 단계를 넘으면 낮은 단계부터 실제 체결과 잔량을 확인하여 순차 처리합니다.</li>
        <li>수량은 내림하고 0주이면 주문하지 않으며 해당 사이클의 실행 불가 단계로 기록합니다.</li>
        <li>단계별 최초 목표 수량의 실제 체결이 끝나야 완료됩니다.</li>
        <li><span className="strategy-nowrap">접수·취소·부분 체결</span>만으로 완료 처리하지 않습니다.</li>
      </ul>
    </section>
    <section className="panel"><div className="panel-heading"><h2>SPYM 장기 적립</h2></div>
      <div className="strategy-copy">
        <p>실제 TQQQ 익절 체결마다 전략상 원금(체결 수량 × 사이클 기준 단가)과 순매도 대금 중 작은 금액을 SPYM 예산으로 배정합니다.</p>
        <p>나머지는 현금 수익으로 구분합니다.</p>
      </div>
      <ul className="strategy-points">
        <li>배정 원금은 다음 거래일부터 SPYM 매수에 사용하며 1주 미만 잔액은 이월합니다.</li>
        <li>익절 수익은 같은 TQQQ 사이클에 재투자하지 않습니다.</li>
        <li>SMA 전량 매도 대금은 SPYM으로 전환하지 않습니다.</li>
      </ul>
      <div className="strategy-copy">
        <p><strong>SPYM은 기본적으로 장기 보유합니다.</strong></p>
        <p>연말 <span className="strategy-nowrap">손익·비용·환율</span> 및 증권사 귀속 기준과 세금 효과가 확인된 절세 조건을 모두 충족할 때만 예외적으로 <span className="strategy-nowrap">매도·재매수</span>합니다.</p>
        <p>단기 매매나 TQQQ 자금 확보를 위한 매도는 하지 않습니다.</p>
      </div>
    </section>
    <section className="panel"><div className="panel-heading"><h2>현재 평가에서 제공된 판단 근거</h2></div>
      <dl className="health-list">{[["현재 전략 버전", status?.strategy_version ?? "미제공"], ["마지막 전략 평가", time(status?.last_evaluation_at)], ["현재 신호", signal ? label(signal.reason) : status?.assessment?.status === "evaluated" ? "신규 추세 신호 없음" : "미제공"], ["판단 근거 시각", time(reference.at)], ["QQQ 확정 종가 / 거래일", reference.day ? `${money(reference.close)} / ${reference.day} (미국)` : "미제공"], ["SMA200 판단값", money(reference.sma)], ["판단 당시 매수 기준선", money(reference.buy)], ["판단 당시 매도 기준선", money(reference.sell)]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <div className="strategy-copy">
        <p className="footnote">{reference.source === "signal" ? "신호 당시의 판단 근거입니다." : <>엔진이 같은 평가에서 제공한 <span className="strategy-nowrap">확정 종가·SMA·완충 폭·기준선</span>을 사용합니다.</>}</p>
        <p className="footnote">신호가 없어도 판단 근거를 제공할 수 있으며 미제공 값은 추정하지 않습니다.</p>
        <p className="footnote">기준선은 TQQQ 주문 단가가 아닌 QQQ 가격 기준입니다.</p>
      </div>
    </section>
  </div>;
}
