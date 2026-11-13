import type { DataResult } from "@/lib/contracts";
import { time } from "@/lib/format";

export function DataState({ result, name }: { result: DataResult<unknown>; name: string }) {
  const errors = { unavailable: "조회 실패", unauthorized: "엔진 인증 실패", invalid_response: "응답 계약 불일치", not_configured: "연결 미설정" };
  return <p className={`data-source${result.error ? " data-error" : ""}`}>
    {name} · {result.source === "mock" ? "MOCK" : result.source === "engine" ? "엔진 API" : "미연결"}
    {result.error ? ` · ${errors[result.error]}` : ""} · 조회 {time(result.fetchedAt)} KST
  </p>;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="empty-state" role="status"><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}
