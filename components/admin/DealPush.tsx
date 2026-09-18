"use client";

import { useActionState, useState } from "react";
import { sendDealPush, type DealPushState } from "@/app/admin/actions";

type Restaurant = { id: string; name: string; categories: { id: string; name: string }[] };

/**
 * Writing one, and saying where it lands.
 *
 * The destination is a pair of dropdowns rather than a path, because a path
 * typed by hand is a path typed wrong, and a notification that opens the wrong
 * screen is worse than one nobody sent.
 */
export default function DealPush({ restaurants }: { restaurants: Restaurant[] }) {
  const [state, action, pending] = useActionState<DealPushState, FormData>(sendDealPush, {
    error: null,
    sent: null,
  });

  const [restaurant, setRestaurant] = useState("");
  const [category, setCategory] = useState("");
  const chosen = restaurants.find((one) => one.id === restaurant) ?? null;

  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          className="field"
          maxLength={80}
          placeholder="New deals at Domino's"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="body">The line underneath</label>
        <textarea
          id="body"
          name="body"
          rows={2}
          maxLength={180}
          className="field"
          placeholder="Two for one on large pizzas today. Tap to see them."
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="restaurant">Opens</label>
          <select
            id="restaurant"
            name="restaurant"
            className="field"
            value={restaurant}
            onChange={(event) => {
              setRestaurant(event.target.value);
              setCategory("");
            }}
          >
            <option value="">The shop, for anything about delivery or a code</option>
            {restaurants.map((one) => (
              <option key={one.id} value={one.id}>{one.name}</option>
            ))}
          </select>
        </div>

        {chosen && chosen.categories.length > 0 && (
          <div>
            <label className="label" htmlFor="category">Straight to</label>
            <select
              id="category"
              name="category"
              className="field"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">The whole menu</option>
              {chosen.categories.map((one) => (
                <option key={one.id} value={one.id}>{one.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Send it"}
      </button>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.sent !== null && !state.error && (
        <p className="rounded-lg bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
          Sent to {state.sent} phone{state.sent === 1 ? "" : "s"}.
        </p>
      )}
    </form>
  );
}
