import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import AdminLive from "@/components/admin/AdminLive";
import Link from "next/link";
import { abandonedCarts, closedCarts } from "@/lib/carts";
import { getSettings } from "@/lib/settings";
import { whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { closeCart, reopenCart } from "../actions";

export const dynamic = "force-dynamic";

/** What a chase actually ended in. Anything else is typed in. */
const OUTCOMES = [
  "Not interested",
  "Will order next run",
  "Ordered another way",
  "No reply",
];

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
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Waiting" value={open.length} tone={open.length ? "warn" : undefined} />
        <Stat label="Sitting there" value={value} money />
        <Stat label="Closed" value={done.length} />
      </div>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <Link
          href="/admin/carts"
          className={`chip ${
            closed ? "border-black/10 bg-white" : "border-ink bg-ink text-white"
          }`}
        >
          Still open
          <span className="rounded-full bg-black/10 px-1.5 text-xs">{open.length}</span>
        </Link>
        <Link
          href="/admin/carts?show=closed"
          className={`chip ${
            closed ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
          }`}
        >
          Closed
          <span className="rounded-full bg-black/10 px-1.5 text-xs">{done.length}</span>
        </Link>
      </div>

      {carts.length === 0 ? (
        <p className="card text-sm text-muted">
          {closed
            ? "Nothing closed yet."
            : "Nothing left behind. Every cart with a number on it became an order."}
        </p>
      ) : (
        <ul className="space-y-3">
          {carts.map((cart) => {
            const message = whatsappTo(
              cart.phone,
              `Hi ${cart.name || "there"}, you had ${cart.summary} in your Sudu cart ` +
                `(${naira(cart.value)}). Still want it? The run is going.`
            );
            return (
              <li key={cart.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{cart.name || "No name given"}</h3>
                    <p className="text-sm text-muted">
                      {formatPhone(cart.phone)}
                      {cart.hostel && ` · ${cart.hostel}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold">{naira(cart.value)}</p>
                    <p className="text-xs text-muted">
                      {cart.items} item{cart.items === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-sm text-ink/75">{cart.summary}</p>

                {closed ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="chip border-transparent bg-black/5 text-muted">
                      {cart.handled_reason || "Closed"}
                    </span>
                    <form action={reopenCart}>
                      <input type="hidden" name="cart_id" value={cart.id} />
                      <button className="chip border-black/10 bg-white">
                        Put it back on the list
                      </button>
                    </form>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={message}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        Ask if they still want it
                      </a>
                      <a
                        href={`tel:${cart.phone}`}
                        className="chip border-black/10 bg-white"
                      >
                        Call
                      </a>
                      {cart.alerted_at && (
                        <span className="chip border-transparent bg-black/5 text-muted">
                          In the recap
                        </span>
                      )}
                    </div>

                    {/* Closing says what came of it, so nobody is chased twice
                        and the reason the money never arrived is kept. */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-black/5 pt-2">
                      <span className="text-sm font-semibold text-muted">Close as</span>
                      {OUTCOMES.map((outcome) => (
                        <form action={closeCart} key={outcome}>
                          <input type="hidden" name="cart_id" value={cart.id} />
                          <input type="hidden" name="reason" value={outcome} />
                          <button className="chip border-black/10 bg-white py-1.5 text-xs hover:border-ink/30">
                            {outcome}
                          </button>
                        </form>
                      ))}
                      <form action={closeCart} className="flex grow gap-2">
                        <input type="hidden" name="cart_id" value={cart.id} />
                        <input
                          name="reason"
                          placeholder="Something else"
                          className="field grow py-1.5 text-sm"
                        />
                        <button className="chip border-black/10 bg-white py-1.5 text-xs">
                          Close
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted">
        Nothing here is sent to the customer automatically. The email goes to
        you and the other admins; the message goes when you tap it.
      </p>
    </div>
  );
}
