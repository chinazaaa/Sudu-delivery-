import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { customerRows } from "@/lib/admin-data";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import { whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import SaveButton from "@/components/SaveButton";
import { addCustomer, deleteCustomer, saveCustomerNote, setCustomerPromoter } from "../actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const [rows, settings, url, hostels, promoters] = await Promise.all([
    customerRows(query.q),
    getSettings(),
    siteUrl(),
    hostelNames(),
    namedPromoters(),
  ]);

  const spend = rows.reduce((total, row) => total + row.spend, 0);
  const repeat = rows.filter((row) => row.orders > 1).length;

  return (
    <div>
      <PageHeader
        title="Customers"
        detail="Everyone who has ever ordered, with the PIN that opens their history."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Customers" value={rows.length} />
        <Stat label="Ordered twice or more" value={repeat} tone="good" />
        <Stat label="Lifetime spend" value={spend} money />
        <Stat
          label="Average each"
          value={rows.length === 0 ? 0 : Math.round(spend / rows.length)}
          money
        />
      </div>

      <form className="mb-4 flex gap-2" action="/admin/customers">
        <input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Name, number or block"
          className="field grow py-2 text-sm sm:max-w-xs"
        />
        <button className="btn-quiet px-4 py-2 text-sm">Search</button>
      </form>

      {/* A customer with no order behind them. Needed whenever somebody must
          be able to sign in without food going into a car: an app reviewer who
          has to try the delete, or somebody who orders on WhatsApp and wants
          their history on the site. */}
      <details className="card mb-4">
        <summary className="cursor-pointer text-sm font-bold">
          Add somebody by hand
        </summary>
        <form action={addCustomer} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new_name">
                Name
              </label>
              <input id="new_name" name="name" required className="field" placeholder="App Review" />
            </div>
            <div>
              <label className="label" htmlFor="new_phone">
                Phone
              </label>
              <input id="new_phone" name="phone" required className="field" placeholder="0803 000 0000" />
            </div>
            <div>
              <label className="label" htmlFor="new_hostel">
                Block (optional)
              </label>
              {/* The blocks admin has set, the same list the checkout uses.
                  Typed by hand a block is misspelt every other time, and the
                  handout list cannot be sorted by it. */}
              {hostels.length > 0 ? (
                <select id="new_hostel" name="hostel" defaultValue="" className="field">
                  <option value="">Not saying</option>
                  {hostels.map((hostel) => (
                    <option key={hostel} value={hostel}>
                      {hostel}
                    </option>
                  ))}
                </select>
              ) : (
                <input id="new_hostel" name="hostel" className="field" />
              )}
            </div>
            <div>
              <label className="label" htmlFor="new_pin">
                PIN (optional)
              </label>
              <input
                id="new_pin"
                name="pin"
                inputMode="numeric"
                maxLength={4}
                className="field"
                placeholder="Four digits, or leave it"
              />
            </div>
          </div>
          <p className="text-xs text-muted">
            They can sign in straight away, with no orders behind them. Somebody
            who already exists is left exactly as they are, PIN and all.
          </p>
          <SaveButton>Add them</SaveButton>
        </form>
      </details>

      {rows.length === 0 ? (
        <p className="card text-sm text-muted">
          No customers yet. A customer is created by their first order, or by hand
          above.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const message = whatsappTo(
              row.phone,
              `Hi ${row.name}, here is your Sudu PIN: ${row.pin}.\n\n` +
                `Open ${url}/orders, put in your number and that PIN, and every ` +
                `order you have placed is there.`
            );
            return (
              <article key={row.phone} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{row.name}</h3>
                    <p className="text-sm text-muted">
                      {formatPhone(row.phone)} · {row.hostel || "No block saved"} ·{" "}
                      {row.pays === "card" ? "Pays by card" : "Pays by transfer"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold">{naira(row.spend)}</p>
                    <p className="text-xs text-muted">
                      {row.orders} order{row.orders === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="chip border-black/10 bg-shell">
                    PIN <span className="font-black tracking-wider">{row.pin}</span>
                  </span>
                  <a
                    href={message}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip border-black/10 bg-white hover:border-ink/30"
                  >
                    Send their PIN
                  </a>
                  <a
                    href={`tel:${row.phone}`}
                    className="chip border-black/10 bg-white hover:border-ink/30"
                  >
                    Call
                  </a>
                  <a
                    href={`/admin/orders?status=all&q=${encodeURIComponent(row.phone)}`}
                    className="chip border-black/10 bg-white hover:border-ink/30"
                  >
                    Their orders
                  </a>
                  {/* Testing a checkout makes a customer, so a shop that has
                      been tested has a list mostly of itself. Anybody who has
                      ordered stays: their orders point at this number. */}
                  {row.orders === 0 && (
                    <form action={deleteCustomer}>
                      <input type="hidden" name="phone" value={row.phone} />
                      <ConfirmButton
                        tone="bare"
                        className="chip border-black/10 bg-white text-brand"
                        confirm={`Yes, delete ${row.name || row.phone}`}
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  )}
                </div>

                {/* Who brought them. The order path writes this once and
                    never again, which is what makes the commission lifetime,
                    so changing it here is the deliberate exception: it moves
                    every order they have ever placed. */}
                {promoters.length > 0 && (
                  <form action={setCustomerPromoter} className="mt-3 flex gap-2">
                    <input type="hidden" name="phone" value={row.phone} />
                    <select
                      name="promoter_code"
                      defaultValue={row.promoterCode ?? ""}
                      className="field grow py-2 text-sm"
                      aria-label={`Who brought ${row.name || row.phone}`}
                    >
                      <option value="">Came in on their own</option>
                      {promoters.map((one) => (
                        <option key={one.code} value={one.code}>
                          Brought by {one.name}
                        </option>
                      ))}
                    </select>
                    <SaveButton quiet className="shrink-0 px-4 py-2 text-sm">
                      Save
                    </SaveButton>
                  </form>
                )}

                <form action={saveCustomerNote} className="mt-3 flex gap-2">
                  <input type="hidden" name="phone" value={row.phone} />
                  <input
                    name="admin_note"
                    defaultValue={row.note}
                    placeholder="Note about this customer, only you see it"
                    className="field grow py-2 text-sm"
                  />
                  <SaveButton quiet className="shrink-0 px-4 py-2 text-sm">
                    Save
                  </SaveButton>
                </form>
              </article>
            );
          })}
        </div>
      )}

      {!settings.whatsapp_number && (
        <p className="mt-4 text-xs text-muted">
          Tip: set your own WhatsApp number in Settings so customers can reply to
          you on the same number.
        </p>
      )}
    </div>
  );
}
