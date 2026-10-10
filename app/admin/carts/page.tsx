import PageHeader from "@/components/admin/PageHeader";
import AdminLive from "@/components/admin/AdminLive";
import Link from "next/link";
import { abandonedCarts, closedCarts, type SavedCart } from "@/lib/carts";
import { getSettings } from "@/lib/settings";
import { isOrderable } from "@/lib/batches";
import { db } from "@/lib/supabase";
import type { Batch } from "@/lib/types";
import { whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";
import { agoLabel, countdown } from "@/lib/time";
import { closeCart, deleteCart, deleteClosedCarts, reopenCart } from "../actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ActionButton from "@/components/admin/ActionButton";

export const dynamic = "force-dynamic";

/** How far back the chart at the foot of the page counts. */
const CHART_DAYS = 28;

/**
 * What happened, and what saying so actually does.
 *
 * The board writes a consequence under three of these, and two of those
 * consequences are not built: nothing stops nudging a person for a fortnight
 * and nothing marks a number bad, because both would have to happen inside
 * the query that finds abandoned carts and that lives outside this page. So
 * the hint says what closing really does, rather than promising a rule that
 * does not exist. The price one is worded to the thing that is true: the
 * reason is kept, and the chart at the foot of the page counts it.
 */
const REASONS = [
  {
    label: "Did not reply",
    hint: "The usual one. Counts as a miss, nothing is sent.",
  },
  {
    label: "Not interested",
    hint: "They said no. The cart comes off the list and nothing more is sent.",
  },
  {
    label: "Ordered another way",
    hint: "Cash, WhatsApp, or they came with a friend's order.",
  },
  {
    label: "Changed their mind on price",
    hint: "Kept as a price miss and counted in the chart below.",
  },
  {
    label: "Wrong number",
    hint: "The number does not work, so nothing more is sent to this cart.",
  },
];

/** The cuts along the top, in the board's order. */
type Cut = "open" | "run-closed" | "done";

/**
 * Carts somebody filled and never paid for.
 *
 * The board draws the money as one inverted card rather than three white
 * ones, because there is only one question on this page: how much is walking
 * away and can any of it still be caught. Then the carts themselves, each
 * with the one thing to do about it, and the reasons they get left behind
 * counted at the foot so the page is worth opening even on a day when
 * nothing is sitting there.
 */
export default async function CartsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; close?: string }>;
}) {
  const params = await searchParams;
  const cut: Cut =
    params.show === "done"
      ? "done"
      : params.show === "run-closed"
        ? "run-closed"
        : "open";
  const settings = await getSettings();
  const minutes = settings.abandon_minutes || 45;

  const [unhandled, done] = await Promise.all([
    abandonedCarts(minutes),
    closedCarts(),
  ]);

  /*
   * Whether the run a cart was filled on is still taking orders.
   *
   * The middle cut is a cart whose run has gone but which nobody has said
   * anything about yet, and that is a comparison against the run's own
   * cut-off rather than anything on the cart. `isOrderable` is the same test
   * the shop uses, so a cart reads as catchable here exactly when its owner
   * could still pay for it.
   */
  const runIds = [
    ...new Set(
      unhandled
        .map((cart) => cart.batch_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const { data: runRows } = runIds.length
    ? await db().from("batches").select("*").in("id", runIds)
    : { data: [] };
  const runs = new Map(
    ((runRows ?? []) as Batch[]).map((run) => [run.id, run])
  );
  // A cart saved before any run was current has no run to have closed, so it
  // is catchable: whoever filled it can still be put on the next one.
  const runOf = (cart: SavedCart) =>
    cart.batch_id ? (runs.get(cart.batch_id) ?? null) : null;
  const stillGoing = (cart: SavedCart) => {
    const run = runOf(cart);
    return run ? isOrderable(run) : true;
  };

  const open = unhandled.filter(stillGoing);
  const shut = unhandled.filter((cart) => !stillGoing(cart));
  const carts = cut === "done" ? done : cut === "run-closed" ? shut : open;
  const value = unhandled.reduce((total, cart) => total + cart.value, 0);

  // When the first of the open runs stops taking orders, which is the whole
  // reason a nudge is worth sending now rather than later.
  const closingAt = open
    .map((cart) => runOf(cart))
    .filter((run): run is Batch => run !== null)
    .map((run) => new Date(run.cut_off_at).getTime())
    .sort((a, b) => a - b)[0];

  /** The message for one cart, which depends on whether its run has gone. */
  const messageFor = (cart: SavedCart) =>
    whatsappTo(
      cart.phone,
      stillGoing(cart)
        ? `Hi ${cart.name || "there"}, you had ${cart.summary} in your Sudu cart ` +
            `(${naira(cart.value)}). Still want it? The run is going.`
        : `Hi ${cart.name || "there"}, you had ${cart.summary} in your Sudu cart ` +
            `(${naira(cart.value)}). That run has gone, but I can put you on the ` +
            `next one. Want me to?`
    );

  /*
   * Why carts get left, counted over the reason that was actually stored.
   *
   * Only the closed ones carry a reason, so this is a tally of the column
   * the card above writes. Nothing is drawn until there is something to
   * read: four weeks of one reason is not a chart, it is a sentence.
   */
  const since = new Date(Date.now() - CHART_DAYS * 86400000).toISOString();
  const { data: reasonRows } = await db()
    .from("carts")
    .select("handled_reason")
    .not("handled_at", "is", null)
    .gte("handled_at", since);
  const tally = new Map<string, number>();
  for (const row of (reasonRows ?? []) as { handled_reason: string }[]) {
    const reason = (row.handled_reason || "").trim();
    if (reason === "") continue;
    tally.set(reason, (tally.get(reason) ?? 0) + 1);
  }
  const why = [...tally.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
  const whyTotal = why.reduce((sum, one) => sum + one.count, 0);
  const top = why[0] ?? null;

  // The cart the close card is open for, and only one that is on the cut
  // being looked at, so a link somebody kept cannot open a card about a cart
  // that is no longer there.
  const closing = params.close
    ? (carts.find((cart) => cart.id === params.close) ?? null)
    : null;
  const here = cut === "open" ? "/admin/carts" : `/admin/carts?show=${cut}`;

  return (
    <div>
      <AdminLive />
      <PageHeader
        title="Left behind"
        detail={`Carts filled in, never paid for, untouched for ${minutes} minutes or more.`}
        backHref="/admin/more"
        backLabel="More"
      />

      {/* One inverted card, not three white ones. The money is the page: the
          count and what is still catchable are the line under it, because
          neither is worth a card of its own. */}
      <div className="card mb-3.5 border-ink bg-ink text-shell">
        <p className="ticket text-rail-faint">Sitting there right now</p>
        <p className="font-display text-[42px] font-black leading-none">
          {naira(value)}
        </p>
        <p className="mt-0.5 text-[13px] opacity-80">
          {unhandled.length} cart{unhandled.length === 1 ? "" : "s"} ·{" "}
          {open.length === 0
            ? "every run they were on has closed"
            : `${open.length} can still make today's run`}
        </p>
      </div>

      {/* Three cuts sharing the row evenly, which is how the board draws any
          row of filters on a phone: equal width means no thumb has to find
          the small one. */}
      <div className="mb-3 flex gap-2">
        <Link
          href="/admin/carts"
          className={`pill-admin flex-1 justify-center px-2 ${
            cut === "open" ? "pill-admin-on" : ""
          }`}
        >
          Open <span className="font-mono opacity-60">{open.length}</span>
        </Link>
        <Link
          href="/admin/carts?show=run-closed"
          className={`pill-admin flex-1 justify-center px-2 ${
            cut === "run-closed" ? "pill-admin-on" : ""
          }`}
        >
          Closed <span className="font-mono opacity-60">{shut.length}</span>
        </Link>
        <Link
          href="/admin/carts?show=done"
          className={`pill-admin flex-1 justify-center px-2 ${
            cut === "done" ? "pill-admin-on" : ""
          }`}
        >
          Done <span className="font-mono opacity-60">{done.length}</span>
        </Link>
      </div>

      {cut === "done" && done.length > 0 && (
        <form action={deleteClosedCarts} className="mb-3">
          <ConfirmButton
            tone="bad"
            className="min-h-[44px]"
            confirm={`Yes, delete all ${done.length}`}
          >
            Delete every closed one
          </ConfirmButton>
        </form>
      )}

      {/*
        Nudging the open ones.

        There is no bulk send and there must not be one: WhatsApp opens one
        chat at a time, so what this does is hand over the messages, one per
        person, each already written. Folded away behind the button because
        a list of links standing over the page is the page gone, and open
        with no JavaScript of its own, which is why it is a `details` rather
        than a second copy of the orders page's chase bar.
      */}
      {cut === "open" && open.length > 1 && (
        <details className="soft mb-3 border-volt-line bg-brand-tint p-3.5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none">
            <span className="block text-sm font-bold">
              Nudge the {open.length} open ones
            </span>
            <span className="hint mt-1 block">
              One WhatsApp each, same message, their own cart link.
              {closingAt !== undefined &&
                ` Ordering closes in ${countdown(closingAt - Date.now())}.`}
            </span>
            <span className="btn-admin btn-admin-sm mt-2.5 inline-flex">
              Nudge all {open.length}
            </span>
          </summary>
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t-[1.5px] border-volt-line pt-2.5">
            {open.map((cart) => (
              <a
                key={cart.id}
                href={messageFor(cart)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-admin btn-admin-sm visited:border-mint visited:text-mint"
              >
                {cart.name || "No name"} ↗
              </a>
            ))}
          </div>
          <p className="hint mt-2.5">
            Opened ones go green. Nothing is written down as nudged: the
            message is the nudge.
          </p>
        </details>
      )}

      {carts.length === 0 ? (
        <p className="card p-3.5 text-sm text-muted sm:p-4">
          {cut === "done"
            ? "Nothing closed yet."
            : cut === "run-closed"
              ? "Nothing waiting on a run that has gone."
              : "Nothing left behind. Every cart with a number on it became an order."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {carts.map((cart) => {
            const going = cut === "done" ? false : stillGoing(cart);
            return (
              <li
                key={cart.id}
                className={`card p-3.5 sm:p-4 ${
                  cut === "open" ? "" : "opacity-[0.72]"
                }`}
              >
                {/* The name and the money on one line, which is the board's
                    whole card in one glance: who, and how much of it is
                    walking away. */}
                <div className="flex items-baseline justify-between gap-2.5">
                  <h3 className="min-w-0 flex-1 truncate text-[16px] font-bold">
                    {cart.name || "No name given"}
                  </h3>
                  <span className="shrink-0 font-display text-[27px] font-black leading-none">
                    {naira(cart.value)}
                  </span>
                </div>

                {/* One line: how long ago, where they are, and what is in it.
                    The number is on the Call button and the exact minute was
                    a second answer to a question nobody asked. */}
                <p className="hint mt-1 line-clamp-2">
                  {agoLabel(cart.updated_at)}
                  {cart.hostel && ` · ${cart.hostel}`} · {cart.items} item
                  {cart.items === 1 ? "" : "s"} · {cart.summary}
                </p>

                <div className="mt-2.5 flex items-center gap-2">
                  {cut === "done" ? (
                    <span className="tag bg-wash text-ink">
                      {cart.handled_reason || "closed"}
                    </span>
                  ) : going ? (
                    <span className="tag bg-brand-tint text-amber-deep">
                      still open
                    </span>
                  ) : (
                    <span className="tag bg-wash text-ink">run closed</span>
                  )}
                  {cart.alerted_at && (
                    <span className="hint ml-auto">In the recap</span>
                  )}
                </div>

                {cut === "done" ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <form action={reopenCart}>
                      <input type="hidden" name="cart_id" value={cart.id} />
                      <ActionButton className="btn-admin" done="Back on the list ✓">
                        Put it back on the list
                      </ActionButton>
                    </form>
                    <form action={deleteCart}>
                      <input type="hidden" name="cart_id" value={cart.id} />
                      <ConfirmButton
                        tone="bad"
                        className="min-h-[44px]"
                        confirm="Yes, delete it"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                ) : (
                  <>
                    {/* The message is the one thing to do about a cart, so it
                        is the red one and it is wider than the phone call
                        beside it. A run that has gone cannot be paid for, so
                        there the message is about the next one rather than
                        this one. */}
                    <div className="mt-2.5 flex gap-2">
                      <a
                        href={messageFor(cart)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-admin-go min-h-[46px] flex-[1.5] px-3"
                      >
                        {going ? "Nudge on WhatsApp" : "Offer the next run"}
                      </a>
                      <a
                        href={`tel:${cart.phone}`}
                        className="btn-admin min-h-[46px] flex-1"
                      >
                        Call
                      </a>
                    </div>

                    {/* Saying what came of it opens its own card below the
                        list rather than unfolding here, because the reasons
                        carry a sentence each and five of those under every
                        card is a page nobody can read. */}
                    <Link
                      href={`${here}${cut === "open" ? "?" : "&"}close=${cart.id}#close`}
                      className="btn-admin btn-admin-sm mt-2 w-full border-line text-muted"
                    >
                      Close it ▾
                    </Link>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Closing a cart.

        Its own card, outlined in Tomato, because it is a decision about one
        person and it is the only thing on this page that takes a cart off
        the list. One reason at a time, each saying what it actually does,
        and a way out: the commonest thing somebody does after opening this
        is decide they would rather send another message.
      */}
      {closing && (
        <div
          id="close"
          className="card mt-3.5 scroll-mt-4 border-brand p-3.5 sm:p-4"
        >
          <h2 className="font-display text-[22px] font-black uppercase leading-none">
            Close {closing.name || "this"}
            {closing.name ? "'s" : ""} cart
          </h2>
          <p className="hint mt-1">
            What happened? It takes the cart off the list and tells you, later,
            which reason comes up most.
          </p>

          <form action={closeCart}>
            <input type="hidden" name="cart_id" value={closing.id} />
            {REASONS.map((reason) => (
              <label
                key={reason.label}
                className="flex min-h-[56px] cursor-pointer items-start gap-2.5 border-t-[1.5px] border-rule py-3"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason.label}
                  required
                  className="mt-0.5 size-5 shrink-0 accent-brand"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold">
                    {reason.label}
                  </span>
                  <span className="hint block">{reason.hint}</span>
                </span>
              </label>
            ))}

            <div className="mt-3 flex gap-2">
              <Link href={here} className="btn-admin min-h-[46px] flex-1">
                Cancel
              </Link>
              <ActionButton
                className="btn-admin-go min-h-[46px] flex-[1.4]"
                done="Closed ✓"
              >
                Close the cart
              </ActionButton>
            </div>
          </form>

          {/* None of the five fits. Its own form, because a box and the radios
              above it both named `reason` would send two answers and the
              first one would win. */}
          <form
            action={closeCart}
            className="mt-3 flex gap-2 border-t-[1.5px] border-rule pt-3"
          >
            <input type="hidden" name="cart_id" value={closing.id} />
            <input
              name="reason"
              placeholder="Something else"
              className="field field-admin grow border-[1.5px] border-line"
            />
            <ActionButton className="btn-admin shrink-0" done="Closed ✓">
              Close
            </ActionButton>
          </form>

          {/* A test of your own is not somebody who did not pay, so there is
              no outcome to record. It just goes, and deleting is forever: the
              cart and what was in it are not kept anywhere else. */}
          <form
            action={deleteCart}
            className="mt-3 flex items-center gap-2.5 border-t-[1.5px] border-rule pt-3"
          >
            <input type="hidden" name="cart_id" value={closing.id} />
            <p className="hint flex-1">
              One of your own tests? Deleting is forever. Closing it keeps the
              number and the reason.
            </p>
            <ConfirmButton
              tone="bad"
              className="min-h-[44px] shrink-0"
              confirm="Yes, delete it"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      )}

      {/* Why they get left, read off the reasons that were actually stored.
          It is the only part of this page that is worth opening on a day
          when nothing is sitting there. */}
      {top && (
        <div className="soft mt-3.5 p-3.5">
          <p className="ticket text-muted">
            Why carts get left · last {CHART_DAYS} days
          </p>
          {why.slice(0, 6).map((one) => (
            <div key={one.reason} className="py-1.5">
              <p className="flex justify-between gap-2 text-[13.5px]">
                <span className="min-w-0 truncate">{one.reason}</span>
                <span className="font-mono">{one.count}</span>
              </p>
              <span className="mt-1 block h-1.5 rounded-full bg-rule">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${Math.round((one.count / top.count) * 100)}%` }}
                />
              </span>
            </div>
          ))}
          <p className="hint mt-2 leading-[1.5]">
            {top.reason} is the commonest, {top.count} of {whyTotal}.
            {top.reason === "Changed their mind on price" &&
              " Price showing up this often is worth a cheaper delivery band, not more nudging."}
            {top.reason === "Did not reply" &&
              " Nudging sooner, while the cart is still warm, is the only thing that moves this one."}
          </p>
        </div>
      )}

      <p className="hint mt-4 leading-[1.5]">
        Nothing here is sent to the customer automatically. The email goes to
        you and the other admins; the message goes when you tap it.
      </p>
    </div>
  );
}
