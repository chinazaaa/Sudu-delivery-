import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ActionButton from "@/components/admin/ActionButton";
import { couponLabel, listCoupons } from "@/lib/coupons";
import { naira } from "@/lib/money";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import { deleteCoupon, saveCoupon, setCouponRuns, toggleCoupon } from "../actions";
import { batchOverview } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function CouponsAdmin() {
  const coupons = await listCoupons();
  // Only runs still ahead are worth attaching a code to.
  const runs = (await batchOverview()).filter(
    (run) => new Date(run.cut_off_at).getTime() > Date.now()
  );

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
              {" · "}
              {coupon.runs.length === 0
                ? "any run"
                : coupon.runs.map((run) => run.label).join(", ")}
            </p>

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
