export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ status: "ok", service: "tqqq.dalae37.com" }, { headers: { "Cache-Control": "no-store" } });
}
