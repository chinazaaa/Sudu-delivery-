import { NextResponse } from "next/server";
import { abandonedCarts, cartLine, markAlerted } from "@/lib/carts";
import { emailAdmins } from "@/lib/email";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * The daily recap: every cart nobody finished, with the ones that turned up
 * since yesterday called out. It repeats what is still outstanding on purpose,
 * because a cart stops appearing only when it is dealt with in admin.
 *
 * Called by a scheduler, either Supabase's pg_cron or Vercel's, and safe to
 * open by hand at any time.
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
  const carts = await abandonedCarts(minutes);

  if (carts.length === 0) {
    return NextResponse.json({ found: 0, fresh: 0, emailed: false });
  }

  const fresh = carts.filter((cart) => cart.alerted_at === null);
  const older = carts.filter((cart) => cart.alerted_at !== null);
  const total = carts.reduce((sum, cart) => sum + cart.value, 0);

  const emailed = await emailAdmins(
    `${naira(total)} left in ${carts.length} cart${carts.length === 1 ? "" : "s"}`,
    [
      `${carts.length} cart${carts.length === 1 ? "" : "s"} filled in and never ` +
        `paid for, worth ${naira(total)}.`,
      ...(fresh.length > 0
        ? ["", "SINCE YESTERDAY", ...fresh.map((cart) => `  ${cartLine(cart)}`)]
        : []),
      ...(older.length > 0
        ? ["", "STILL WAITING", ...older.map((cart) => `  ${cartLine(cart)}`)]
        : []),
      "",
      "They are all in admin under Left behind, each with a WhatsApp button.",
      "Tapping \"Done with this\" takes one off this list.",
    ].join("\n")
  );

  // Marked whether or not the email went out, so a missing key does not leave
  // every cart looking new for ever.
  await markAlerted(fresh.map((cart) => cart.id));

  return NextResponse.json({ found: carts.length, fresh: fresh.length, emailed });
}
