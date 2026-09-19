import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CouponForm, {
  type CouponFormData,
  type CouponFormValues,
} from "@/components/admin/CouponForm";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import { choiceReach, couponLabel, listCoupons } from "@/lib/coupons";
import { choiceLabels, choiceSets } from "@/lib/offers";
import { deleteCoupon, toggleCoupon } from "../actions";
import { batchOverview } from "@/lib/admin";
import { menuView } from "@/lib/menu";
import { type ScopeShop } from "@/components/admin/MenuScope";
import { hoursSpan } from "@/lib/settings";
import { clockOf } from "@/lib/same-day";

export const dynamic = "force-dynamic";

export default async function CouponsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  // The form opens at the top rather than waiting at the bottom of however
  // many offers there are.
  const making = (await searchParams).new === "1";
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
    const choices = new Map<
      string,
      { group: string; name: string; categories: Set<string>; items: Set<string> }
    >();
    // How many dishes ask each question. Domino's Half & Half asks for a
    // flavour twice, and those two questions are on one pizza out of fifteen,
    // which is worth knowing before an offer is narrowed to them.
    const asks = new Map<string, Set<string>>();

    for (const item of place.items) {
      for (const group of item.groups) {
        asks.set(group.name, (asks.get(group.name) ?? new Set<string>()).add(item.id));
        for (const option of group.options) {
          const name = option.name.trim();
          if (name === "") continue;
          const key = `${group.name.toLowerCase()}|${name.toLowerCase()}`;
          const entry = choices.get(key) ?? {
            group: group.name,
            name,
            categories: new Set<string>(),
            items: new Set<string>(),
          };
          if (item.categoryId) entry.categories.add(item.categoryId);
          entry.items.add(item.id);
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
        items: one.items.size,
      })),
      asks: [...asks.entries()].map(([group, items]) => ({ group, items: items.size })),
    };
  });

  // Whether a size actually catches every dish it is meant to, said before a
  // Friday rather than after one.
  const reach = new Map<string, Awaited<ReturnType<typeof choiceReach>>>();
  for (const coupon of coupons) {
    // Only where a choice has actually been ticked. Saying every dish offers
    // it when none was asked for is an answer to a question nobody put.
    if (choiceSets(coupon.required_choice ?? "").length > 0) {
      // The same rule the pricing uses: named dishes win over a section.
      const covered =
        coupon.dishes.length > 0
          ? coupon.dishes.map((dish) => dish.id)
          : menu.flatMap((place) =>
              place.items
                .filter((item) =>
                  coupon.sections.some((section) => section.id === item.categoryId)
                )
                .map((item) => item.id)
            );
      reach.set(coupon.code, await choiceReach([...new Set(covered)], coupon.required_choice));
    }
  }

  // One bundle for the form, whether it is making an offer or changing one.
  const formData: CouponFormData = {
    shops,
    dishes,
    runs: runs.map((run) => ({
      id: run.id,
      label: `${runDateLabel(run.run_date)} · ${SLOT_LABEL[run.slot]}`,
    })),
  };

  return (
    <div>
      <PageHeader
        title="Offers"
        detail="Free delivery on a dish, a set price on a kitchen, or a code for a group chat."
        actions={
          <Link
            href={making ? "/admin/coupons" : "/admin/coupons?new=1"}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            {making ? "Close" : "New offer"}
          </Link>
        }
      />

      {making && (
        <section className="card mb-4 space-y-3">
          <div>
            <h2 className="font-bold">A new offer</h2>
            <p className="text-sm text-muted">
              Pick what kind it is and it asks only that kind&apos;s questions.
              Everything here saves together.
            </p>
          </div>
          <CouponForm values={null} data={formData} />
        </section>
      )}

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
                    {(() => {
                      const asked = choiceLabels(coupon.required_choice ?? "")
                        .map((set) => set.join(" or "))
                        .join(", and ");
                      const found = reach.get(coupon.code)!;
                      return found.missing.length === 0
                        ? `${asked}: all ${found.of} of the dishes it covers offer it.`
                        : `${asked}: ${found.matched} of ${found.of} dishes offer it. Not on: ${found.missing
                            .slice(0, 4)
                            .join(", ")}.`;
                    })()}
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
                <CouponForm values={valuesOf(coupon)} data={formData} />
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

    </div>
  );
}

/** An offer as the form wants it: flat, and without the shapes it never uses. */
function valuesOf(coupon: Awaited<ReturnType<typeof listCoupons>>[number]): CouponFormValues {
  return {
    code: coupon.code,
    applies_to: coupon.applies_to,
    amount: coupon.amount,
    note: coupon.note,
    active: coupon.active,
    first_order_only: coupon.first_order_only,
    expires_at: coupon.expires_at,
    max_uses: coupon.max_uses,
    included_items: coupon.included_items,
    extra_per_item: coupon.extra_per_item ?? 0,
    min_per_person: coupon.min_per_person ?? 0,
    required_choice: coupon.required_choice ?? "",
    sameDay: coupon.same_day ?? false,
    runs: coupon.runs.map((run) => run.batchId),
    places: coupon.places.map((place) => place.id),
    sections: coupon.sections.map((one) => one.id),
    dishes: coupon.dishes.map((one) => one.id),
  };
}
