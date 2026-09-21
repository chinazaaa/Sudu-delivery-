"use client";

import { useActionState } from "react";

import { saveBox, type SaveState } from "@/app/admin/occasions/actions";
import BoxLines from "./BoxLines";
import type { PickerRestaurant } from "@/lib/box-admin";
import type { BoxLine } from "@/lib/boxes";

/**
 * A box: what is in it, what it serves, and what delivery costs on it.
 *
 * The two fees are the whole point and are not a detail. The container
 * ladder would put a box for five at eight thousand and there would be
 * nothing left to sell, so a box says its own price and the shop carries
 * the difference on a car that was going anyway.
 */
export default function BoxForm({
  box,
  occasionId,
  catalogue,
}: {
  box?: {
    id: string;
    name: string;
    blurb: string;
    serves: string;
    run_fee: number;
    car_fee: number;
    is_extra: boolean;
    active: boolean;
    sort_order: number;
    image_url: string;
    lines: BoxLine[];
  };
  occasionId: string;
  catalogue: PickerRestaurant[];
}) {
  const [state, act, busy] = useActionState<SaveState, FormData>(saveBox, {
    done: "",
    error: "",
  });

  return (
    <form action={act} className="space-y-3">
      {box && <input type="hidden" name="id" value={box.id} />}
      <input type="hidden" name="occasion_id" value={occasionId} />
      <input type="hidden" name="image_url" value={box?.image_url ?? ""} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={box?.name} required className="field" />
        </div>
        <div>
          <label className="label">Feeds</label>
          <input
            name="serves"
            defaultValue={box?.serves}
            placeholder="4 to 5 people"
            className="field"
          />
        </div>
      </div>

      <div>
        <label className="label">One line under the name</label>
        <input name="blurb" defaultValue={box?.blurb} className="field" />
      </div>

      <div>
        <label className="label">Picture</label>
        <input type="file" name="photo" accept="image/*" className="field py-2" />
      </div>

      <div>
        <p className="label">What is in it</p>
        <BoxLines catalogue={catalogue} start={box?.lines ?? []} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Delivery on a run</label>
          <input
            name="run_fee"
            inputMode="numeric"
            defaultValue={box?.run_fee ?? 4000}
            className="field"
          />
        </div>
        <div>
          <label className="label">Delivery in a car of its own</label>
          <input
            name="car_fee"
            inputMode="numeric"
            defaultValue={box?.car_fee ?? 6500}
            className="field"
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        One flat price each way, whatever is in the box. The ladder would count
        eight containers as eight thousand and there would be no box to sell.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={box?.active ?? true} />
          On the website
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_extra" defaultChecked={box?.is_extra ?? false} />
          It is an extra, not a meal
        </label>
        <label className="flex items-center gap-2 text-sm">
          Order
          <input
            name="sort_order"
            inputMode="numeric"
            defaultValue={box?.sort_order ?? 100}
            className="field w-20 py-1.5 text-sm"
          />
        </label>
      </div>

      {state.error !== "" && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}
      {state.done !== "" && (
        <p className="rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
          {state.done}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary px-5">
        {busy ? "Saving…" : box ? "Save" : "Add the box"}
      </button>
    </form>
  );
}
