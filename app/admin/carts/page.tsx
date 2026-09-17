import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import AdminLive from "@/components/admin/AdminLive";
import { abandonedCarts } from "@/lib/carts";
import { getSettings } from "@/lib/settings";
import { whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { markCartHandled } from "../actions";

export const dynamic = "force-dynamic";

export default async function CartsPage() {
  const settings = await getSettings();
  const minutes = settings.abandon_minutes || 45;
  const carts = await abandonedCarts(minutes);

  const value = carts.reduce((total, cart) => total + cart.value, 0);

  return (
    <div>
      <AdminLive />
      <PageHeader
        title="Carts left behind"
        detail={`Filled in, never paid for, untouched for ${minutes} minutes or more.`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Waiting" value={carts.length} tone={carts.length ? "warn" : undefined} />
        <Stat label="Sitting there" value={value} money />
        <Stat
          label="Average"
          value={carts.length === 0 ? 0 : Math.round(value / carts.length)}
          money
        />
      </div>

      {carts.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing left behind. Every cart with a number on it became an order.
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
                  <form action={markCartHandled}>
                    <input type="hidden" name="cart_id" value={cart.id} />
                    <button className="chip border-black/10 bg-white">
                      Done with this
                    </button>
                  </form>
                  {cart.alerted_at && (
                    <span className="chip border-transparent bg-black/5 text-muted">
                      Emailed
                    </span>
                  )}
                </div>
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
