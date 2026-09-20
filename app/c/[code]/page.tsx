import { notFound } from "next/navigation";
import Link from "next/link";
import { getCheckoutLink } from "@/lib/checkout-links";
import { priceLines } from "@/lib/orders";
import { hostelNames } from "@/lib/hostels";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { naira } from "@/lib/money";
import { db } from "@/lib/supabase";
import type { CartLine } from "@/lib/types";
import { ESTIMATE_NOTE } from "@/lib/arrival";
import { arrivalNow } from "@/lib/arrival-server";
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

  // When it would land if they ordered now. Links are not pinned to a time
  // any more: they take whatever is going soonest, which is the same rule the
  // checkout uses and the reason such a link never needs editing. One made
  // before that still names a run or a time, and is honoured while it is
  // live.
  //
  // There is no dead end here. "That run has closed" and "that time has gone"
  // were both pages that took somebody who wanted dinner and gave them
  // nothing: there is always a next way, and if it is not today it is
  // tomorrow. The only thing that stops a link is being stopped by hand.
  const going = await arrivalNow({
    batchId: link.batch_id,
    deliverAt: link.deliver_at,
  });

  if (!going) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">Nothing is going just now</h1>
        <p className="text-muted">
          Nothing was charged. The menu is still open, and the next run will be
          on it.
        </p>
        <Link href="/" className="btn-primary mt-2 inline-block px-6">
          See what is on
        </Link>
        <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* The heading lives inside the form rather than above it, because
          what it says depends on which of the choices they are on, and a
          server cannot follow somebody's thumb. */}
      <LinkCheckout
        code={link.short ?? link.id}
        title={link.label || "Your order"}
        when={`Order now, get it ${going.said}`}
        // The same sentence as everywhere else: a time here is an estimate,
        // and being a quarter of an hour out is not a failure unless somebody
        // was told a time to the minute.
        estimate={ESTIMATE_NOTE}
        note={link.note}
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
        // What they can have instead, each costing what the basket costs, so
        // picking one swaps the food and leaves every figure where it is.
        instead={await Promise.all(
          link.alternatives.map(async (line, index) => {
            const one = await priceLines([line]);
            return "error" in one
              ? null
              : {
                  index,
                  name: one.lines[0].item.name,
                  restaurant: kitchens.get(one.lines[0].item.restaurant_id) ?? "",
                  choices: one.lines[0].options.map((option) => option.name),
                  items: one.lines[0].qty,
                  // What this one costs. The same as the basket, or less:
                  // never more, so the total can only fall when somebody
                  // picks one.
                  food: one.lines[0].unitPrice * one.lines[0].qty,
                };
          })
        ).then((all) => all.filter((one) => one !== null))}
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
