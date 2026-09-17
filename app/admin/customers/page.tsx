import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { customerRows } from "@/lib/admin-data";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import { whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import SaveButton from "@/components/SaveButton";
import { saveCustomerNote } from "../actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const [rows, settings, url] = await Promise.all([
    customerRows(query.q),
    getSettings(),
    siteUrl(),
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

      {rows.length === 0 ? (
        <p className="card text-sm text-muted">
          No customers yet. A customer is created by their first order.
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
                      {formatPhone(row.phone)} · {row.hostel || "No block saved"}
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
                </div>

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
