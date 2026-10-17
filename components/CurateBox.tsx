"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { curateABox, type CurateState } from "@/app/collections/actions";

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
}: {
  /** Which shelf they were looking at, so whoever answers knows what they
   *  were looking at when they asked. */
  shelf: string;
  /** The shelf's own example of a change, which is a better prompt than
   *  anything written here: one example cannot serve a cake and a bucket. */
  hint: string;
  hostels: string[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"" | "have" | "find">("");
  const [state, run] = useActionState<CurateState, FormData>(curateABox, {
    error: "",
    done: false,
  });

  // The dialog takes the keyboard, and Escape closes it, because a panel
  // over a page with no way out but a small × is a trap on a phone.
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const shut = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", shut);
    const was = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", shut);
      document.body.style.overflow = was;
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
                <Link
                  href="/products"
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
                      placeholder="₦20,000"
                      className="field"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-bold">Your name</span>
                    <input name="name" required autoComplete="name" className="field" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-bold">Your number</span>
                    <input
                      name="phone"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0801 234 5678"
                      className="field"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-bold">Which block</span>
                    <input name="hostel" list="curate-blocks" className="field" />
                    <datalist id="curate-blocks">
                      {hostels.map((one) => (
                        <option key={one} value={one} />
                      ))}
                    </datalist>
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-bold">Anything else</span>
                  <input
                    name="note"
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
                  <Send />
                  <button
                    type="button"
                    onClick={() => setKind("")}
                    className="text-sm font-semibold text-muted underline"
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

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn disabled:opacity-60">
      {pending ? "Sending…" : "Send it"}
    </button>
  );
}
