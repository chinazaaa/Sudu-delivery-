"use client";

import { useActionState, useState } from "react";
import { rateOrder, type RatingState } from "@/app/actions";

const WORDS = ["", "Bad", "Not great", "Fine", "Good", "Perfect"];

/**
 * Five stars and a line, on a delivered order.
 *
 * The stars are the whole question. The box underneath is optional and only
 * opens once a star is picked, because asking somebody to write something
 * before they have said anything is how you get no answers at all.
 */
export default function RateOrder({
  orderId,
  rating,
  feedback,
}: {
  orderId: string;
  /** What they said last time, if they have already answered. */
  rating: number | null;
  feedback: string;
}) {
  const [state, action, pending] = useActionState<RatingState, FormData>(rateOrder, {
    error: null,
    saved: false,
  });

  const [chosen, setChosen] = useState(rating ?? 0);
  const answered = (rating !== null && rating > 0) || state.saved;

  return (
    <form action={action} className="card space-y-3">
      <div>
        <h2 className="font-bold">{answered ? "Thank you" : "How was it?"}</h2>
        <p className="text-sm text-muted">
          {answered
            ? "Change it any time. We read every one of these."
            : "One tap. It tells us whether to keep using a restaurant."}
        </p>
      </div>

      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="rating" value={chosen} />

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setChosen(star)}
            aria-label={`${star} out of 5`}
            aria-pressed={chosen === star}
            className={`text-3xl leading-none transition ${
              star <= chosen ? "text-brand" : "text-black/15 hover:text-black/25"
            }`}
          >
            ★
          </button>
        ))}
        {chosen > 0 && (
          <span className="ml-2 text-sm font-semibold text-muted">{WORDS[chosen]}</span>
        )}
      </div>

      {chosen > 0 && (
        <>
          <div>
            <label className="label" htmlFor="feedback">
              Anything you want to tell us? Optional
            </label>
            <textarea
              id="feedback"
              name="feedback"
              rows={2}
              maxLength={500}
              defaultValue={feedback}
              placeholder="Cold by the time it arrived, or the wrap was perfect."
              className="field"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Sending…" : answered ? "Change my answer" : "Send"}
          </button>
        </>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-lg bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
          Got it. Thank you.
        </p>
      )}
    </form>
  );
}
