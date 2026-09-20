"use client";

import { useState } from "react";
import { naira } from "@/lib/money";
import { saveLink } from "@/app/admin/actions";

type Dish = { id: string; name: string; restaurant: string; price: number };

/**
 * Making a link to send.
 *
 * A search rather than a wall of checkboxes: a hundred and fifty dishes are
 * on the menu and whoever is making this already has one in mind. What is
 * picked stays on screen whatever is typed, or saving after a search would
 * quietly drop everything the search hid.
 */
export default function LinkBuilder({
  dishes,
  runs,
  slots,
}: {
  dishes: Dish[];
  runs: { id: string; label: string }[];
  slots: { at: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ id: string; qty: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState(false);

  const needle = query.trim().toLowerCase();
  const found =
    needle.length < 2
      ? []
      : dishes
          .filter(
            (dish) =>
              !picked.some((one) => one.id === dish.id) &&
              (dish.name.toLowerCase().includes(needle) ||
                dish.restaurant.toLowerCase().includes(needle))
          )
          .slice(0, 8);

  const named = (id: string) => dishes.find((dish) => dish.id === id);
  const food = picked.reduce(
    (sum, one) => sum + (named(one.id)?.price ?? 0) * one.qty,
    0
  );

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-5">
        Make a link
      </button>
    );
  }

  return (
    <form
      action={async (form: FormData) => {
        setProblem("");
        setDone(false);
        setBusy(true);
        try {
          const result = await saveLink(form);
          if (!result.ok) {
            setProblem(result.error ?? "Could not save that.");
            return;
          }
          setPicked([]);
          setQuery("");
          setDone(true);
        } finally {
          setBusy(false);
        }
      }}
      className="card space-y-4"
    >
      <div>
        <label className="label" htmlFor="label">
          What is it for
        </label>
        <input
          id="label"
          name="label"
          placeholder="Domino's meatball, Friday"
          className="field"
        />
        <p className="mt-1 text-xs text-muted">
          Only you see this. It is how you find the link again next week.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="dish">
          The food
        </label>
        <input
          id="dish"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Start typing a dish or a restaurant"
          className="field"
        />

        {found.length > 0 && (
          <ul className="mt-2 space-y-1">
            {found.map((dish) => (
              <li key={dish.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked((was) => [...was, { id: dish.id, qty: 1 }]);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-left text-sm"
                >
                  <span>
                    <span className="font-semibold">{dish.name}</span>
                    <span className="block text-xs text-muted">{dish.restaurant}</span>
                  </span>
                  <span className="font-bold">{naira(dish.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {picked.length > 0 && (
          <ul className="mt-3 space-y-2">
            {picked.map((one) => {
              const dish = named(one.id);
              if (!dish) return null;
              return (
                <li
                  key={one.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-shell px-3 py-2 text-sm"
                >
                  <input type="hidden" name="item_id" value={one.id} />
                  <input type="hidden" name={`qty_${one.id}`} value={one.qty} />
                  <span className="min-w-0">
                    <span className="font-semibold">{dish.name}</span>
                    <span className="block text-xs text-muted">{dish.restaurant}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPicked((was) =>
                          was.map((item) =>
                            item.id === one.id
                              ? { ...item, qty: Math.max(1, item.qty - 1) }
                              : item
                          )
                        )
                      }
                      className="size-7 rounded-full border border-black/10"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold">{one.qty}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPicked((was) =>
                          was.map((item) =>
                            item.id === one.id ? { ...item, qty: item.qty + 1 } : item
                          )
                        )
                      }
                      className="size-7 rounded-full border border-black/10"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPicked((was) => was.filter((item) => item.id !== one.id))
                      }
                      className="text-xs font-semibold text-muted"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {picked.length > 0 && (
          <p className="mt-2 text-sm font-bold">Food: {naira(food)}</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="when">
          When does it go
        </label>
        <select id="when" name="when" className="field" defaultValue="">
          <option value="">Whichever run is open when they tap it</option>
          {slots.length > 0 && (
            <optgroup label="A car of its own">
              {slots.map((slot) => (
                <option key={slot.at} value={slot.at}>
                  {slot.label}
                </option>
              ))}
            </optgroup>
          )}
          {runs.length > 0 && (
            <optgroup label="On a run">
              {runs.map((run) => (
                <option key={run.id} value={`run:${run.id}`}>
                  {run.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fee">
            Delivery on this one
          </label>
          <input
            id="fee"
            name="fee"
            inputMode="numeric"
            placeholder="Leave empty for the usual"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Empty leaves the bands and whatever offer is on. A number here is
            what they pay, and 0 means free.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="coupon">
            Code applied for them
          </label>
          <input id="coupon" name="coupon" placeholder="Optional" className="field" />
          <p className="mt-1 text-xs text-muted">
            Nobody has to be told to type it. One offer applies at a time, so a
            code on food a promotion already prices is refused.
          </p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="payment_link">
          Card link
        </label>
        <input
          id="payment_link"
          name="payment_link"
          placeholder="Optional. Paste the payment link"
          className="field"
        />
        <p className="mt-1 text-xs text-muted">
          Goes onto the order when somebody picks card, so they pay without
          messaging you.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="note">
          A line for them
        </label>
        <input
          id="note"
          name="note"
          placeholder="Optional. Shows above the basket"
          className="field"
        />
      </div>

      {problem !== "" && <p className="text-sm font-semibold text-brand-dark">{problem}</p>}
      {done && (
        <p className="text-sm font-semibold text-mint">
          Made. It is in the list below, with the address to copy.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy || picked.length === 0} className="btn-primary px-5">
          {busy ? "Saving…" : "Make the link"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-semibold text-muted"
        >
          Not now
        </button>
      </div>
    </form>
  );
}
