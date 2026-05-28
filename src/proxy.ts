import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Temporary safety fallback: avoid auth middleware blocking all routes on Edge.
// Route handlers still enforce auth server-side.
export default function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/watchlist/:path*",
    "/deep-links/:path*",
    "/concierge/:path*",
    "/api/concierge/:path*",
    "/api/subscriptions/:path*",
    "/api/alerts/economy/:path*",
  ],
};
