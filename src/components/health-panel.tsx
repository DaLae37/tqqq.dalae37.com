import type { Overview, Status } from "@/lib/contracts";
import { time } from "@/lib/format";
import { DataState } from "@/components/data-state";
import { StatusBadge, modeTone, type StatusTone } from "@/components/status-badge";

export function HealthPanel({ data }: { data: Overview }) {
  const status = data.status.data;
  function state(value: boolean | undefined) { return <StatusBadge tone={value == null ? "neutral" : value ? "active" : "error"}>{value == null ? "확인 불가" : value ? "정상" : "준비되지 않음"}</StatusBadge>; }
  function enabled(value: boolean | undefined) { return <StatusBadge tone={value == null ? "neutral" : value ? "active" : "paused"}>{value == null ? "확인 불가" : value ? "활성" : "비활성"}</StatusBadge>; }
  function error(value: string | null | undefined) { return <span className={value ? "health-error" : "muted"}>{value ?? (status ? "없음" : "확인 불가")}</span>; }
  function diagnostic(value: Status["last_error_details"]) {
    return value ? [value.stage, value.code, value.response_code, value.http_status, value.aws_error_code].filter((item) => item != null).join(" / ") || "진단 코드 없음" : "진단 코드 없음";
  }
  const moduleNames = { runtime: "거래 실행 환경", migration: "마이그레이션", db: "거래 DB", schema: "거래 스키마",
    broker: "메리츠 연결", execution_lease: "실행 권한", decision: "전략 판단", order_management: "기존 주문 관리",
    orders: "신규 주문", history: "거래 기록", tax: "세금 처리", read_api: "읽기 API" };
  const moduleStates = { idle: "대기", ready: "정상", blocked: "차단", error: "오류" };
  const moduleTones: Record<keyof typeof moduleStates, StatusTone> = { idle: "neutral", ready: "active", blocked: "paused", error: "error" };
  const rows: Array<[string, React.ReactNode, string]> = [
    ["프로세스 생존", state(data.live.data?.ok), "/health/live"],
    ["읽기 API 준비", state(data.ready.data?.ok), "조회 토큰·조회 DB·스키마의 최근 점검 결과"],
    ["거래 DB 연결", state(status?.health.db), diagnostic(status?.health_error_details?.db)],
    ["메리츠 API 연결", status?.api_health_checked === false && !status.api_health_checked_at ? <StatusBadge tone="neutral">첫 점검 대기</StatusBadge> : state(status?.health.api), diagnostic(status?.health_error_details?.api)],
    ["거래 DB 스키마", state(status?.health.schema), diagnostic(status?.health_error_details?.schema)],
    ["메리츠 API 마지막 점검", time(status?.api_health_checked_at), status?.api_health_checked == null ? "점검 여부 미제공" : status.api_health_checked ? "최근 루프에서 점검" : "최근 루프에서 점검 생략"],
    ["메리츠 연결 연속 실패", <span className={status?.consecutive_api_failures ? "health-error" : ""}>{status?.consecutive_api_failures == null ? "미제공" : `${status.consecutive_api_failures}회`}</span>, "점검 생략은 실패 횟수에 포함하지 않음"],
    ["실행 모드", <StatusBadge tone={modeTone(status?.mode)}>{status?.mode ?? "확인 불가"}</StatusBadge>, "pause는 정상 관찰 모드"],
    ["실거래 설정", enabled(status?.live_trading_enabled), "설정 활성화만으로 주문 가능을 의미하지 않음"],
    ["현재 주문 활성화", enabled(status?.orders_enabled), status?.reason ?? "확인 불가"],
    ["마지막 연결 확인", time(status?.last_check_at), "Asia/Seoul"],
    ["마지막 전략 평가", time(status?.last_evaluation_at), "Asia/Seoul"],
    ["마지막 오류", error(status?.last_error), diagnostic(status?.last_error_details)],
    ["마지막 시작 오류", error(status?.last_start_error), diagnostic(status?.last_start_error_details)],
    ["마지막 거래 루프 오류", <span className={status?.last_worker_error_details ? "health-error" : "muted"}>{diagnostic(status?.last_worker_error_details)}</span>, "복구 후에도 마지막 실패를 보존할 수 있음"],
  ];
  return <section className="panel health-panel"><div className="panel-heading"><div><p className="eyebrow">ENGINE HEALTH</p><h2>연결 상태와 실행 상태</h2></div><span className="badge">조회 전용</span></div>
    <p className="notice">읽기 API 준비와 메리츠 연결·주문 가능 상태는 별개입니다. start 모드에서도 개별 모듈이 차단될 수 있습니다. 웹 서버 상태는 별도 /healthz로 확인합니다.</p>
    <dl className="health-list">{rows.map(([name, value, source]) => <div key={name}><dt>{name}</dt><dd>{value}</dd><dd className="muted">{source}</dd></div>)}</dl>
    <h3 className="small-title">모듈별 현재 상태</h3>
    {Object.keys(status?.modules ?? {}).length ? <div className="table-scroll"><table><thead><tr><th>모듈</th><th>상태</th><th>대기 조건 / 진단</th><th>마지막 점검 KST</th><th>마지막 성공 KST</th></tr></thead><tbody>{Object.entries(status?.modules ?? {}).map(([name, module]) => module && <tr key={name}>
      <td>{moduleNames[name as keyof typeof moduleNames]}</td><td><StatusBadge tone={moduleTones[module.status]}>{moduleStates[module.status]}</StatusBadge></td>
      <td>{[module.reason, ...module.blocked_by.map((item) => moduleNames[item as keyof typeof moduleNames] ?? item), module.last_error_details ? diagnostic(module.last_error_details) : null].filter(Boolean).join(" / ") || "없음"}</td>
      <td>{time(module.last_check_at)}</td><td>{time(module.last_success)}</td>
    </tr>)}</tbody></table></div> : <p className="footnote">모듈별 상태가 제공되지 않았습니다.</p>}
    <p className="footnote">모듈 상태는 현재 조회 기준입니다. 마지막 성공 시각은 오류 후에도 남을 수 있으며 전체 거래 준비 완료를 의미하지 않습니다.</p>
    <DataState result={data.status} name="엔진 상태" /><DataState result={data.live} name="프로세스 생존" /><DataState result={data.ready} name="읽기 API 준비" />
  </section>;
}
