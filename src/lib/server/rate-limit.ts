import "server-only";

const windows = new Map<string, { count: number; resetAt: number }>();
// Single-owner deployment, per process. The TLS proxy must also enforce a shared limit.
export function permitRead(key: "bff" | "engine", maximum = 120): boolean {
  let window = windows.get(key);
  if (!window || window.resetAt <= Date.now()) {
    window = { count: 0, resetAt: Date.now() + 60000 };
    windows.set(key, window);
  }
  if (window.count >= maximum) return false;
  window.count++;
  return true;
}
