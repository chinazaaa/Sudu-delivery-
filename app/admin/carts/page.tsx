import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import AdminLive from "@/components/admin/AdminLive";
import Link from "next/link";
import { abandonedCarts, closedCarts } from "@/lib/carts";
import { getSettings } from "@/lib/settings";
import { whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { agoLabel, whenLabel } from "@/lib/time";
import { closeCart, deleteCart, deleteClosedCarts, reopenCart } from "../actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ActionButton from "@/components/admin/ActionButton";

export const dynamic = "force-dynamic";

/** What a chase actually ended in. Anything else is typed in. */
const OUTCOMES = [
  "Not interested",
  "Will order next run",
  "Ordered another way",
  "No reply",
];

/**
 * Carts somebody filled and never paid for.
 *
 * The board draws one of these as a card with the money at the top of it and
 * the two things you would do about it underneath, because the question is
 * never "what is in this cart": it is whether the person is worth a message
 * before the run closes. Closing a cart is folded away behind its own button,
 * since saying what came of it happens once, after the chase, and a screen of
 * outcome buttons under every card is a screen nobody can read.
 */
export default async function CartsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const closed = (await searchParams).show === "closed";
  const settings = await getSettings();
  const minutes = settings.abandon_minutes || 45;

  const [open, done] = await Promise.all([
    abandonedCarts(minutes),
    closedCarts(),
  ]);
  const carts = closed ? done : open;
  const value = open.reduce((total, cart) => total + cart.value, 0);

  return (
    <div>
      <AdminLive />
      <PageHeader
        title="Carts left behind"
        detail={`Filled in, never paid for, untouched for ${minutes} minutes or more.`}
        backHref="/admin/more"
        backLabel="More"
      />

      <div className="mb-3.5 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <Figure
          label="Waiting"
          value={String(open.length)}
          tone={open.length ? "brand" : "ink"}
          detail={
            open.length === 0
              ? "Nobody to chase"
              : `Untouched for ${minutes} minutes or more`
          }
        />
        <Figure
          label="Sitting there"
          value={naira(value)}
          tone={value > 0 ? "brand" : "ink"}
          detail="Money nobody has been asked for yet"
        />
        <Figure
          label="Closed"
          value={String(done.length)}
          detail="Chased, and said to be finished with"
        />
      </div>

      {/* Wrapped, not scrolled sideways: the tap after a fling is
          spent stopping the fling, so a row somebody has to scroll is a
          row whose buttons sometimes do nothing. */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/carts"
          className={`pill-admin min-h-[44px] ${closed ? "" : "pill-admin-on"}`}
        >
          Still open
          <span className="font-mono opacity-60">{open.length}</span>
        </Link>
        <Link
          href="/admin/carts?show=closed"
          className={`pill-admin min-h-[44px] ${closed ? "pill-admin-on" : ""}`}
        >
          Closed
          <span className="font-mono opacity-60">{done.length}</span>
        </Link>

        {closed && done.length > 0 && (
          <form action={deleteClosedCarts} className="sm:ml-auto">
            <ConfirmButton
              tone="bad"
              className="min-h-[44px]"
              confirm={`Yes, delete all ${done.length}`}
            >
              Delete every closed one
            </ConfirmButton>
          </form>
        )}
      </div>

      {carts.length === 0 ? (
        <p className="card p-3.5 text-sm text-muted sm:p-4">
          {closed
            ? "Nothing closed yet."
            : "Nothing left behind. Every cart with a number on it became an order."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {carts.map((cart) => {
            const message = whatsappTo(
              cart.phone,
              `Hi ${cart.name || "there"}, you had ${cart.summary} in your Sudu cart ` +
                `(${naira(cart.value)}). Still want it? The run is going.`
            );
            return (
              <li
                key={cart.id}
                className={`card p-3.5 sm:p-4 ${closed ? "opacity-[0.72]" : ""}`}
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

                {/* When they walked away. A timestamp answers "when" and the
                    thing actually being asked is whether this is still worth
                    chasing: twenty minutes ago is somebody who might still be
                    deciding, three days ago is not. Both, because the exact
                    moment is what you quote back to them. */}
                <p className="hint mt-1">
                  {agoLabel(cart.updated_at)} · {formatPhone(cart.phone)}
                  {cart.hostel && ` · ${cart.hostel}`} · {cart.items} item
                  {cart.items === 1 ? "" : "s"} · {whenLabel(cart.updated_at)}
                </p>

                <p className="mt-1.5 text-sm text-ink/75">{cart.summary}</p>

                <div className="mt-2.5 flex items-center gap-2">
                  {closed ? (
                    <span className="tag bg-wash text-ink">
                      {cart.handled_reason || "closed"}
                    </span>
                  ) : (
                    <span className="tag bg-brand-tint text-amber-deep">still open</span>
                  )}
                  {cart.alerted_at && (
                    <span className="hint ml-auto">In the recap</span>
                  )}
                </div>

                {closed ? (
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
                        beside it. */}
                    <div className="mt-2.5 flex gap-2">
                      <a
                        href={message}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-admin-go min-h-[46px] flex-[1.5] px-3"
                      >
                        Ask if they still want it
                      </a>
                      <a
                        href={`tel:${cart.phone}`}
                        className="btn-admin min-h-[46px] flex-1"
                      >
                        Call
                      </a>
                    </div>

                    {/* Closing says what came of it, so nobody is chased twice
                        and the reason the money never arrived is kept. Folded
                        away because it is the last step of a chase, not the
                        first: on a phone an open cart is two buttons, and the
                        five ways of closing it are one tap further on. */}
                    <details className="mt-2 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="btn-admin btn-admin-sm w-full cursor-pointer list-none border-line text-muted">
                        Close it ▾
                      </summary>

                      <p className="hint mt-2.5">
                        What happened? It takes the cart off the list and keeps
                        the reason, so the same person is not chased twice.
                      </p>

                      {OUTCOMES.map((outcome) => (
                        <form action={closeCart} key={outcome}>
                          <input type="hidden" name="cart_id" value={cart.id} />
                          <input type="hidden" name="reason" value={outcome} />
                          <ActionButton
                            className="flex min-h-[48px] w-full items-center border-t-[1.5px] border-rule text-left text-[14.5px] font-semibold"
                            done="Closed ✓"
                          >
                            {outcome}
                          </ActionButton>
                        </form>
                      ))}

                      <form
                        action={closeCart}
                        className="flex gap-2 border-t-[1.5px] border-rule pt-2.5"
                      >
                        <input type="hidden" name="cart_id" value={cart.id} />
                        <input
                          name="reason"
                          placeholder="Something else"
                          className="field field-admin grow border-[1.5px] border-line"
                        />
                        <ActionButton
                          className="btn-admin shrink-0"
                          done="Closed ✓"
                        >
                          Close
                        </ActionButton>
                      </form>

                      {/* A test of your own is not somebody who did not pay,
                          so there is no outcome to record. It just goes, and
                          deleting is forever: the cart and what was in it are
                          not kept anywhere else. */}
                      <form
                        action={deleteCart}
                        className="mt-2.5 flex items-center gap-2.5 border-t-[1.5px] border-rule pt-2.5"
                      >
                        <input type="hidden" name="cart_id" value={cart.id} />
                        <p className="hint flex-1">
                          One of your own tests? Deleting is forever. Closing
                          it keeps the number and the reason.
                        </p>
                        <ConfirmButton
                          tone="bad"
                          className="min-h-[44px] shrink-0"
                          confirm="Yes, delete it"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </details>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="hint mt-4 leading-[1.5]">
        Nothing here is sent to the customer automatically. The email goes to
        you and the other admins; the message goes when you tap it.
      </p>
    </div>
  );
}
