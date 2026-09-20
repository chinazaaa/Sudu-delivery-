import { notFound } from "next/navigation";
import Link from "next/link";
import { getCheckoutLink } from "@/lib/checkout-links";
import { priceLines } from "@/lib/orders";
import { getBatch, isOrderable, openBatches } from "@/lib/batches";
import { hostelNames } from "@/lib/hostels";
import { hoursByDay, safeSettings, whatsappLink } from "@/lib/settings";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { naira } from "@/lib/money";
import { db } from "@/lib/supabase";
import type { CartLine } from "@/lib/types";
import { dayWord } from "@/lib/time";
import { deliverySlots, windowPhrase } from "@/lib/same-day";
import LinkCheckout from "@/components/LinkCheckout";
import HelpLine from "@/components/HelpLine";

export const dynamic = "force-dynamic";

/**
 * A basket somebody was sent.
 *
 * The whole point is that the deciding is already done: the food is picked,
 * the run is picked, the price is on the screen. All that is left is who they
 * are and where it goes, which is the least anybody can be asked for and
 * still get dinner.
 */
/**
 * The swaps this basket allows, with what it currently says.
 *
 * A link settles every question that moves the price, and the crust is not
 * one of them: Hand Tossed and Thin Crust cost the same, so somebody who
 * would rather have the other can simply have it. Saying which was picked,
 * and what else there is, is the difference between a blank box and an offer.
 *
 * It used to leave out anything the link had already answered, which meant
 * picking Hand Tossed hid the fact that Thin Crust was free.
 */
async function freeSwaps(
  lines: CartLine[]
): Promise<{ name: string; chosen: string; others: string[] }[]> {
  const chosen = new Set(lines.flatMap((line) => line.option_ids ?? []));
  const items = [...new Set(lines.map((line) => line.menu_item_id))];
  if (items.length === 0) return [];

  const { data: groups } = await db()
    .from("item_option_groups")
    .select("id, name")
    .in("menu_item_id", items);
  if (!groups || groups.length === 0) return [];

  const { data: options } = await db()
    .from("item_options")
    .select("id, group_id, name, price_delta, available")
    .in(
      "group_id",
      (groups as { id: string }[]).map((group) => group.id)
    );

  return (groups as { id: string; name: string }[])
    .map((group) => {
      const theirs = ((options ?? []) as {
        id: string;
        group_id: string;
        name: string;
        price_delta: number;
        available: boolean;
      }[]).filter((option) => option.group_id === group.id && option.available);

      // Only where every answer costs the same. A size is not a swap, it is
      // a different price, and offering it in a note would be a promise the
      // total does not keep.
      const free = theirs.every((option) => option.price_delta === theirs[0]?.price_delta);
      const others = theirs.filter((option) => !chosen.has(option.id));
      if (!free || theirs.length < 2 || others.length === 0) return null;

      return {
        name: group.name,
        chosen: theirs.find((option) => chosen.has(option.id))?.name ?? "",
        others: others.map((option) => option.name),
      };
    })
    .filter((one): one is { name: string; chosen: string; others: string[] } => one !== null);
}

