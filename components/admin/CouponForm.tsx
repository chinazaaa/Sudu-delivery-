"use client";

import { useState } from "react";
import SaveButton from "@/components/SaveButton";
import DishPicker from "@/components/admin/DishPicker";
import MenuScope, { type ScopeShop } from "@/components/admin/MenuScope";
import { saveCoupon } from "@/app/admin/actions";
import { naira } from "@/lib/money";

export type CouponFormData = {
  shops: ScopeShop[];
  dishes: { id: string; name: string; restaurant: string }[];
  runs: { id: string; label: string }[];
  windows: { from: number; label: string }[];
};

export type CouponFormValues = {
  code: string;
  applies_to: "delivery" | "order" | "fee";
  amount: number;
  note: string;
  active: boolean;
  first_order_only: boolean;
  expires_at: string | null;
  max_uses: number | null;
  included_items: number | null;
  extra_per_item: number;
  min_per_person: number;
  required_choice: string;
  windows: string;
  runs: string[];
  places: string[];
  sections: string[];
  dishes: string[];
};

/** Which of the three things this is. Everything else follows from it. */
type Kind = "free" | "flat" | "code";

const KINDS: { value: Kind; label: string; detail: string }[] = [
  {
    value: "free",
    label: "Free delivery",
    detail: "On something worth the trip on its own. Nothing to type.",
  },
  {
    value: "flat",
    label: "A set delivery price",
    detail: "Order from here and delivery is that, whatever the bands say.",
  },
  {
    value: "code",
    label: "A code people type",
    detail: "Money off, for a group chat. They have to type it.",
  },
];

/**
 * One offer, on one form, with one save.
 *
 * It asks what kind of thing this is first, and then only the questions that
 * kind has. Free delivery has no price to set and a typed code has no size to
 * match, so showing all of it at once was showing most people most of a form
 * they had no use for.
 */
