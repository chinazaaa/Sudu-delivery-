import { NextResponse, type NextRequest } from "next/server";

import { OLD_ITEM_LINKS, OLD_PLACE_LINKS } from "@/lib/old-links";

/**
 * The old uuid addresses, sent on before anything is drawn.
 *
 * This runs in front of the renderer, which is the whole point of it. A
 * dish's page says what its real address is and asks for the old one to be
 * forwarded, but it says so from inside its own rendering, by which time the
 * answer has been sent: the skeleton in loading.tsx has already gone out,
 * the response is a 200, and the best Next can do is a meta refresh buried
 * in the page. Search engines treat that as a weak hint and the old address
 * carries on answering in full.
 *
 * Out here nothing has been sent yet, so the forward is a real one. It also
 * costs nothing: a crawler on an old link used to make the shop draw an
 * entire page, root layout and all, which is ten questions asked of the
 * database to say "that is over there now".
 *
 * Scoped to two paths and no others. The matcher below is the whole of what
 * this file can ever see: not the checkout, not the cart, not an api route,
 * not the app's own calls. That is deliberate. Middleware that watches
 * everything is one wrong pattern away from closing the shop.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const item = pathname.startsWith("/p/") ? pathname.slice(3) : "";
  const place = pathname.startsWith("/r/") ? pathname.slice(3) : "";

  const wanted = item ? OLD_ITEM_LINKS[item] : place ? OLD_PLACE_LINKS[place] : "";
  // Not an old address, or one we have no new name for. Either way it is the
  // page's own business and this never touches it.
  if (!wanted) return NextResponse.next();

  const to = request.nextUrl.clone();
  to.pathname = `${item ? "/p/" : "/r/"}${wanted}`;
  // 308 rather than 302: this is how the address reads from now on, and a
  // permanent answer is the one a search engine acts on. The query is
  // carried by the clone, so a cart line opened from the basket still lands
  // on the choices that were made.
  return NextResponse.redirect(to, 308);
}

export const config = {
  matcher: ["/p/:id", "/r/:id"],
};
