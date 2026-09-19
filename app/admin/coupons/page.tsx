import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { couponLabel, listCoupons } from "@/lib/coupons";
import { naira } from "@/lib/money";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import {
  deleteCoupon,
  saveCoupon,
  setCouponPlaces,
  setCouponMenu,
  setCouponRuns,
  setCouponWindows,
  toggleCoupon,
} from "../actions";
import { batchOverview } from "@/lib/admin";
import { openRestaurants, menuView } from "@/lib/menu";
import { choiceReach } from "@/lib/coupons";
import DishPicker from "@/components/admin/DishPicker";
import { deliveryHours } from "@/lib/settings";
import { clockOf } from "@/lib/same-day";

export const dynamic = "force-dynamic";

export default async function CouponsAdmin() {
  const coupons = await listCoupons();
  // Only runs still ahead are worth attaching a code to.
  const runs = (await batchOverview()).filter(
    (run) => new Date(run.cut_off_at).getTime() > Date.now()
  );
  // A code can belong to one kitchen rather than to the shop, which is what a
  // deal with that kitchen actually is.
  const places = await openRestaurants();
  // The same day windows, as the hours they open. A promotion can be good for
  // the early car and not the late one.
  // Every dish, flat, for the picker: free delivery is usually one or two
  // things and finding them is a search, not a scroll.
  const menu = await menuView();
  const dishes = menu.flatMap((place) =>
    place.items.map((item) => ({
      id: item.id,
      name: item.name,
      restaurant: place.restaurant.name,
    }))
  );
  // Whole sections of a menu: any pizza is one tick rather than forty, and it
  // keeps up with the menu on its own.
  const sections = menu.flatMap((place) =>
    place.categories.map((category) => ({
      id: category.id,
      name: category.name,
      restaurant: place.restaurant.name,
      items: place.items.filter((item) => item.categoryId === category.id).length,
    }))
  );

  // Whether a size actually catches every dish it is meant to, said before a
  // Friday rather than after one.
  const reach = new Map<string, Awaited<ReturnType<typeof choiceReach>>>();
  for (const coupon of coupons) {
    if (coupon.required_choice?.trim()) {
      const covered = [
        ...coupon.dishes.map((dish) => dish.id),
        ...menu.flatMap((place) =>
          place.items
            .filter((item) =>
              coupon.sections.some((section) => section.id === item.categoryId)
            )
            .map((item) => item.id)
        ),
      ];
      reach.set(coupon.code, await choiceReach([...new Set(covered)], coupon.required_choice));
    }
  }

  const hours = await deliveryHours();
  const windows: { from: number; label: string }[] = [];
  for (let from = hours.first; from < hours.last; from += 3) {
    const to = Math.min(from + 3, hours.last);
    windows.push({ from, label: `${clockOf(from, 0)} to ${clockOf(to, 0)}` });
  }

  return (
    <div>
      <PageHeader
        title="Discount codes"
        detail="For a slow Wednesday, an apology, or a push in a group chat. Nothing to do with the promoter."
      />

      <ul className="mb-4 space-y-3">
        {coupons.map((coupon) => (
          <li key={coupon.code} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-extrabold tracking-wide">{coupon.code}</h2>
                <p className="text-sm text-muted">
                  {couponLabel(coupon)}
                  {coupon.automatic && " · applies by itself"}
                  {coupon.first_order_only && " · first order only"}
                  {coupon.note && ` · ${coupon.note}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  coupon.active ? "bg-mint/10 text-mint" : "bg-black/5 text-muted"
                }`}
              >
                {coupon.active ? "Live" : "Off"}
              </span>
            </div>

            <p className="mt-1 text-sm text-muted">
              Used {coupon.used} time{coupon.used === 1 ? "" : "s"}
              {coupon.max_uses !== null && ` of ${coupon.max_uses}`}
              {coupon.expires_at &&
                ` · until ${new Date(coupon.expires_at).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                })}`}
              {" · "}
              {coupon.runs.length === 0
                ? "any run"
                : coupon.runs.map((run) => run.label).join(", ")}
              {" · "}
              {coupon.places.length === 0
                ? "any restaurant"
                : `${coupon.places.map((place) => place.name).join(", ")} only`}
              {coupon.dishes.length > 0 &&
                ` · ${coupon.dishes.map((dish) => dish.name).join(", ")} only`}
              {coupon.sections.length > 0 &&
                ` · any ${coupon.sections.map((one) => one.name.toLowerCase()).join(" or ")}`}
              {coupon.required_choice?.trim() && ` · ${coupon.required_choice} only`}
            </p>

            {coupon.places.length > 0 && (
              <p className="mt-1 text-sm text-ink/75">
                A cart with anything else in it cannot use this one.
              </p>
            )}

            {/* A code is usually for one night. Ticking runs here is how it is
                kept to that one, or carried into next week's as well. */}
            {runs.length > 0 && (
              <form action={setCouponRuns} className="mt-3 space-y-2">
                <input type="hidden" name="code" value={coupon.code} />
                <p className="label mb-0">Works on</p>
                <div className="flex flex-wrap gap-2">
                  {runs.map((run) => (
                    <label
                      key={run.id}
                      className="chip cursor-pointer border-black/10 bg-white font-medium"
                    >
                      <input
                        type="checkbox"
                        name="batch_id"
                        value={run.id}
                        defaultChecked={coupon.runs.some((r) => r.batchId === run.id)}
                      />
                      {runDateLabel(run.run_date)} · {SLOT_LABEL[run.slot]}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SaveButton quiet className="px-4 py-2 text-sm">
                    Save which runs
                  </SaveButton>
                  <span className="text-xs text-muted">
                    Tick none and it works on every run.
                  </span>
                </div>
              </form>
            )}

            {/* A deal struck with one kitchen holds to that kitchen. Ticking
                one here means the code only comes off a cart made entirely of
                their food. */}
            {places.length > 0 && (
              <form action={setCouponPlaces} className="mt-3 space-y-2">
                <input type="hidden" name="code" value={coupon.code} />
                <p className="label mb-0">Only at</p>
                <div className="flex flex-wrap gap-2">
                  {places.map((place) => (
                    <label
                      key={place.id}
                      className="chip cursor-pointer border-black/10 bg-white font-medium"
                    >
                      <input
                        type="checkbox"
                        name="restaurant_id"
                        value={place.id}
                        defaultChecked={coupon.places.some((one) => one.id === place.id)}
                      />
                      {place.name}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SaveButton quiet className="px-4 py-2 text-sm">
                    Save which restaurants
                  </SaveButton>
                  <span className="text-xs text-muted">
                    Tick none and it works anywhere. Tick one and the whole
                    cart has to come from there.
                  </span>
                </div>
              </form>
            )}

            {/* Free delivery on a dish, a section, or a size. */}
            {coupon.applies_to === "fee" && dishes.length > 0 && (
              <form action={setCouponMenu} className="mt-3 space-y-2">
                <input type="hidden" name="code" value={coupon.code} />

                <p className="label mb-0">Only on these dishes</p>
                <DishPicker menu={dishes} chosen={coupon.dishes.map((one) => one.id)} />

                {sections.length > 0 && (
                  <>
                    <p className="label mb-0 mt-2">Or whole sections</p>
                    <div className="flex flex-wrap gap-2">
                      {sections.map((section) => (
                        <label
                          key={section.id}
                          className="chip cursor-pointer border-black/10 bg-white font-medium"
                        >
                          <input
                            type="checkbox"
                            name="category_id"
                            value={section.id}
                            defaultChecked={coupon.sections.some((one) => one.id === section.id)}
                          />
                          {section.restaurant} · {section.name}
                          <span className="text-xs text-muted">{section.items}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                <div>
                  <label className="label mb-0" htmlFor={`choice-${coupon.code}`}>
                    And only with this choice
                  </label>
                  <input
                    id={`choice-${coupon.code}`}
                    name="required_choice"
                    defaultValue={coupon.required_choice ?? ""}
                    placeholder="Large"
                    className="field py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted">
                    A size is a choice on a dish, not a dish of its own, so any
                    large pizza is the pizza section plus this. Blank means any
                    size.
                  </p>
                  {reach.get(coupon.code) && (
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        reach.get(coupon.code)!.missing.length > 0 ? "text-brand" : "text-mint"
                      }`}
                    >
                      {reach.get(coupon.code)!.missing.length === 0
                        ? `Every one of the ${reach.get(coupon.code)!.of} dishes offers it.`
                        : `${reach.get(coupon.code)!.matched} of ${
                            reach.get(coupon.code)!.of
                          } dishes offer it. Not on: ${reach
                            .get(coupon.code)!
                            .missing.slice(0, 4)
                            .join(", ")}.`}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SaveButton quiet className="px-4 py-2 text-sm">
                    Save what it covers
                  </SaveButton>
                  <span className="text-xs text-muted">
                    Pick nothing and it is the whole menu.
                  </span>
                </div>
              </form>
            )}

            {/* Only a promotion cares about windows: a typed code is used at
                a checkout, and a window is when a car goes out. */}
            {coupon.applies_to === "fee" && windows.length > 0 && (
              <form action={setCouponWindows} className="mt-3 space-y-2">
                <input type="hidden" name="code" value={coupon.code} />
                <p className="label mb-0">Same day windows</p>
                <div className="flex flex-wrap gap-2">
                  {windows.map((window) => (
                    <label
                      key={window.from}
                      className="chip cursor-pointer border-black/10 bg-white font-medium"
                    >
                      <input
                        type="checkbox"
                        name="window"
                        value={window.from}
                        defaultChecked={coupon.windows
                          .split(",")
                          .map((one) => one.trim())
                          .includes(String(window.from))}
                      />
                      {window.label}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SaveButton quiet className="px-4 py-2 text-sm">
                    Save which windows
                  </SaveButton>
                  <span className="text-xs text-muted">
                    Tick none and it is good at any time.
                  </span>
                </div>
              </form>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <form action={toggleCoupon}>
                <input type="hidden" name="code" value={coupon.code} />
                <input type="hidden" name="next_active" value={String(!coupon.active)} />
                <ActionButton done="Done ✓">
                  {coupon.active ? "Switch it off" : "Switch it on"}
                </ActionButton>
              </form>
              <form action={deleteCoupon}>
                <input type="hidden" name="code" value={coupon.code} />
                <ConfirmButton
                  tone="bare"
                  className="chip border-black/10 bg-white text-brand"
                  confirm={`Yes, delete ${coupon.code}`}
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </li>
        ))}
        {coupons.length === 0 && (
          <li className="card text-sm text-muted">
            No codes yet. One below and you can put it in the group tonight.
          </li>
        )}
      </ul>

      <form action={saveCoupon} className="card space-y-3">
        <h2 className="font-bold">A new code</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="code">Code</label>
            <input
              id="code"
              name="code"
              placeholder="FREEDEL"
              autoCapitalize="characters"
              className="field uppercase"
            />
          </div>
          <div>
            <label className="label" htmlFor="amount">Worth</label>
            <input
              id="amount"
              name="amount"
              inputMode="numeric"
              placeholder="500"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="applies_to">What it does</label>
            <select id="applies_to" name="applies_to" className="field" defaultValue="delivery">
              <option value="delivery">Comes off delivery</option>
              <option value="order">Comes off the whole order</option>
              <option value="fee">Delivery becomes this, no code typed</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              The last one is a promotion: it applies by itself when the cart
              qualifies, and nobody types anything.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="included_items">
              Items that price covers
            </label>
            <input
              id="included_items"
              name="included_items"
              inputMode="numeric"
              placeholder="Any"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              For a promotion. Blank is flat however much they order.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="min_per_person">
              Least each, in a group
            </label>
            <input
              id="min_per_person"
              name="min_per_person"
              inputMode="numeric"
              placeholder="0"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              A group splits the offer, so {naira(2000)} is {naira(1000)} each
              for two. This stops it falling further: five of them still pay
              {" "}{naira(1000)} each.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="extra_per_item">
              And each item after
            </label>
            <input
              id="extra_per_item"
              name="extra_per_item"
              inputMode="numeric"
              placeholder="0"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              {naira(2000)} for three and {naira(500)} an item after is three
              and a half thousand for five.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="note">Note to yourself</label>
            <input
              id="note"
              name="note"
              placeholder="Exam week push"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="expires_at">Last day (optional)</label>
            <input id="expires_at" name="expires_at" type="date" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="max_uses">
              How many people can use it
            </label>
            <input
              id="max_uses"
              name="max_uses"
              inputMode="numeric"
              placeholder="No limit"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              10 means the first ten orders and then it stops.
            </p>
          </div>
        </div>

        {runs.length > 0 && (
          <div>
            <p className="label">Which runs</p>
            <div className="flex flex-wrap gap-2">
              {runs.map((run) => (
                <label
                  key={run.id}
                  className="chip cursor-pointer border-black/10 bg-white font-medium"
                >
                  <input type="checkbox" name="batch_id" value={run.id} />
                  {runDateLabel(run.run_date)} · {SLOT_LABEL[run.slot]}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              Tick none and it works on every run, this term and next.
            </p>
          </div>
        )}

        {dishes.length > 0 && (
          <div>
            <p className="label">Only on these dishes</p>
            <DishPicker menu={dishes} chosen={[]} />
            <p className="mt-1 text-xs text-muted">
              For free delivery on one thing worth the trip. Set the delivery
              to 0 above, pick the dish here, and ordering it brings the car.
              Pick two and either earns it, together or alone.
            </p>

            {sections.length > 0 && (
              <>
                <p className="label mt-3">Or whole sections</p>
                <div className="flex flex-wrap gap-2">
                  {sections.map((section) => (
                    <label
                      key={section.id}
                      className="chip cursor-pointer border-black/10 bg-white font-medium"
                    >
                      <input type="checkbox" name="category_id" value={section.id} />
                      {section.restaurant} · {section.name}
                      <span className="text-xs text-muted">{section.items}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="mt-3">
              <label className="label" htmlFor="required_choice">
                And only with this choice
              </label>
              <input
                id="required_choice"
                name="required_choice"
                placeholder="Large"
                className="field"
              />
              <p className="mt-1 text-xs text-muted">
                Any large pizza is the pizza section plus Large. It has to be
                spelt the way the option is spelt on the dish; once saved, this
                page says how many of them actually offer it.
              </p>
            </div>
          </div>
        )}

        {windows.length > 0 && (
          <div>
            <p className="label">Which same day windows</p>
            <div className="flex flex-wrap gap-2">
              {windows.map((window) => (
                <label
                  key={window.from}
                  className="chip cursor-pointer border-black/10 bg-white font-medium"
                >
                  <input type="checkbox" name="window" value={window.from} />
                  {window.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              Tick none and it is good at any time. A run is not a window, so
              runs are decided by the ticks above and never by these.
            </p>
          </div>
        )}

        {places.length > 0 && (
          <div>
            <p className="label">Only at</p>
            <div className="flex flex-wrap gap-2">
              {places.map((place) => (
                <label
                  key={place.id}
                  className="chip cursor-pointer border-black/10 bg-white font-medium"
                >
                  <input type="checkbox" name="restaurant_id" value={place.id} />
                  {place.name}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              For a deal with one kitchen. The code then only comes off a cart
              made entirely of their food, so a cart with anything else in it
              is told the code is for them only.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked />
            Live straight away
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="first_order_only" />
            First order only
          </label>
        </div>

        <SaveButton>Save the code</SaveButton>
        <p className="text-xs text-muted">
          A delivery code never pays out more than the delivery on that order,
          so {naira(500)} off a {naira(2000)} top-up is {naira(500)}, and off a
          free top-up is refused rather than turned into cash.
        </p>
      </form>
    </div>
  );
}