export default function CouponForm({
  values,
  data,
}: {
  /** The offer being changed, or nothing when one is being made. */
  values: CouponFormValues | null;
  data: CouponFormData;
}) {
  const { shops, dishes, runs, windows } = data;
  const editing = values !== null;

  const [kind, setKind] = useState<Kind>(
    values === null
      ? "free"
      : values.applies_to !== "fee"
        ? "code"
        : values.amount === 0
          ? "free"
          : "flat"
  );

  const id = (field: string) => `${field}-${values?.code ?? "new"}`;
  const money = (value: number | null) => (value ? String(value) : "");

  // Free delivery is a set price of nothing, so it asks the same questions
  // minus the price.
  const sets = kind !== "code";

  return (
    <form action={saveCoupon} className="space-y-4">
      {editing && <input type="hidden" name="editing" value="1" />}

      <div>
        <p className="label">What kind of offer</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {KINDS.map((one) => (
            <button
              key={one.value}
              type="button"
              onClick={() => setKind(one.value)}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                kind === one.value
                  ? "border-brand bg-brand-tint"
                  : "border-black/10 bg-white hover:border-ink/20"
              }`}
            >
              <span className="block font-bold">{one.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{one.detail}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Free delivery is a price of nothing. Said here rather than asked. */}
      {kind === "free" && (
        <>
          <input type="hidden" name="applies_to" value="fee" />
          <input type="hidden" name="amount" value="0" />
        </>
      )}
      {kind === "flat" && <input type="hidden" name="applies_to" value="fee" />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={id("code")}>
            {sets ? "A name for it" : "The code they type"}
          </label>
          <input
            id={id("code")}
            name="code"
            defaultValue={values?.code ?? ""}
            readOnly={editing}
            placeholder={sets ? "BBQFREE" : "SUDU500"}
            autoCapitalize="characters"
            className={`field uppercase ${editing ? "bg-black/[0.03] text-muted" : ""}`}
          />
          {sets && (
            <p className="mt-1 text-xs text-muted">
              Just so you can find it later. Nobody types this one.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor={id("note")}>Note to yourself</label>
          <input
            id={id("note")}
            name="note"
            defaultValue={values?.note ?? ""}
            placeholder={
              kind === "free" ? "Free delivery on the BBQ mediums" : "Exam week push"
            }
            className="field"
          />
        </div>

        {kind === "flat" && (
          <div>
            <label className="label" htmlFor={id("amount")}>Delivery becomes</label>
            <input
              id={id("amount")}
              name="amount"
              inputMode="numeric"
              defaultValue={money(values?.amount ?? null)}
              placeholder="2000"
              className="field"
            />
          </div>
        )}

        {kind === "code" && (
          <>
            <div>
              <label className="label" htmlFor={id("amount")}>Worth</label>
              <input
                id={id("amount")}
                name="amount"
                inputMode="numeric"
                defaultValue={money(values?.amount ?? null)}
                placeholder="500"
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor={id("applies_to")}>Comes off</label>
              <select
                id={id("applies_to")}
                name="applies_to"
                defaultValue={values?.applies_to === "order" ? "order" : "delivery"}
                className="field"
              >
                <option value="delivery">Delivery</option>
                <option value="order">The whole order</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Only a set price has a load to price. Free is free however much of
          it there is, and a code is money off whatever the fee turned out. */}
      {kind === "flat" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor={id("included_items")}>
                How many items that covers
              </label>
              <input
                id={id("included_items")}
                name="included_items"
                inputMode="numeric"
                defaultValue={money(values?.included_items ?? null)}
                placeholder="Any"
                className="field"
              />
              <p className="mt-1 text-xs text-muted">
                Blank means any number, so one item and fifteen cost the same
                to deliver.
              </p>
            </div>
            <div>
              <label className="label" htmlFor={id("extra_per_item")}>
                What each extra item adds
              </label>
              <input
                id={id("extra_per_item")}
                name="extra_per_item"
                inputMode="numeric"
                defaultValue={money(values?.extra_per_item ?? null)}
                placeholder="0"
                className="field"
              />
              <p className="mt-1 text-xs text-muted">
                For every item past the box on the left. 0 keeps it flat.
              </p>
            </div>
            <div>
              <label className="label" htmlFor={id("min_per_person")}>
                Nobody pays less than
              </label>
              <input
                id={id("min_per_person")}
                name="min_per_person"
                inputMode="numeric"
                defaultValue={money(values?.min_per_person ?? null)}
                placeholder="0"
                className="field"
              />
              <p className="mt-1 text-xs text-muted">
                A group splits this price. This is the floor each of them
                reaches and stops at.
              </p>
            </div>
          </div>
          <p className="-mt-2 rounded-xl bg-shell px-3 py-2 text-xs text-ink/75">
            <span className="font-bold">For example.</span> {naira(2000)}{" "}
            covering 3 items, {naira(500)} each after, floor {naira(1000)}: one
            person ordering five things pays {naira(3000)}. Five people sharing
            pay {naira(1000)} each.
          </p>
        </>
      )}

      <div>
        <p className="label">What it covers</p>
        <MenuScope
          shops={shops}
          restaurant={values?.places[0] ?? ""}
          categories={values?.sections ?? []}
          choice={values?.required_choice ?? ""}
          sizes={sets}
        />
      </div>

      {/* A typed code is a deal with a kitchen, never with a dish: nobody
          types a code to get free delivery on one pizza, they just order it. */}
      {sets && dishes.length > 0 && (
        <div>
          <p className="label">Or particular dishes</p>
          <DishPicker menu={dishes} chosen={values?.dishes ?? []} />
          <p className="mt-1 text-xs text-muted">
            Instead of a section, not as well as one: pick any dishes here and
            they are the whole offer, whatever is ticked above. Two of them
            together still counts.
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
            defaultValue={values?.expires_at ? values.expires_at.slice(0, 10) : ""}
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
            defaultValue={money(values?.max_uses ?? null)}
            placeholder="No limit"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            {sets ? "Your boot, really. It stops itself once it is hit." : "Then it stops."}
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
                  defaultChecked={values?.runs.includes(run.id)}
                />
                {run.label}
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
                  defaultChecked={(values?.windows ?? "")
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
          <input type="checkbox" name="active" defaultChecked={values?.active ?? true} />
          Live
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="first_order_only"
            defaultChecked={values?.first_order_only ?? false}
          />
          First order only
        </label>
      </div>

      <SaveButton>{editing ? "Save this offer" : "Save the offer"}</SaveButton>
    </form>
  );
}
