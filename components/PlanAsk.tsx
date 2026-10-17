"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { askForAPlan, type AskedState } from "@/app/parents/actions";

/**
 * A parent setting up a monthly box, on the page rather than on WhatsApp.
 *
 * What stood here was a button that opened a chat, which is a promise to
 * remember rather than a subscription: the thing a parent wanted to do was
 * the one thing the site could not do.
 *
 * It is honest about what it is. Nothing is charged and no card is taken,
 * because this shop takes transfers and the price of a care package depends
 * on what is in it that month. What is being agreed is the day and the
 * thing, and a real order with a real total arrives a few days before each
 * one lands.
 */
export default function PlanAsk({
  boxes,
  hostels,
}: {
  boxes: { id: string; name: string; shelf: string }[];
  hostels: string[];
}) {
  const [state, run] = useActionState<AskedState, FormData>(askForAPlan, {
    error: null,
    done: false,
  });

  /*
   * Stay where the answer is.
   *
   * The form is most of a screen tall and what replaces it is four lines,
   * so sending it left the page a lot shorter with the scroll where it
   * was: somebody who filled this in landed in the footer and had to go
   * looking for the answer to a thing they had just done.
   */
  const said = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (state.done) said.current?.scrollIntoView({ block: "center" });
  }, [state.done]);

  if (state.done) {
    return (
      <div
        ref={said}
        className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border-2 border-ink bg-volt p-6"
      >
        <span className="ticket">That is in</span>
        {/* Message, not call. This shop talks on WhatsApp, and a page that
            promises a phone call promises a thing nobody here does. */}
        <h3 className="font-display text-[32px] font-black uppercase leading-[0.9]">
          We will message you
        </h3>
        <p className="leading-relaxed">
          Somebody will go through what goes in it and what it comes to, and
          nothing happens until you have agreed both. After that it is one
          message a month, a few days before it lands, with the account on it.
        </p>
      </div>
    );
  }

  return (
    <form
      action={run}
      className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-volt p-6"
    >
      <span className="ticket">Every month</span>
      <h3 className="font-display text-[32px] font-black uppercase leading-[0.9]">
        Send it monthly
      </h3>
      <p className="leading-relaxed">
        Pick the box and the day. We raise the order a few days before it lands
        and send you the account, so it is one transfer a month and nothing to
        remember.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Your name</span>
          <input
            name="customer_name"
            required
            autoComplete="name"
            className="field border-2 border-ink bg-paper"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Your number</span>
          <input
            name="customer_phone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="0801 234 5678"
            className="field border-2 border-ink bg-paper"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Who it is for</span>
          <input
            name="for_name"
            placeholder="Your son or daughter"
            className="field border-2 border-ink bg-paper"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Their number</span>
          <input
            name="for_phone"
            inputMode="tel"
            placeholder="So the driver can ring them"
            className="field border-2 border-ink bg-paper"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Their block</span>
          {/* The shop's own list, not a box to type into.
              A parent is the one person filling this in who has never seen
              the place: they know their child is "in the new hostel" and
              would write that. The list is what the run sheet is sorted by,
              and a block nobody can match is a bag in a car with nowhere to
              take it. "Not sure" is a real answer, and a better one than a
              guess, because somebody rings them about this anyway. */}
          <select
            name="hostel"
            required
            defaultValue=""
            className="field border-2 border-ink bg-paper"
          >
            <option value="" disabled>
              Pick their block
            </option>
            {hostels.map((one) => (
              <option key={one} value={one}>
                {one}
              </option>
            ))}
            <option value="Not sure">I am not sure</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Day of the month</span>
          <select
            name="on_day"
            defaultValue="3"
            className="field border-2 border-ink bg-paper"
          >
            {Array.from({ length: 28 }, (_, at) => at + 1).map((day) => (
              <option key={day} value={day}>
                The {day}
                {nth(day)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">Which box</span>
        <select
          name="box_id"
          defaultValue=""
          className="field border-2 border-ink bg-paper"
        >
          <option value="">We will talk it through</option>
          {boxes.map((one) => (
            <option key={one.id} value={one.id}>
              {one.shelf === "" ? one.name : `${one.shelf} · ${one.name}`}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">Anything we should know</span>
        <input
          name="note"
          placeholder="No pepper. Leave it with the porter."
          className="field border-2 border-ink bg-paper"
        />
      </label>

      {state.error && (
        <p className="text-sm font-semibold text-brand-dark">{state.error}</p>
      )}

      <Go />

      <p className="text-sm leading-relaxed text-ink/70">
        Nothing is charged here and we do not take a card. Somebody goes through
        what is in it and what it comes to with you first, and you pay each one
        by transfer like any other order.
      </p>
    </form>
  );
}

function Go() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn self-start bg-ink text-white disabled:opacity-60"
    >
      {pending ? "Sending…" : "Set it up"}
    </button>
  );
}

/** "3rd", because "the 3 of the month" reads as a typo. */
function nth(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  if (day % 10 === 1) return "st";
  if (day % 10 === 2) return "nd";
  if (day % 10 === 3) return "rd";
  return "th";
}
