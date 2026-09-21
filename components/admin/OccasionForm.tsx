"use client";

import { useActionState } from "react";

import { saveOccasion, type SaveState } from "@/app/admin/occasions/actions";

/**
 * Adding or changing an occasion.
 *
 * A time is typed as a day and an hour, because that is how anybody thinks
 * about a kick-off. Leaving both blank is the ordinary kind: no clock of its
 * own, and the customer picks a day from whatever is going.
 */
export default function OccasionForm({
  occasion,
  runs,
}: {
  occasion?: {
    id: string;
    slug: string;
    name: string;
    blurb: string;
    when_word: string;
    happens_at: string | null;
    closes_at: string | null;
    batch_id: string | null;
    image_url: string;
    active: boolean;
    sort_order: number;
  };
  runs: { id: string; label: string }[];
}) {
  const [state, act, busy] = useActionState<SaveState, FormData>(saveOccasion, {
    done: "",
    error: "",
  });

  const on = lagos(occasion?.happens_at);
  const shut = lagos(occasion?.closes_at);

  return (
    <form action={act} className="space-y-3">
      {occasion && <input type="hidden" name="id" value={occasion.id} />}
      <input type="hidden" name="image_url" value={occasion?.image_url ?? ""} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={occasion?.name} required className="field" />
          <p className="mt-1 text-xs text-muted">
            What it says on the card. &quot;Games night&quot;, &quot;Liverpool v Man City&quot;.
          </p>
        </div>
        <div>
          <label className="label">Web address</label>
          <input
            name="slug"
            defaultValue={occasion?.slug}
            placeholder="games-night"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Left blank, it is made from the name. This is the link you send.
          </p>
        </div>
      </div>

      <div>
        <label className="label">One line under the name</label>
        <input name="blurb" defaultValue={occasion?.blurb} className="field" />
      </div>

      {/* A clock of its own. Blank is the ordinary kind, where the customer
          picks a day from whatever is going. */}
      <fieldset className="rounded-xl border border-black/10 p-3">
        <legend className="px-1 text-sm font-bold">Does it have a time of its own?</legend>
        <p className="mb-2 text-xs text-muted">
          A match does. A games night does not: leave these blank and whoever
          orders picks their own day.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Day it happens</label>
            <input type="date" name="happens_on" defaultValue={on.date} className="field" />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" name="happens_time" defaultValue={on.time} className="field" />
          </div>
          <div>
            <label className="label">Called</label>
            <input
              name="when_word"
              defaultValue={occasion?.when_word ?? "kick-off"}
              placeholder="kick-off"
              className="field"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Orders close</label>
            <input type="date" name="closes_on" defaultValue={shut.date} className="field" />
          </div>
          <div>
            <label className="label">At</label>
            <input type="time" name="closes_time" defaultValue={shut.time} className="field" />
          </div>
          <div>
            <label className="label">Rides this run</label>
            <select name="batch_id" defaultValue={occasion?.batch_id ?? ""} className="field">
              <option value="">None</option>
              {runs.map((one) => (
                <option key={one.id} value={one.id}>{one.label}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted">
          Close it early enough that the food lands before the time above, and
          early enough again that somebody who misses it can still get a car of
          its own. That needs three hours, so four hours before is a good gap.
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={occasion?.active ?? true} />
          On the website
        </label>
        <label className="flex items-center gap-2 text-sm">
          Order on the page
          <input
            name="sort_order"
            inputMode="numeric"
            defaultValue={occasion?.sort_order ?? 100}
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
        {busy ? "Saving…" : occasion ? "Save" : "Add it"}
      </button>
    </form>
  );
}

/** An instant as the day and time it is in Lagos, for a date and time box. */
function lagos(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const of = (type: string) => parts.find((one) => one.type === type)?.value ?? "";
  return {
    date: `${of("year")}-${of("month")}-${of("day")}`,
    time: `${of("hour")}:${of("minute")}`,
  };
}
