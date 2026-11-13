import type { Overview } from "@/lib/contracts";
import { time } from "@/lib/format";
import { DataState } from "@/components/data-state";

export function HealthPanel({ data }: { data: Overview }) {
  const status = data.status.data;
  function state(value: boolean | undefined) { return value == null ? "확인 불가" : value ? "정상" : "준비되지 않음"; }
  const rows = [
    ["프로세스 생존", state(data.live.data?.ok), "/health/live"],
    ["의존성 준비", state(data.ready.data?.ok), "/health/ready"],
    ["DB 연결", state(status?.health.db), "/v1/status · health.db"],
    ["메리츠 API 연결", state(status?.health.api), "/v1/status · health.api"],
    ["DB 스키마", state(status?.health.schema), "/v1/status · health.schema"],
    ["실행 모드", status?.mode ?? "확인 불가", "pause는 정상 관찰 모드"],
    ["실거래 설정", status ? status.live_trading_enabled ? "활성" : "비활성" : "확인 불가", "설정 활성화만으로 주문 가능을 의미하지 않음"],
    ["현재 주문 활성화", status ? status.orders_enabled ? "활성" : "비활성" : "확인 불가", status?.reason ?? "확인 불가"],
    ["마지막 연결 확인", time(status?.last_check_at), "Asia/Seoul"],
    ["마지막 전략 평가", time(status?.last_evaluation_at), "Asia/Seoul"],
    ["마지막 오류", status?.last_error ?? (status ? "없음" : "확인 불가"), status?.last_error_details ? `${status.last_error_details.stage ?? "—"} / ${status.last_error_details.code ?? "—"} / ${status.last_error_details.response_code ?? "—"}` : "진단 코드 없음"],
    ["마지막 시작 오류", status?.last_start_error ?? (status ? "없음" : "확인 불가"), status?.last_start_error_details ? `${status.last_start_error_details.stage ?? "—"} / ${status.last_start_error_details.code ?? "—"}` : "진단 코드 없음"],
  ];
  return <section className="panel"><div className="panel-heading"><div><p className="eyebrow">ENGINE HEALTH</p><h2>연결 상태와 실행 상태</h2></div><span className="badge">조회 전용</span></div>
    <p className="notice">HTTP Health Check 성공은 실제 주문 가능 상태를 보장하지 않습니다. 웹 서버 상태는 별도 /healthz로 확인합니다.</p>
    <dl className="health-list">{rows.map(([name, value, source]) => <div key={name}><dt>{name}</dt><dd>{value}</dd><dd className="muted">{source}</dd></div>)}</dl>
    <DataState result={data.status} name="엔진 상태" /><DataState result={data.live} name="프로세스 생존" /><DataState result={data.ready} name="의존성 준비" />
  </section>;
}
