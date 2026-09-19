import PageHeader from "@/components/admin/PageHeader";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CouponForm, { type CouponFormData } from "@/components/admin/CouponForm";
import { choiceReach, couponLabel, listCoupons } from "@/lib/coupons";
import { deleteCoupon, toggleCoupon } from "../actions";
import { batchOverview } from "@/lib/admin";
import { menuView } from "@/lib/menu";
import { type ScopeShop } from "@/components/admin/MenuScope";
import { deliveryHours } from "@/lib/settings";
import { clockOf } from "@/lib/same-day";

export const dynamic = "force-dynamic";

export default async function CouponsAdmin() {
  const coupons = await listCoupons();
  // Only runs still ahead are worth attaching a code to.
  const runs = (await batchOverview()).filter(
    (run) => new Date(run.cut_off_at).getTime() > Date.now()
  );
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
  // Each menu as a tree: its sections, and the choices those sections offer
  // in that kitchen's own words. Picked one step at a time rather than spelt.
  const shops: ScopeShop[] = menu.map((place) => {
    // Kept under the question the dish asks, so Size and Flavour are two rows
    // rather than one long list somebody has to sort in their head.
    const choices = new Map<string, { group: string; name: string; categories: Set<string> }>();
    for (const item of place.items) {
      for (const group of item.groups) {
        for (const option of group.options) {
          const name = option.name.trim();
          if (name === "") continue;
          const key = `${group.name.toLowerCase()}|${name.toLowerCase()}`;
          const entry = choices.get(key) ?? {
            group: group.name,
            name,
            categories: new Set<string>(),
          };
          if (item.categoryId) entry.categories.add(item.categoryId);
          choices.set(key, entry);
        }
      }
    }

    return {
      id: place.restaurant.id,
      name: place.restaurant.name,
      categories: place.categories.map((category) => ({
        id: category.id,
        name: category.name,
        items: place.items.filter((item) => item.categoryId === category.id).length,
      })),
      choices: [...choices.values()].map((one) => ({
        group: one.group,
        name: one.name,
        categories: [...one.categories],
      })),
    };
  });

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

  // One bundle for the form, whether it is making an offer or changing one.
  const formData: CouponFormData = {
    shops,
    dishes,
    runs: runs.map((run) => ({ id: run.id, run_date: run.run_date, slot: run.slot })),
    windows,
  };

  return (
    <div>
      <PageHeader
        title="Discount codes"
        detail="For a slow Wednesday, an apology, or a push in a group chat. Nothing to do with the promoter."
      />

      <ul className="mb-4 space-y-3">
        {coupons.map((coupon) => (
          <li key={coupon.code} className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-extrabold tracking-wide">{coupon.code}</h2>
                <p className="text-sm text-muted">
                  {couponLabel(coupon)}
                  {coupon.automatic && " · applies by itself"}
                  {coupon.first_order_only && " · first order only"}
                  {coupon.note && ` · ${coupon.note}`}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Used {coupon.used} time{coupon.used === 1 ? "" : "s"}
                  {coupon.max_uses !== null && ` of ${coupon.max_uses}`}
                  {" · "}
                  {coupon.runs.length === 0
                    ? "any run"
                    : coupon.runs.map((run) => run.label).join(", ")}
                </p>
                {reach.get(coupon.code) && (
                  <p
                    className={`mt-0.5 text-sm font-semibold ${
                      reach.get(coupon.code)!.missing.length > 0 ? "text-brand" : "text-mint"
                    }`}
                  >
                    {reach.get(coupon.code)!.missing.length === 0
                      ? `All ${reach.get(coupon.code)!.of} dishes offer that choice.`
                      : `${reach.get(coupon.code)!.matched} of ${
                          reach.get(coupon.code)!.of
                        } dishes offer it. Not on: ${reach
                          .get(coupon.code)!
                          .missing.slice(0, 4)
                          .join(", ")}.`}
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  coupon.active ? "bg-mint/10 text-mint" : "bg-black/5 text-muted"
                }`}
              >
                {coupon.active ? "Live" : "Off"}
              </span>
            </div>

            <details>
              <summary className="cursor-pointer text-sm font-bold text-brand">
                Change this offer
              </summary>
              <div className="mt-3">
                <CouponForm coupon={coupon} data={formData} />
              </div>
            </details>

            <div className="flex flex-wrap gap-2 border-t border-black/5 pt-3">
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
            Nothing yet. The form below makes one.
          </li>
        )}
      </ul>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">A new offer</h2>
          <p className="text-sm text-muted">
            For free delivery on a dish, a flat price on a kitchen, or a code
            to put in a group chat. Everything here saves together.
          </p>
        </div>
        <CouponForm coupon={null} data={formData} />
      </section>
    </div>
  );
}
