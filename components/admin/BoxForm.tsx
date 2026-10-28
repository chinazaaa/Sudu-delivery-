"use client";

import { useActionState } from "react";

import { saveBox, type SaveState } from "@/app/admin/occasions/actions";
import BoxLines from "./BoxLines";
import PhotoField from "./PhotoField";
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

  // Unique on the page, because every box on a shelf draws one of these
  // forms and a label pointing at a field in somebody else's box is worse
  // than no label at all.
  const photoId = `box_photo_${box?.id ?? "new"}`;
  const picture = box?.image_url ?? "";

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

      {/*
          The picture.

          Both of these forms already carried the image through as a hidden
          field and the save already accepted one, but there was nowhere to
          choose a file: the box went up with no picture and no way to add
          one. A hamper is bought on its photograph more than on its list.
      */}
      <div>
        <label className="label" htmlFor={photoId}>Picture</label>
        <div className="flex items-start gap-3">
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picture}
              alt=""
              className="size-20 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-xl bg-black/5 text-center text-[11px] leading-tight text-muted">
              No picture
            </span>
          )}
          <div className="min-w-0 flex-1">
            <PhotoField id={photoId} name="photo" />
            <p className="mt-1 text-xs text-muted">
              Straight off the phone is fine. It is shrunk here before it
              goes up. Leave it empty to keep the one that is there.
            </p>
            {picture !== "" && (
              <label className="mt-1.5 flex items-center gap-2 text-xs">
                <input type="checkbox" name="remove_photo" />
                Take the picture off
              </label>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="label">What is in it</p>
        <BoxLines catalogue={catalogue} start={box?.lines ?? []} />
      </div>

      <div>
        <label className="label">Delivery</label>
        <input
          name="run_fee"
          inputMode="numeric"
          defaultValue={box?.run_fee ?? 4000}
          className="field"
        />
      </div>
      <p className="text-xs text-muted">
        One flat price, whatever is in the box. The ladder would count eight
        containers as eight thousand and there would be no box to sell.
      </p>
      {/* The sum, said out loud. Somebody filling this in is choosing the
          price on the shelf and had no way of knowing what it would be. */}
      <p className="text-xs text-muted">
        What the customer pays is the food above <strong>plus</strong> this,
        and that is what the shelf quotes. Never set it below{" "}
        <strong>₦4,000</strong>: a box that charges less for delivery than the
        car costs loses money on every one sold. Anything with Uncle Stan&apos;s
        in it is <strong>₦7,000</strong>, because Ikoyi is its own trip.
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
