import { NextResponse, type NextRequest } from "next/server";

/**
 * Captures ?ref=CODE into a cookie so the attribution survives the walk from
 * the landing page through the menu to checkout (brief §3a build note).
 */
export default function proxy(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const response = NextResponse.next();

  if (ref) {
    response.cookies.set("sudu_ref", ref.toUpperCase().slice(0, 32), {
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

export const config = { matcher: ["/", "/reorder", "/o/:path*"] };
