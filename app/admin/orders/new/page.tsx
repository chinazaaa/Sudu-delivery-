import PageHeader from "@/components/admin/PageHeader";
import DeskOrder from "@/components/admin/DeskOrder";
import { deskOrder } from "@/app/admin/actions";
import { openBatches } from "@/lib/batches";
import { toBatchView } from "@/lib/view";
import { hostelNames } from "@/lib/hostels";
import { hoursByDay, safeSettings } from "@/lib/settings";
import { deliverySlots } from "@/lib/same-day";
import { lastOrderForPhone } from "@/lib/orders";
import { oneCustomer } from "@/lib/customer";
import { normalisePhone } from "@/lib/phone";
import { runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * An order somebody placed on WhatsApp, typed in here.
 *
 * The only way to make an order from admin was to convert a cart somebody
 * had already built on the site, which is no use for the orders that never
 * touch the site: she says what she wants in a chat, and somebody here has
 * to put it on a run. Until now that meant opening the shop in another tab
 * and ordering as her, which needs her PIN, and her PIN is hers.
 *
 * Everything it does afterwards is the ordinary machinery: the same
 * pricing, the same ladder, the same fee, the same PIN rules. The only
 * thing different is that the order says a person keyed it in.
 */
export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; said?: string }>;
}) {
  const asked = await searchParams;
  const phone = normalisePhone(asked.phone ?? "");

  const settings = await safeSettings();
  const [hostels, openRuns, carSlots, them, last] = await Promise.all([
    hostelNames(),
    openBatches().catch(() => []),
    settings.same_day_on === "on"
      ? hoursByDay()
          .then((hours) => deliverySlots(new Date(), hours))
          .catch(() => [])
      : Promise.resolve([]),
    phone ? oneCustomer(phone).catch(() => null) : Promise.resolve(null),
    phone ? lastOrderForPhone(phone).catch(() => null) : Promise.resolve(null),
  ]);

  // The same list the carts page offers: a run still taking orders, or a
  // time a car could go.
  const going = [
    ...openRuns
      .map(toBatchView)
      .filter((one) => !one.closed && !one.full)
      .map((one) => ({
        value: `run:${one.id}`,
        label: `${one.deliveryWindow}, ${one.label.split(" · ")[0]}`,
        car: false,
      })),
    ...carSlots.map((one) => ({
      value: one.at,
      label: `A car of its own · ${one.label}`,
      car: true,
    })),
  ];

  const known = phone
    ? {
        phone,
        name: them?.name ?? "",
        hostel: them?.hostel ?? "",
        orders: them?.everOrdered ?? 0,
        last:
          last && last.lines.length > 0
            ? {
                at: runDateLabel(last.batch.run_date),
                lines: last.lines.map((line) => ({
                  id: line.menu_item_id,
                  name: line.name,
                  shop: line.restaurant,
                  price: line.unit_price_at_order,
                  qty: line.qty,
                })),
              }
            : null,
      }
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        backHref="/admin/orders"
        title="Take an order"
        detail="For somebody who ordered on WhatsApp. It is priced, fed and chased exactly like any other order; it just says we typed it."
      />

      {asked.said && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {asked.said}
        </p>
      )}

      {/* Their number first, because it is what everything else hangs off:
          the name, the block and what they had last time. A plain GET, so
          the page can be shared and reloaded. */}
      <form method="get" className="card flex flex-wrap items-end gap-2">
        <div className="grow">
          <label className="label" htmlFor="find">
            Their number
          </label>
          <input
            id="find"
            name="phone"
            defaultValue={asked.phone ?? ""}
            inputMode="tel"
            placeholder="0803 123 4567"
            className="field"
          />
        </div>
        <button type="submit" className="btn-admin shrink-0">
          Find them
        </button>
      </form>

      {asked.phone && !phone && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          That number does not look right. Eleven digits, starting 070, 080,
          081, 090 or 091.
        </p>
      )}

      <DeskOrder place={deskOrder} going={going} hostels={hostels} known={known} />
    </div>
  );
}
