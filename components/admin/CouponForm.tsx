import SaveButton from "@/components/SaveButton";
import DishPicker from "@/components/admin/DishPicker";
import MenuScope, { type ScopeShop } from "@/components/admin/MenuScope";
import { saveCoupon } from "@/app/admin/actions";
import { naira } from "@/lib/money";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import type { CouponWithRuns } from "@/lib/coupons";

export type CouponFormData = {
  shops: ScopeShop[];
  dishes: { id: string; name: string; restaurant: string }[];
  runs: { id: string; run_date: string; slot: "afternoon" | "night" }[];
  windows: { from: number; label: string }[];
};

/**
 * One offer, on one form, with one save.
 *
 * It used to be four forms side by side, each with its own button, so filling
 * in three things and pressing one Save quietly threw away the other two.
 * There is nothing to understand about that, only something to be caught out
 * by, so the whole offer is written at once.
 */
export default function CouponForm({
  coupon,
  data,
}: {
  /** The offer being changed, or nothing when one is being made. */
  coupon: CouponWithRuns | null;
  data: CouponFormData;
}) {
  const { shops, dishes, runs, windows } = data;
  const editing = coupon !== null;
  const id = (field: string) => `${field}-${coupon?.code ?? "new"}`;

  return (
    <form action={saveCoupon} className="space-y-4">
      {editing && <input type="hidden" name="editing" value="1" />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={id("code")}>Code</label>
          <input
            id={id("code")}
            name="code"
            defaultValue={coupon?.code ?? ""}
            readOnly={editing}
            placeholder="FREEBBQ"
            autoCapitalize="characters"
            className={`field uppercase ${editing ? "bg-black/[0.03] text-muted" : ""}`}
          />
          <p className="mt-1 text-xs text-muted">
            A name so you can find it. Nobody types it for an offer that
            applies by itself.
          </p>
        </div>

        <div>
          <label className="label" htmlFor={id("applies_to")}>What it does</label>
          <select
            id={id("applies_to")}
            name="applies_to"
            defaultValue={coupon?.applies_to ?? "fee"}
            className="field"
          >
            <option value="fee">Sets the delivery, nothing to type</option>
            <option value="delivery">Takes money off delivery, typed</option>
            <option value="order">Takes money off the order, typed</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor={id("amount")}>
            Delivery becomes, or money off
          </label>
          <input
            id={id("amount")}
            name="amount"
            inputMode="numeric"
            defaultValue={coupon ? String(coupon.amount) : ""}
            placeholder="2000"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            0 here, with the first option above, is free delivery.
          </p>
        </div>

        <div>
          <label className="label" htmlFor={id("note")}>Note to yourself</label>
          <input
            id={id("note")}
            name="note"
            defaultValue={coupon?.note ?? ""}
            placeholder="Free delivery on the BBQ mediums"
            className="field"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor={id("included_items")}>
            Items that price covers
          </label>
          <input
            id={id("included_items")}
            name="included_items"
            inputMode="numeric"
            defaultValue={coupon?.included_items ? String(coupon.included_items) : ""}
            placeholder="Any"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor={id("extra_per_item")}>
            And each item after
          </label>
          <input
            id={id("extra_per_item")}
            name="extra_per_item"
            inputMode="numeric"
            defaultValue={coupon?.extra_per_item ? String(coupon.extra_per_item) : ""}
            placeholder="0"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor={id("min_per_person")}>
            Least each, in a group
          </label>
          <input
            id={id("min_per_person")}
            name="min_per_person"
            inputMode="numeric"
            defaultValue={coupon?.min_per_person ? String(coupon.min_per_person) : ""}
            placeholder="0"
            className="field"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">
        {naira(2000)} covering 3 items, then {naira(500)} each, is{" "}
        {naira(3000)} for five. A group splits it, never below the last box.
      </p>

      <div>
        <p className="label">What it covers</p>
        <MenuScope
          shops={shops}
          restaurant={coupon?.places[0]?.id ?? ""}
          categories={coupon?.sections.map((one) => one.id) ?? []}
          choice={coupon?.required_choice ?? ""}
        />
      </div>

      {dishes.length > 0 && (
        <div>
          <p className="label">Or particular dishes</p>
          <DishPicker menu={dishes} chosen={coupon?.dishes.map((one) => one.id) ?? []} />
          <p className="mt-1 text-xs text-muted">
            Instead of a whole section: these dishes and nothing else. Two of
            them together still counts.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={id("expires_at")}>Last day</label>
          <input
            id={id("expires_at")}
            name="expires_at"
            type="date"
            defaultValue={coupon?.expires_at ? coupon.expires_at.slice(0, 10) : ""}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor={id("max_uses")}>
            How many orders it is good for
          </label>
          <input
            id={id("max_uses")}
            name="max_uses"
            inputMode="numeric"
            defaultValue={coupon?.max_uses ? String(coupon.max_uses) : ""}
            placeholder="No limit"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Your boot, really. It stops itself once it is hit.
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
                <input
                  type="checkbox"
                  name="batch_id"
                  value={run.id}
                  defaultChecked={coupon?.runs.some((one) => one.batchId === run.id)}
                />
                {runDateLabel(run.run_date)} · {SLOT_LABEL[run.slot]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Tick none and it is every run.</p>
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
                <input
                  type="checkbox"
                  name="window"
                  value={window.from}
                  defaultChecked={(coupon?.windows ?? "")
                    .split(",")
                    .map((one) => one.trim())
                    .includes(String(window.from))}
                />
                {window.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            Tick none and it is good at any time. Runs are the row above.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} />
          Live
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="first_order_only"
            defaultChecked={coupon?.first_order_only ?? false}
          />
          First order only
        </label>
      </div>

      <SaveButton>{editing ? "Save this offer" : "Save the offer"}</SaveButton>
    </form>
  );
}
