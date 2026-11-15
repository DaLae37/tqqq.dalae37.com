export type StatusTone = "active" | "paused" | "error" | "neutral" | "test";

export function modeTone(mode: string | undefined): StatusTone {
  return mode === "start" ? "active" : mode === "pause" ? "paused" : mode === "stop" ? "error" : mode === "test" ? "test" : "neutral";
}

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return <span className="status-badge" data-tone={tone}><span className="status-dot" aria-hidden="true" />{children}</span>;
}
