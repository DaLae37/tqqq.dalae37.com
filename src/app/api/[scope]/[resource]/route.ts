import { NextRequest } from "next/server";
import { overview, readResource, records } from "@/lib/server/engine";
import { resourceSchemas, type Resource } from "@/lib/contracts";
import { permitRead } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
const responseHeaders = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" };
export async function GET(request: NextRequest, context: { params: Promise<{ scope: string; resource: string }> }) {
  const { scope, resource } = await context.params;
  const respond = (data: unknown, status = 200) => Response.json(data, { status, headers: responseHeaders });
  if (scope !== "dashboard") return respond({ error: "not_found" }, 404);
  if (!Object.hasOwn(resourceSchemas, resource) && !["overview", "trades"].includes(resource)) return respond({ error: "not_found" }, 404);
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0 || offset > 100000 ||
    [...request.nextUrl.searchParams.keys()].some((key) => !["limit", "offset"].includes(key)) ||
    ["overview", "trades"].includes(resource) && request.nextUrl.searchParams.size > 0) return respond({ error: "invalid_query" }, 400);
  if (!permitRead("bff", 60)) return respond({ error: "rate_limited" }, 429);
  if (resource === "overview") return respond(await overview());
  if (resource === "trades") {
    const [orders, events] = await Promise.all([records("orders"), records("order-events")]);
    return respond({ orders, events });
  }
  const result = await readResource(resource as Resource, limit, offset);
  return respond(result, result.error ? result.error === "unauthorized" ? 502 : 503 : 200);
}
