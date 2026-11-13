"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function RefreshControl() {
  const router = useRouter();
  const [automatic, setAutomatic] = useState(false);
  const [pending, startTransition] = useTransition();
  function refresh() { startTransition(() => router.refresh()); }
  useEffect(() => {
    if (!automatic) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") startTransition(() => router.refresh()); }, 60000);
    return () => window.clearInterval(timer);
  }, [automatic, router]);
  return <div className="refresh-controls"><label className="toggle"><input type="checkbox" checked={automatic} onChange={(event) => setAutomatic(event.target.checked)} />60초 자동 갱신</label>
    <button className="button" disabled={pending} onClick={refresh}>{pending ? "조회 중…" : "↻ 새로고침"}</button></div>;
}
