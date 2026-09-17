import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import { couponLabel, listCoupons } from "@/lib/coupons";
import { naira } from "@/lib/money";
import { deleteCoupon, saveCoupon, toggleCoupon } from "../actions";

export const dynamic = "force-dynamic";

export default async function CouponsAdmin() {
  const coupons = await listCoupons();

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
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <form action={toggleCoupon}>
                <input type="hidden" name="code" value={coupon.code} />
                <input type="hidden" name="active" value={String(!coupon.active)} />
                <ActionButton done="Done ✓">
                  {coupon.active ? "Switch it off" : "Switch it on"}
                </ActionButton>
              </form>
              <form action={deleteCoupon}>
                <input type="hidden" name="code" value={coupon.code} />
                <ActionButton
                  className="chip border-black/10 bg-white text-brand"
                  done="Deleted ✓"
                >
                  Delete
                </ActionButton>
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
            <label className="label" htmlFor="applies_to">Comes off</label>
            <select id="applies_to" name="applies_to" className="field" defaultValue="delivery">
              <option value="delivery">Delivery</option>
              <option value="order">The whole order</option>
            </select>
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
            <label className="label" htmlFor="max_uses">How many uses (optional)</label>
            <input
              id="max_uses"
              name="max_uses"
              inputMode="numeric"
              placeholder="No limit"
              className="field"
            />
          </div>
        </div>

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
