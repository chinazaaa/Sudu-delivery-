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
  sameDay: boolean;
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
  const { shops, dishes, runs } = data;
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

  const [pickedRuns, setPickedRuns] = useState<string[]>(values?.runs ?? []);
  const [onSameDay, setOnSameDay] = useState(values?.sameDay ?? false);

  const toggle = (value: string, list: string[], set: (next: string[]) => void) =>
    set(list.includes(value) ? list.filter((one) => one !== value) : [...list, value]);

  const id = (field: string) => `${field}-${values?.code ?? "new"}`;
  const money = (value: number | null) => (value ? String(value) : "");

  // Free delivery is a set price of nothing, so it asks the same questions
  // minus the price.
  const sets = kind !== "code";

  return (
    <form action={saveCoupon} className="space-y-4">
      {editing && <input type="hidden" name="editing" value="1" />}

      <div>
        {/* The board numbers the three questions, because on a phone only
            one of them is on the screen at a time and the count is what
            says how much of this is left. */}
        <p className="ticket mb-1.5 text-muted">1 · What kind</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {KINDS.map((one) => (
            <button
              key={one.value}
              type="button"
              onClick={() => setKind(one.value)}
              className={`min-h-[56px] rounded-[13px] p-3.5 text-left transition ${
                kind === one.value
                  ? "border-2 border-brand bg-brand-tint"
                  : "border-[1.5px] border-line bg-paper hover:border-ink/20"
              }`}
            >
              <span className="block text-[15px] font-bold">{one.label}</span>
              <span className="hint mt-0.5 block">{one.detail}</span>
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

      <p className="ticket -mb-1.5 text-muted">2 · What it is, and what it covers</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={id("code")}>
            {sets ? "A name for it, so you can find it later" : "The code they type"}
          </label>
          <input
            id={id("code")}
            name="code"
            defaultValue={values?.code ?? ""}
            readOnly={editing}
            placeholder={sets ? "BBQFREE" : "SUDU500"}
            autoCapitalize="characters"
            className={`field field-admin uppercase ${editing ? "bg-wash text-muted" : ""}`}
          />
          {sets && <p className="hint mt-1">Nobody types this one.</p>}
        </div>

        <div>
          <label className="label" htmlFor={id("note")}>
            Note to yourself
          </label>
          <input
            id={id("note")}
            name="note"
            defaultValue={values?.note ?? ""}
            placeholder={
              kind === "free" ? "Free delivery on the BBQ mediums" : "Exam week push"
            }
            className="field field-admin"
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
              className="field field-admin"
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
                className="field field-admin"
              />
            </div>
            <div>
              <label className="label" htmlFor={id("applies_to")}>Comes off</label>
              <select
                id={id("applies_to")}
                name="applies_to"
                defaultValue={values?.applies_to === "order" ? "order" : "delivery"}
                className="field field-admin"
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
                className="field field-admin"
              />
              <p className="hint mt-1">
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
                className="field field-admin"
              />
              <p className="hint mt-1">
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
                className="field field-admin"
              />
              <p className="hint mt-1">
                A group splits this price. This is the floor each of them
                reaches and stops at.
              </p>
            </div>
          </div>
          <p className="soft -mt-2 border-volt-line bg-brand-tint px-3 py-2.5 text-[13px] leading-[1.5]">
            <span className="font-bold">For example.</span> {naira(2000)}{" "}
            covering 3 items, {naira(500)} each after, floor {naira(1000)}: one
            person ordering five things pays {naira(3000)}. Five people sharing
            pay {naira(1000)} each.
          </p>
        </>
      )}

      <div>
        <p className="label">Which kitchens, and which part of the menu</p>
        <MenuScope
          shops={shops}
          restaurants={values?.places ?? []}
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
          <p className="hint mt-1">
            Instead of a section, not as well as one: pick any dishes here and
            they are the whole offer, whatever is ticked above. Two of them
            together still counts.
          </p>
        </div>
      )}

      <p className="ticket -mb-1.5 text-muted">3 · When it runs</p>

      {runs.length > 0 && (
        <div>
          <p className="label">Which runs</p>
          {/* Scrolling sideways on a phone: a term's worth of runs wrapped
              is half a screen of pills above the boxes that follow. */}
          <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-1.5 sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
            {pickedRuns.map((id) => (
              <input key={id} type="hidden" name="batch_id" value={id} />
            ))}
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => toggle(run.id, pickedRuns, setPickedRuns)}
                className={`pill-admin min-h-[36px] shrink-0 text-[13px] sm:min-h-[38px] sm:text-sm ${
                  pickedRuns.includes(run.id) ? "pill-admin-on" : ""
                }`}
              >
                {run.label}
              </button>
            ))}
          </div>
          <p className="hint mt-1">Pick none and it is every run.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={id("expires_at")}>
            Last day
          </label>
          <input
            id={id("expires_at")}
            name="expires_at"
            type="date"
            defaultValue={values?.expires_at ? values.expires_at.slice(0, 10) : ""}
            className="field field-admin"
          />
          <p className="hint mt-1">Blank and it runs until you switch it off.</p>
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
            className="field field-admin"
          />
          <p className="hint mt-1">
            {sets ? "Your boot, really. It stops itself once it is hit." : "Then it stops."}
          </p>
        </div>
      </div>

      {/* A car somebody has to themselves costs what it costs. An offer built
          for a shared run does not cover one, so it only reaches same day
          when it is asked to. */}
      <div>
        <p className="label">Same day cars</p>
        <input type="hidden" name="same_day" value={onSameDay ? "on" : ""} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOnSameDay(false)}
            className={`pill-admin ${!onSameDay ? "pill-admin-on" : ""}`}
          >
            Runs only
          </button>
          <button
            type="button"
            onClick={() => setOnSameDay(true)}
            className={`pill-admin ${onSameDay ? "pill-admin-on" : ""}`}
          >
            Also on same day
          </button>
        </div>

        <p className="hint mt-1">
          {onSameDay
            ? "When you can go is already set by your delivery hours. Worth knowing: a same day car is one trip for one person, so a flat price can cost you more than it brings."
            : "It applies on runs and never on a car somebody has to themselves."}
        </p>
      </div>

      {/* Two tick rows at the board's forty-six pixels rather than two
          checkboxes on one line: on a phone the pair on one line gave each
          of them half a thumb. */}
      <div>
        <label className="flex min-h-[46px] items-center gap-2.5 border-t-[1.5px] border-rule text-sm font-semibold">
          <input
            type="checkbox"
            name="active"
            defaultChecked={values?.active ?? true}
            className="size-[19px] accent-brand"
          />
          <span className="flex-1">Live, from the moment it saves</span>
        </label>
        <label className="flex min-h-[46px] items-center gap-2.5 border-t-[1.5px] border-rule text-sm font-semibold">
          <input
            type="checkbox"
            name="first_order_only"
            defaultChecked={values?.first_order_only ?? false}
            className="size-[19px] accent-brand"
          />
          <span className="flex-1">First order only</span>
        </label>
      </div>

      {/* The offer in a sentence, from the three answers this form holds
          itself: what kind it is, which runs it is on, and whether it
          reaches a car somebody has to themselves. */}
      <p className="soft border-volt-line bg-brand-tint px-3.5 py-2.5 text-[14px] leading-[1.45]">
        <span className="ticket mb-1 block text-muted">This offer, in a sentence</span>
        <strong>{KINDS.find((one) => one.value === kind)?.label}</strong>, on{" "}
        <strong>
          {pickedRuns.length === 0
            ? "every run"
            : `${pickedRuns.length} picked run${pickedRuns.length === 1 ? "" : "s"}`}
        </strong>
        , {onSameDay ? "and on a car somebody has to themselves" : "and never on a same day car"}.
      </p>

      {/* In the page on a desk, where the mouse is already on the form; on
          the bar at the bottom on a phone, which is the board. Only for the
          offer being made: the editor inside a card is one of however many
          offers there are, and that many fixed bars would stand on each
          other. */}
      <div className={editing ? "" : "hidden lg:block"}>
        <SaveButton look="btn-admin-go">
          {editing ? "Save this offer" : "Save the offer"}
        </SaveButton>
      </div>
      {!editing && (
        <div className="phone-bar">
          <SaveButton look="btn-admin-go" className="min-h-[52px] w-full text-base">
            Save the offer
          </SaveButton>
        </div>
      )}
    </form>
  );
}
