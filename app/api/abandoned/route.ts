import { NextResponse } from "next/server";
import { abandonedCarts, cartLine, markAlerted } from "@/lib/carts";
import { emailAdmins } from "@/lib/email";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Checks for carts nobody finished and emails the admins once about each.
 * Vercel's scheduler calls this; it is also safe to open by hand, since a cart
 * is only ever reported once.
 *
 * Nothing is sent to the customer. The brief's rule holds: people are messaged
 * by a person, on WhatsApp, not by a robot.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const given = new URL(request.url).searchParams.get("key");
    if (auth !== `Bearer ${secret}` && given !== secret) {
      return NextResponse.json({ error: "Not allowed" }, { status: 401 });
    }
  }

  const settings = await safeSettings();
  const minutes = settings.abandon_minutes || 45;
  const carts = await abandonedCarts(minutes, true);

  if (carts.length === 0) {
    return NextResponse.json({ found: 0, emailed: false });
  }

  const total = carts.reduce((sum, cart) => sum + cart.value, 0);
  const emailed = await emailAdmins(
    `${carts.length} cart${carts.length === 1 ? "" : "s"} left behind · ${naira(total)}`,
    [
      `${carts.length} ${carts.length === 1 ? "person" : "people"} filled a cart ` +
        `and did not finish. That is ${naira(total)} sitting there.`,
      "",
      ...carts.map((cart) => cartLine(cart)),
      "",
      "Follow them up in admin, under Carts. Each one has a WhatsApp button.",
    ].join("\n")
  );

  // Marked whether or not the email went out, so a missing key does not turn
  // into the same carts being reported for ever.
  await markAlerted(carts.map((cart) => cart.id));

  return NextResponse.json({ found: carts.length, emailed });
}
