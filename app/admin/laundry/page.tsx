import PageHeader from "@/components/admin/PageHeader";
import SkincareForm from "@/components/admin/SkincareForm";
import { safeSettings } from "@/lib/settings";
import { laundryCount, laundryList, retail } from "@/lib/laundry";
import { naira } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * What laundry costs, and nothing else.
 *
 * The washing is done in the family, so there is no bill coming in and no
 * margin to work out: what somebody pays is what the shop takes, less the
 * water, the powder and the hours. The list in the code is the going rate
 * in Lagos, and what this page sets is how far above or below the town
 * the shop prices itself.
 */
export default async function AdminLaundryPage() {
  const settings = await safeSettings();
  const list = await laundryList();
  const markup = Number(settings.laundry_markup) || 0;

  // A few real rows, so a number typed into the box above can be seen as
  // the prices it will actually put on the page.
  const sample = [
    { name: "T-shirt or polo", cost: 1000 },
    { name: "Trousers", cost: 1000 },
    { name: "Formal shirt, folded", cost: 1000 },
    { name: "Duvet", cost: 7000 },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Laundry"
        detail="Collected from a block, washed, brought back. Priced per item against what Lagos charges."
      />

      <div className="card border-2 border-ink bg-volt/20">
        <h2 className="font-bold">Where the prices come from</h2>
        <p className="mt-1 text-sm leading-relaxed">
          The {laundryCount()} prices on the list are the going rate in Lagos,
          not a bill from anybody: the washing is done in the family, so what
          a customer pays is what the shop takes. The list is never shown.
          What they see is the rate plus the figure below, rounded up to the
          nearest fifty naira, which is how far above the town you are
          pricing yourself.
        </p>
      </div>

      <SkincareForm kind="laundry">
        <h2 className="font-bold">How it is priced</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="laundry_on">
              The service
            </label>
            <select
              id="laundry_on"
              name="laundry_on"
              defaultValue={settings.laundry_on}
              className="field"
            >
              <option value="">Off, nobody sees it</option>
              <option value="on">On</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="laundry_markup">
              Above the going rate, in percent
            </label>
            <input
              id="laundry_markup"
              name="laundry_markup"
              type="number"
              min={0}
              defaultValue={markup}
              className="field"
            />
          </div>

          <div>
            <label className="label" htmlFor="laundry_minimum">
              Smallest collection, in naira
            </label>
            <input
              id="laundry_minimum"
              name="laundry_minimum"
              type="number"
              min={0}
              defaultValue={Number(settings.laundry_minimum) || 0}
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              Collection and return are two trips. Under this the page says
              so and asks them to gather a few things. Zero says nothing at
              all, which reads as no minimum.
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="laundry_note">
            A line of your own on the price list
          </label>
          <input
            id="laundry_note"
            name="laundry_note"
            defaultValue={settings.laundry_note}
            placeholder="Collected Monday and Thursday, back within two days."
            className="field"
          />
        </div>

        <div className="border-t border-black/5 pt-3">
          <p className="label mb-1">
            At {markup}% above the town, these are the prices
          </p>
          <ul className="divide-y divide-black/5 text-sm">
            {sample.map((one) => (
              <li key={one.name} className="flex justify-between py-1.5">
                <span>{one.name}</span>
                <span className="font-mono">
                  <span className="text-muted">{naira(one.cost)} cost</span>
                  {" · "}
                  <span className="font-semibold">
                    {naira(retail(one.cost, markup, 50))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Nobody is paid out of this, so a {naira(10000)} collection is{" "}
            {naira(10000)} to the shop, less the water, the powder and the
            hours. What it has to cover is the trip: collection and return
            are two journeys the food runs do not make, so the smallest
            basket worth driving for is the number beside this.
          </p>
        </div>
      </SkincareForm>

      <div className="card">
        <h2 className="font-bold">The list</h2>
        <p className="text-sm text-muted">
          {list.groups.length} sections, {laundryCount()} items. It lives in
          the code rather than here because it is the town&apos;s list rather
          than ours: when Lagos prices move, send the new list over and it is
          one change.
        </p>
      </div>
    </div>
  );
}
