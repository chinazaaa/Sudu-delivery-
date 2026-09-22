"use client";

import { useActionState } from "react";
import SaveButton from "@/components/SaveButton";

/**
 * Agreeing when a parcel goes, and by when it has to be paid for.
 *
 * The sender asks for a day; this is the shop saying whether that day works.
 * Until it is set the order tells them the day is not agreed yet, which is
 * the truth and is better than promising the day they happened to order on.
 */
export default function ParcelDay({
  orderId,
  wantedOn,
  runDate,
  cutOffTime,
  agreed,
  joining,
  action,
}: {
  orderId: string;
  /** The day they asked for, which is what this is answering. */
  wantedOn: string;
  runDate: string;
  cutOffTime: string;
  agreed: boolean;
  /** The day a trip is already going on this route, if one is. Agreeing that
   *  day puts this parcel on that trip rather than standing up a second car
   *  to the same place. */
  joining: string;
  action: (
    prev: { done: string; error: string },
    form: FormData
  ) => Promise<{ done: string; error: string }>;
}) {
  const [state, act, busy] = useActionState(action, { done: "", error: "" });

  return (
    <form action={act} className="card space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <div>
        <h2 className="font-bold">
          {agreed ? "The day it goes" : "Agree the day"}
        </h2>
        <p className="text-sm text-muted">
          {wantedOn
            ? `They asked for ${wantedOn}.`
            : "They did not ask for a particular day."}{" "}
          {agreed
            ? "Changing it here changes what they see."
            : "Until you set this, their page says the day is not agreed yet."}
          {joining !== "" && (
            <>
              {" "}
              <span className="font-semibold text-brand-dark">
                A trip is already going that route on {joining}. Agreeing that
                day puts this parcel on it, one drive rather than two.
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor="parcel-day">
            It goes
          </label>
          <input
            id="parcel-day"
            name="run_date"
            type="date"
            defaultValue={agreed ? runDate : wantedOn || runDate}
            className="field py-2 text-sm"
          />
        </div>
        <div>
          <label className="label" htmlFor="parcel-cut">
            Paid for by
          </label>
          <input
            id="parcel-cut"
            name="cut_off_time"
            type="time"
            defaultValue={cutOffTime}
            className="field py-2 text-sm"
          />
        </div>
        <SaveButton quiet className="px-4 py-2 text-sm">
          {busy ? "Saving…" : agreed ? "Change it" : "Agree it"}
        </SaveButton>
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
    </form>
  );
}
