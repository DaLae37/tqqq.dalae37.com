import { NextRequest, NextResponse } from "next/server";
import { authenticate, privateHeaders, unauthorized } from "@/lib/server/auth";

export async function proxy(request: NextRequest) {
  if (!await authenticate(request.headers.get("authorization"))) return unauthorized();
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(privateHeaders)) response.headers.set(key, value);
  return response;
}

export const config = { matcher: ["/", "/strategy/:path*", "/market/:path*", "/trades/:path*", "/portfolio/:path*", "/engine/:path*", "/dashboard/:path*", "/api/dashboard/:path*"] };
