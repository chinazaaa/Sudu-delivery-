"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  parcels = false,
}: {
  boxes: { id: string; name: string; shelf: string }[];
  hostels: string[];
  /** Whether the shop is carrying parcels, so a monthly collection is a
   *  thing it can offer rather than a thing it would have to refuse. */
  parcels?: boolean;
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
  /*
   * Everything typed, held here rather than left to the browser.
   *
   * React empties an uncontrolled form the moment a server action comes
   * back, so a refusal wiped the lot: somebody filled in seven fields, was
   * told their second number was their own, and found an empty form. The
   * custom order page learned this the same way and the fix is the same.
   */
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [forName, setForName] = useState("");
  const [forPhone, setForPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [day, setDay] = useState("3");
  const [box, setBox] = useState("");
  const [note, setNote] = useState("");

  /*
   * And said while they are still looking at the field.
   *
   * The same number in both is refused on the server, because that is
   * where refusing belongs, but finding out after pressing the button is
   * finding out too late. Compared on the digits, since 0801 234 5678 and
   * 08012345678 are one number written two ways.
   */
  const digits = (said: string) => said.replace(/\D/g, "");
  const sameNumber =
    digits(forPhone).length >= 10 && digits(forPhone) === digits(phone);

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
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
            className="field border-2 border-ink bg-paper"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Your number</span>
          <input
            name="customer_phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
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
            value={forName}
            onChange={(event) => setForName(event.target.value)}
            placeholder="Your son or daughter"
            className="field border-2 border-ink bg-paper"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">Their number</span>
          <input
            name="for_phone"
            value={forPhone}
            onChange={(event) => setForPhone(event.target.value)}
            inputMode="tel"
            placeholder="So the driver can ring them"
            aria-invalid={sameNumber || undefined}
            className="field border-2 border-ink bg-paper"
          />
          {/* Under the field it is about, while they are still looking at
              it. Said at the bottom of the form it is a verdict on the
              whole thing rather than a note about one box. */}
          {sameNumber && (
            <span className="text-sm font-semibold leading-snug text-brand-dark">
              That is your own number again. Put theirs in, or leave it blank
              and we will ring you when we are outside.
            </span>
          )}
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
            value={hostel}
            onChange={(event) => setHostel(event.target.value)}
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
            value={day}
            onChange={(event) => setDay(event.target.value)}
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
        <span className="text-sm font-bold">What goes in it</span>
        {/* The two that are not a shelf come first, because they are the
            two most parents mean. Plenty already have the foodstuff and
            want somebody to come and get it; plenty more know what they
            want and will not find it by reading box names. */}
        <select
          name="box_id"
          value={box}
          onChange={(event) => setBox(event.target.value)}
          className="field border-2 border-ink bg-paper"
        >
          <option value="">A box we put together, we will talk it through</option>
          {parcels && (
            <option value="parcel">
              A parcel you collect from me each month
            </option>
          )}
          {boxes.map((one) => (
            <option key={one.id} value={one.id}>
              {one.shelf === "" ? one.name : `${one.shelf} · ${one.name}`}
            </option>
          ))}
        </select>
        <span className="text-sm leading-relaxed text-ink/70">
          A box off the shelf is one price with delivery in it. Anything else
          is priced when we have gone through it with you.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">Anything we should know</span>
        <input
          name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
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
