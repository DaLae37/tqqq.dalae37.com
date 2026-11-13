"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="empty-state"><h1>화면을 불러오지 못했습니다</h1><p>이전 상태를 현재 상태로 표시하지 않습니다. 연결과 인증 설정을 확인한 뒤 다시 조회하세요.</p><button className="button" onClick={reset}>다시 조회</button></section>;
}
