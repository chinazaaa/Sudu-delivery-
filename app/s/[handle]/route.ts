import { NextResponse } from "next/server";
import { promoterByHandle } from "@/lib/promoters";
import { FROM_COOKIE, REMEMBER_FOR, WHO_COOKIE } from "@/lib/came-from";

export const dynamic = "force-dynamic";

/**
 * A promoter's own front door: sudu.store/s/ada.
 *
 * Promoters kept telling us people forget to pick their name out of the
 * dropdown at checkout, which is fair: it is the last question on a form
 * somebody is trying to get to the end of, and the person filling it in
 * gains nothing by answering it. So the link answers it for them.
 *
 * A path rather than a query string on purpose. ?who=ada in a WhatsApp
 * preview looks like something to be deleted before sharing, and somebody
 * will delete it. /s/ada reads like a name, and the address bar says plain
 * sudu.store by the time the menu is on screen.
 *
 * It sets a cookie and gets out of the way. Nothing here decides who gets
 * paid: checkout still asks, with her name already filled in, and the first
 * order is what binds a customer to a promoter for life.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
): Promise<NextResponse> {
  const { handle } = await params;

  // Where to drop them. Only somewhere on this site: a link that can be made
  // to bounce off our domain onto anywhere is a gift to somebody phishing.
  const asked = new URL(request.url).searchParams.get("to") ?? "/";
  const to = asked.startsWith("/") && !asked.startsWith("//") ? asked : "/";

  const promoter = await promoterByHandle(handle).catch(() => null);
  const answer = NextResponse.redirect(new URL(to, request.url));

  // An unknown handle is a typo or an old name, not an error worth a page:
  // they still wanted the shop, so they get the shop, unattributed.
  if (!promoter) return answer;

  answer.cookies.set(WHO_COOKIE, promoter.code, {
    path: "/",
    maxAge: REMEMBER_FOR,
    sameSite: "lax",
    httpOnly: false,
  });
  // The channel too, but never over one already there: somebody who found us
  // on Instagram and then clicked a promoter's link found us on Instagram.
  if (!request.headers.get("cookie")?.includes(`${FROM_COOKIE}=`)) {
    answer.cookies.set(FROM_COOKIE, "promoter", {
      path: "/",
      maxAge: REMEMBER_FOR,
      sameSite: "lax",
      httpOnly: false,
    });
  }
  return answer;
}
