import PageHeader from "@/components/admin/PageHeader";
import SkincareForm from "@/components/admin/SkincareForm";
import { safeSettings } from "@/lib/settings";
import { laundryCount, laundryList, retail } from "@/lib/laundry";
import { naira } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * The laundry margin, and nothing else.
 *
 * The price list itself is in the code, as what the cleaner charges, and is
 * never printed anywhere. What this page sets is the one number that turns
 * cost into price, so the shop's margin can move without a deploy and there
 * is no screen anywhere that publishes what we pay.
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
        detail="Collected from a block, washed, brought back. Priced per item from the cleaner's own list."
      />

      <div className="card border-2 border-ink bg-volt/20">
        <h2 className="font-bold">Where the prices come from</h2>
        <p className="mt-1 text-sm leading-relaxed">
          The {laundryCount()} prices on the list are what the cleaner charges
          us. They are never shown to anybody. What a customer sees is that
          cost plus the markup below, rounded up to the nearest fifty naira,
          so the only place your margin lives is this page.
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
              What you add, in percent
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
          <p className="label mb-1">At {markup}%, these are the prices</p>
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
            At {markup}% you keep about{" "}
            {naira(retail(10000, markup, 50) - 10000)} on every{" "}
            {naira(10000)} of cleaning, before the cost of going to collect it
            and bringing it back.
          </p>
        </div>
      </SkincareForm>

      <div className="card">
        <h2 className="font-bold">The list</h2>
        <p className="text-sm text-muted">
          {list.groups.length} sections, {laundryCount()} items. It lives in
          the code rather than here because it is the cleaner&apos;s list, not
          ours: when they change their prices, send the new list over and it
          is one change.
        </p>
      </div>
    </div>
  );
}
