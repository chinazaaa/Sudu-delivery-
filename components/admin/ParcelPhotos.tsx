"use client";

import { useActionState } from "react";
import SaveButton from "@/components/SaveButton";
import ConfirmRemove from "./ConfirmRemove";
import { PHOTO_LABEL, type ParcelPhoto } from "@/lib/parcels";

/**
 * Photographing a parcel at the counter and at the door.
 *
 * Two lists rather than one, because the question is never "is there a
 * photograph" but "what did it look like when we took it, and when we gave
 * it back". A gap on one side is a gap worth seeing.
 */
export default function ParcelPhotos({
  orderId,
  photos,
  add,
  remove,
}: {
  orderId: string;
  photos: ParcelPhoto[];
  add: (
    prev: { done: string; error: string },
    form: FormData
  ) => Promise<{ done: string; error: string }>;
  remove: (form: FormData) => Promise<void>;
}) {
  const [state, action, busy] = useActionState(add, { done: "", error: "" });

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-bold">Photographs</h2>
        <p className="text-sm text-muted">
          One at the counter, one at the door. Five seconds each, and the
          &quot;it arrived damaged&quot; argument is over before it starts.
        </p>
      </div>

      {(["collected", "handed"] as const).map((kind) => {
        const shown = photos.filter((one) => one.kind === kind);
        return (
          <div key={kind} className="rounded-xl border border-black/10 p-3">
            <p className="font-semibold">{PHOTO_LABEL[kind]}</p>

            {shown.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nothing yet.</p>
            ) : (
              <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {shown.map((photo) => (
                  <li key={photo.id} className="space-y-1">
                    <a href={photo.url} target="_blank" rel="noopener noreferrer">
                      {/* Plain img: these are photographs of a bag taken on a
                          phone, not part of the design. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.note || PHOTO_LABEL[kind]}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    </a>
                    {photo.note && (
                      <p className="text-xs text-muted">{photo.note}</p>
                    )}
                    <form action={remove}>
                      <ConfirmRemove
                        id={photo.id}
                        field="photo_id"
                        action={remove}
                      />
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form action={action} className="mt-2 space-y-2">
              <input type="hidden" name="order_id" value={orderId} />
              <input type="hidden" name="kind" value={kind} />
              <input
                type="file"
                name="photo"
                accept="image/*"
                capture="environment"
                className="field py-2 text-sm"
              />
              <input
                name="note"
                placeholder="Sealed, handed to the porter"
                className="field py-2 text-sm"
              />
              <SaveButton quiet className="px-4 py-2 text-sm">
                {busy ? "Saving…" : "Add it"}
              </SaveButton>
            </form>
          </div>
        );
      })}

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
    </section>
  );
}