export default async function CheckoutLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const link = await getCheckoutLink((await params).code);
  if (!link) notFound();

  const settings = await safeSettings();

  // Signed in on this device, so their own details fill the form in without
  // being asked for a second time.
  const signedIn = await currentCustomer();
  const me = signedIn ? await customerDetails(signedIn) : null;

  if (!link.active) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">This link has been stopped</h1>
        <p className="text-muted">
          It was for something that has been and gone. The menu is still open.
        </p>
        <Link href="/" className="btn-primary mt-2 inline-block px-6">
          See what is on
        </Link>
        <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
      </div>
    );
  }

  // Priced here, from the menu, every time it is opened. A link that carried
  // its own figures would quietly disagree with the shop the moment anything
  // changed, and the order itself prices from the menu regardless.
  const priced = await priceLines(link.lines);
  if ("error" in priced) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">Something on this link has gone</h1>
        <p className="text-muted">{priced.error}</p>
        <Link href="/" className="btn-primary mt-2 inline-block px-6">
          Order from the menu instead
        </Link>
      </div>
    );
  }

  // The kitchens behind these dishes, by id, so each line can say where it
  // is from.
  const { data: places } = await db()
    .from("restaurants")
    .select("id, name")
    .in("id", [...new Set(priced.lines.map((line) => line.item.restaurant_id))]);
  const kitchens = new Map(
    ((places ?? []) as { id: string; name: string }[]).map((one) => [one.id, one.name])
  );

  const food = priced.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.qty,
    0
  );

  // The run this is for. A link made for one names it; a link made for
  // whatever is open finds the next one when somebody taps it, which is what
  // a link sitting in a group chat wants.
  const named = link.batch_id ? await getBatch(link.batch_id) : null;
  const open = await openBatches();
  const batch = named ?? (link.deliver_at ? null : open[0] ?? null);
  const gone = named !== null && !isOrderable(named);

  // A time is only orderable while it is still on offer, and a car needs
  // three hours' notice, so a link made for noon stops working mid morning.
  // Checked here rather than after they have filled the form in: being told
  // "that time has gone" by a page that never offered a time is being told
  // off for somebody else's mistake.
  const timePassed =
    link.deliver_at !== null &&
    !(settings.same_day_on === "on"
      ? deliverySlots(new Date(), await hoursByDay())
      : []
    ).some((slot) => slot.at === link.deliver_at);

  if (gone || timePassed || (!batch && !link.deliver_at)) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">
          {timePassed ? "That time has gone" : "That run has closed"}
        </h1>
        <p className="text-muted">
          Nothing was charged. The same food is on the menu, and{" "}
          {timePassed
            ? "you can pick a time that still works, or put it on a run."
            : "the next run is taking orders."}
        </p>
        <Link href="/" className="btn-primary mt-2 inline-block px-6">
          Put it on the next run
        </Link>
        <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-dark">
          {link.label || "Your order"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {priced.lines.reduce((sum, line) => sum + line.qty, 0)} item
          {priced.lines.reduce((sum, line) => sum + line.qty, 0) === 1 ? "" : "s"} ·{" "}
          {naira(food)}
        </h1>
        <p className="text-ink/75">
          {/* The window it lands in, said the way somebody waiting for food
              would say it, and the day in words when the day is near: "today"
              beats "Sunday, 20 Sep" on the twentieth. */}
          {link.deliver_at
            ? `Arriving ${windowPhrase(link.deliver_at)}`
            : batch
              ? `Arriving ${batch.delivery_window_text.toLowerCase()}, ${dayWord(
                  batch.run_date
                )}`
              : ""}
        </p>
        {link.note !== "" && <p className="text-sm text-muted">{link.note}</p>}
      </section>

      <LinkCheckout
        code={link.short ?? link.id}
        // Somebody signed in on this phone has already told us all of this
        // once. The browser fills the rest in for everybody else.
        me={me}
        lines={priced.lines.map((line) => ({
          name: line.item.name,
          // Whose kitchen it comes from. A dish name on its own is half the
          // answer: "BBQ Chicken" is a pizza from Domino's or something else
          // entirely, depending on who is reading it.
          restaurant: kitchens.get(line.item.restaurant_id) ?? "",
          qty: line.qty,
          choices: line.options.map((one) => one.name),
          total: line.unitPrice * line.qty,
        }))}
        // What they can swap at no cost: the crust, which drink. Anything
        // that moves the price was settled when the link was made, so this
        // is only ever the free ones, and the note is where they say it.
        swaps={await freeSwaps(link.lines)}
        food={food}
        fee={link.fee}
        hostels={await hostelNames()}
        hasCardLink={link.payment_link !== ""}
        // A way to say something the form cannot hold: swapping the beef for
        // chicken, asking whether a second one can go in. Click to send,
        // never sent on anybody's behalf, and it opens with the basket
        // already written out so nobody has to describe what they are
        // looking at.
        askUs={
          whatsappLink(
            settings.whatsapp_number,
            `Hi Sudu, about ${link.label || "the link you sent"}:\n\n` +
              priced.lines
                .map((line) => `${line.qty}x ${line.item.name}`)
                .join("\n") +
              `\n\n`
          ) ?? ""
        }
      />

      {/* A basket somebody was sent is one thing the shop sells, not the
          only one. Anybody who opened it wanting something else should not
          have to guess that there is a menu behind it. */}
      <p className="text-center text-sm text-muted">
        Wanted something else?{" "}
        <Link href="/" className="font-semibold text-brand">
          Order anything off the menu
        </Link>
        , on this run or another.
      </p>

      <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
    </div>
  );
}
