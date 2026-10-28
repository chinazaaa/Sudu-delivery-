"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { curateABox, type CurateState } from "@/app/collections/actions";
import { waLink } from "@/lib/whatsapp";

/**
 * A box nobody has packed, asked for.
 *
 * The shelves hold what the shop decided to pack, which is most of what
 * anybody wants and never all of it. The only answer to "could you do one
 * with X in it" was the changes box on a box that was already nearly
 * right, and somebody who wanted something else entirely had to go and
 * find the custom order page on their own.
 *
 * It asks which kind of X it is first, because they are two completely
 * different jobs and only one of them is ours. Something on the menu is a
 * basket: pick it and the shop already knows the price, the counter and
 * the car. Something we do not carry has to be found, priced and rung
 * back about, and the honest thing is to say so rather than to take an
 * order we cannot price.
 */
export default function CurateBox({
  shelf,
  hint,
  hostels,
  whatsapp,
}: {
  /** Which shelf they were looking at, so whoever answers knows what they
   *  were looking at when they asked. */
  shelf: string;
  /** The shelf's own example of a change, which is a better prompt than
   *  anything written here: one example cannot serve a cake and a bucket. */
  hint: string;
  hostels: string[];
  /** The shop's number, so somebody who will not fill in a form can say it
   *  out loud instead. Most of this shop's conversations start there. */
  whatsapp?: string | null;
}) {
  const [open, setOpen] = useState(false);
  /*
   * What they have typed so far, carried into the message.
   *
   * Held rather than read off the form on the way out, because somebody
   * who starts typing and changes their mind should not have to type it
   * again, and because the message is theirs to send: nothing here
   * messages anybody on anybody's behalf.
   */
  const [wanted, setWanted] = useState("");
  const [budget, setBudget] = useState("");
  // The rest of it, for the same reason: a refusal must not empty a form
  // somebody has just filled in.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  /*
   * A block on campus, or an address anywhere in Lagos.
   *
   * A box only ever asked which block, so anybody who is not a student had
   * to claim a hostel they do not live in or give up. Food is fetched hot
   * and driven straight over, so it goes to PAU and nowhere else; a box is
   * found, packed and then carried, and it can be carried to a house in
   * Awoyaya on the same day without the day being any different.
   *
   * Lagos and no further. Somebody in Abuja can buy a hamper in Abuja, and
   * telling them that now is better than taking their money and ringing
   * them on the day.
   */
  const [inPau, setInPau] = useState(true);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"" | "have" | "find">("");
  const [state, run] = useActionState<CurateState, FormData>(curateABox, {
    error: "",
    done: false,
  });

  const talk = waLink(
    whatsapp,
    "Hi Sudu, I would like to put my own box together." +
      (shelf === "" ? "" : `\n\nI was looking at ${shelf}.`) +
      (wanted.trim() === "" ? "" : `\n\nWhat I want: ${wanted.trim()}`) +
      (budget.trim() === "" ? "" : `\nBudget: ${budget.trim()}`)
  );

  // The dialog takes the keyboard, and Escape closes it, because a panel
  // over a page with no way out but a small × is a trap on a phone.
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const shut = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", shut);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", shut);
      // Back to whatever the stylesheet says rather than to whatever was
      // on the element when this opened: remembering the old value means a
      // hold let go early, on the way to another page, is put back on by
      // the cleanup a moment later.
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="card flex flex-col gap-2.5 p-4 sm:p-5">
        <span className="ticket text-brand-dark">Your own</span>
        <h2 className="font-display text-[26px] font-black uppercase leading-[0.95]">
          Curate your own box
        </h2>
        <p className="text-sm leading-relaxed text-ink/75">
          Nothing on the shelf quite it? Build one from the menu, or tell us what
          you want and we will go and find it.
        </p>
        <button
          type="button"
          onClick={() => {
            setKind("");
            setOpen(true);
          }}
          className="btn-quiet self-start"
        >
          Curate one
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/60"
          />
          <div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label="Curate your own box"
            className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl border-2 border-ink bg-paper p-5 sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[26px] font-black uppercase leading-[0.95]">
                {state.done
                  ? "That is with us"
                  : kind === "find"
                    ? "What are we looking for?"
                    : "What goes in it?"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-wash font-bold"
              >
                ✕
              </button>
            </div>

            {state.done ? (
              <p className="mt-3 text-sm leading-relaxed text-ink/75">
                We will price it and come back to you on WhatsApp. Nothing is
                ordered and nothing is owed until you have said yes to the price.
              </p>
            ) : kind === "" ? (
              /*
               * The one question worth asking first.
               *
               * These are two different jobs and only one of them is ours.
               * Things on the menu are a basket: the shop already knows the
               * price, the counter and the car, so it is a trip to the menu
               * and nothing more. Things we do not carry have to be found and
               * priced by a person, and saying so is better than taking an
               * order we cannot price.
               */
              <div className="mt-4 space-y-2.5">
                {/*
                   * Let go of the page before leaving it.
                   *
                   * While the dialog is up the body is held still, which is
                   * what stops a flick behind it scrolling the page away.
                   * Tapping through to the menu started the navigation with
                   * that hold still on, so the new page was drawn at the old
                   * offset: you landed in the footer and were thrown to the
                   * top a moment later. The hold comes off first.
                   */}
                <Link
                  href="/products"
                  onClick={() => {
                    document.body.style.overflow = "";
                    setOpen(false);
                  }}
                  className="block rounded-xl border-2 border-ink p-4 transition active:translate-x-0.5 active:translate-y-0.5"
                >
                  <span className="block font-bold">Things you already have</span>
                  <span className="mt-1 block text-sm leading-snug text-ink/70">
                    Pick them off the menu. It all comes in one box on one
                    delivery, and you see the price as you go.
                  </span>
                  <span className="mt-2 block text-sm font-extrabold text-brand">
                    Open the menu
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => setKind("find")}
                  className="block w-full rounded-xl border-2 border-ink p-4 text-left transition active:translate-x-0.5 active:translate-y-0.5"
                >
                  <span className="block font-bold">
                    Things you want us to get
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-ink/70">
                    Anything not on the menu. Tell us what it is and we will find
                    it, price it, and bring it with the rest.
                  </span>
                  <span className="mt-2 block text-sm font-extrabold text-brand">
                    Tell us what you want
                  </span>
                </button>

                {/*
                 * Not a third card, on purpose.
                 *
                 * The two above are the question: is the thing on our menu
                 * or is it not. WhatsApp is not a third answer to that, it
                 * is a different way of telling us the same answer, and
                 * three equal cards would be two questions wearing one
                 * coat. So it sits under both, where it reads as "or just
                 * say it", which is how most of this shop's conversations
                 * start anyway.
                 */}
                {talk && (
                  <a
                    href={talk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl bg-wash px-4 py-3 text-sm font-semibold"
                  >
                    Or just message us about it
                    <span aria-hidden className="text-brand">
                      →
                    </span>
                  </a>
                )}
              </div>
            ) : (
              <form action={run} className="mt-4 space-y-2.5">
                <input type="hidden" name="shelf" value={shelf} />

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-bold">What should go in it</span>
                  <textarea
                    name="wanted"
                    required
                    rows={3}
                    value={wanted}
                    onChange={(event) => setWanted(event.target.value)}
                    placeholder={
                      hint.trim() ||
                      "A tin of milo, two packs of noodles, and a cake for Friday"
                    }
                    className="field"
                  />
                </label>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-bold">Roughly what budget</span>
                    <input
                      name="budget"
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                      placeholder="₦20,000"
                      className="field"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-bold">Your name</span>
                    <input
                      name="name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      className="field"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-bold">Your number</span>
                    <input
                      name="phone"
                      required
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0801 234 5678"
                      className="field"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-bold">Where it goes</span>
                    <div className="flex gap-2">
                      {[
                        { at: true, label: "At PAU" },
                        { at: false, label: "Elsewhere in Lagos" },
                      ].map((one) => (
                        <button
                          key={one.label}
                          type="button"
                          onClick={() => setInPau(one.at)}
                          className={`chip flex-1 justify-center ${
                            inPau === one.at
                              ? "border-ink bg-ink text-white"
                              : "border-black/10 bg-white"
                          }`}
                        >
                          {one.label}
                        </button>
                      ))}
                    </div>

                    {inPau ? (
                      /* The shop's own list. A block nobody can match is a
                         bag in a car with nowhere to take it, and a parent
                         filling this in has never seen the place. */
                      <select
                        value={hostel}
                        onChange={(event) => setHostel(event.target.value)}
                        className="field"
                      >
                        <option value="">Pick a block</option>
                        {hostels.map((one) => (
                          <option key={one} value={one}>
                            {one}
                          </option>
                        ))}
                        <option value="Not sure">I am not sure</option>
                      </select>
                    ) : (
                      <>
                        <textarea
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          rows={3}
                          placeholder="Street, estate, area, and anything the driver needs to find you"
                          aria-label="Your address in Lagos"
                          className="field"
                        />
                        <span className="text-xs text-muted">
                          Anywhere in Lagos. Outside Lagos we cannot bring it,
                          and we would rather say so now than take your money
                          and ring you on the day.
                        </span>
                      </>
                    )}
                    {/* One field goes to the server whichever was filled in,
                        because the order has one place it is going. */}
                    <input
                      type="hidden"
                      name="hostel"
                      value={inPau ? hostel : address}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-bold">Anything else</span>
                  <input
                    name="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="It is for a birthday on the 20th"
                    className="field"
                  />
                </label>

                {state.error !== "" && (
                  <p className="text-sm font-semibold text-brand-dark">
                    {state.error}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Send ready={inPau ? hostel.trim() !== "" : address.trim().length >= 8} />
                  {/* For whoever started typing and would rather say it.
                      It carries what is in the boxes, so changing your mind
                      halfway costs nothing. */}
                  {talk && (
                    <a
                      href={talk}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-quiet"
                    >
                      Send it on WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setKind("")}
                    className="ml-auto text-sm font-semibold text-muted underline"
                  >
                    Back
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-ink/60">
                  Nothing is ordered here. We price it and come back to you, and
                  you decide then.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** `ready` is false while there is nowhere to take it: no block picked, or
 *  an address too short to find a house by. */
function Send({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !ready}
      className="btn disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send it"}
    </button>
  );
}
