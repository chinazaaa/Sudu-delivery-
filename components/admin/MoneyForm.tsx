"use client";

import { useState } from "react";
import SaveButton from "@/components/SaveButton";
import { COST_KINDS } from "@/lib/other-money";

/**
 * A line of money that did not come through a run, in or out.
 *
 * Two different jobs wearing one form. An errand is somebody paying us and
 * us paying a counter; a Supabase bill is only ever money leaving. Asking
 * "how many" and "who for" about a hosting invoice is how somebody decides
 * the page is not for that and goes back to doing it in their head.
 *
 * So the form asks which it is first and then asks for what that actually
 * needs. Same action, same table underneath: an expense is a line with
 * nothing coming in, which is what it is.
 */
export default function MoneyForm({
  action,
  today,
}: {
  action: (form: FormData) => Promise<void>;
  today: string;
}) {
  const [out, setOut] = useState(false);

  return (
    <form action={action} className="card mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOut(false)}
          className={`chip text-sm ${
            !out ? "border-brand bg-brand-tint font-bold text-brand-dark" : ""
          }`}
        >
          Somebody paid us
        </button>
        <button
          type="button"
          onClick={() => setOut(true)}
          className={`chip text-sm ${
            out ? "border-brand bg-brand-tint font-bold text-brand-dark" : ""
          }`}
        >
          We paid something out
        </button>
      </div>

      <div>
        <label className="label" htmlFor="what">
          What was it
        </label>
        <input
          id="what"
          name="what"
          required
          placeholder={
            out ? "Supabase, October" : "Found an adapter and dropped it off"
          }
          className="field"
        />
      </div>

      {!out && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="how_many">
                How many
              </label>
              <input
                id="how_many"
                name="how_many"
                inputMode="numeric"
                defaultValue="1"
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="took">
                Price each
              </label>
              <input
                id="took"
                name="took"
                inputMode="numeric"
                placeholder="20000"
                className="field"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="fee">
              Delivery
            </label>
            <input
              id="fee"
              name="fee"
              inputMode="numeric"
              placeholder="0"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              What they paid to have it brought.
            </p>
          </div>
        </div>
      )}

      {out && (
        <div>
          <label className="label" htmlFor="kind">
            What kind of cost
          </label>
          <input
            id="kind"
            name="kind"
            list="cost-kinds"
            placeholder="Software, hosting, bank charges…"
            className="field"
          />
          <datalist id="cost-kinds">
            {COST_KINDS.map((one) => (
              <option key={one} value={one} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-muted">
            So a month of outgoings groups itself. Type your own if none fit.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="spent">
            {out ? "What it cost" : "Cost, in all"}
          </label>
          <input
            id="spent"
            name="spent"
            inputMode="numeric"
            placeholder="0"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            {out
              ? "The whole bill. It comes straight off the profit for the month it falls in."
              : "The whole amount you handed over, not the price of one. Leave it empty and all of it counts as profit."}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="happened_on">
            When
          </label>
          <input
            id="happened_on"
            name="happened_on"
            type="date"
            defaultValue={today}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            {out
              ? "The month it belongs to. Put last month's bill on last month."
              : "The day the work happened, not the day you are writing it down."}
          </p>
        </div>
      </div>

      {!out && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="who">
              Who for
            </label>
            <input
              id="who"
              name="who"
              placeholder="A name, if it is worth remembering"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Their number
            </label>
            <input
              id="phone"
              name="phone"
              inputMode="tel"
              placeholder="Ties it to their customer card"
              className="field"
            />
          </div>
        </div>
      )}

      <div>
        <label className="label" htmlFor="note">
          Anything else
        </label>
        <input id="note" name="note" className="field" />
      </div>

      <SaveButton>{out ? "Record what it cost" : "Add it"}</SaveButton>
    </form>
  );
}
