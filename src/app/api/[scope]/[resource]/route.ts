import { NextRequest } from "next/server";
import { authenticate, privateHeaders, unauthorized } from "@/lib/server/auth";
import { overview, readResource, records } from "@/lib/server/engine";
import { resourceSchemas, type Resource } from "@/lib/contracts";
import { marketData, marketQuery } from "@/lib/server/market";
import { permitRead } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ scope: string; resource: string }> }) {
  const { scope, resource } = await context.params;
  if (scope !== "demo" && scope !== "dashboard") return Response.json({ error: "not_found" }, { status: 404, headers: privateHeaders });
  const demo = scope === "demo";
  if (!demo && !await authenticate(request.headers.get("authorization"))) return unauthorized();
  const respond = (data: unknown, status = 200) => Response.json(data, { status, headers: privateHeaders });
  if (!demo && !permitRead("bff", 60)) return respond({ error: "rate_limited" }, 429);
  if (resource === "overview") return respond(await overview(demo));
  if (resource === "trades") {
    const [orders, events] = await Promise.all([records("orders", demo), records("order-events", demo)]);
    return respond({ orders, events });
  }
  if (resource === "market") {
    if ([...request.nextUrl.searchParams.keys()].some((key) => !["symbol", "interval", "range"].includes(key))) return respond({ error: "invalid_query" }, 400);
    const parsed = marketQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return respond({ error: "invalid_query" }, 400);
    return respond(await marketData(parsed.data, demo));
  }
  if (!Object.hasOwn(resourceSchemas, resource)) return respond({ error: "not_found" }, 404);
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0 || offset > 100000 ||
    [...request.nextUrl.searchParams.keys()].some((key) => !["limit", "offset"].includes(key))) return respond({ error: "invalid_query" }, 400);
  const result = await readResource(resource as Resource, demo, limit, offset);
  return respond(result, result.error ? result.error === "unauthorized" ? 502 : 503 : 200);
}
