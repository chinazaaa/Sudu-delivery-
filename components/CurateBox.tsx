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
  thing = "box",
  whatsapp,
}: {
  /** Which shelf they were looking at, so whoever answers knows what they
   *  were looking at when they asked. */
  shelf: string;
  /** The shelf's own example of a change, which is a better prompt than
   *  anything written here: one example cannot serve a cake and a bucket. */
  hint: string;
  /** What this shelf sells, in the word the shop uses for it: "hamper" on
   *  the Christmas shelf, "box" everywhere else. Said rather than guessed,
   *  because a page that calls a hamper a box reads as the wrong shop. */
  thing?: string;
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
  // The rest of it, for the same reason: a refusal must not empty a form
  // somebody has just filled in.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [kind, setKind] = useState<"" | "find">("");
  const [state, run] = useActionState<CurateState, FormData>(curateABox, {
    error: "",
    done: false,
  });

  const talk = waLink(
    whatsapp,
    `Hi Sudu, I would like a customised ${thing}.` +
      (shelf === "" ? "" : `\n\nI was looking at ${shelf}.`) +
      (wanted.trim() === "" ? "" : `\n\nWhat I want: ${wanted.trim()}`)
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
          Curate your own {thing}
        </h2>
        <p className="text-sm leading-relaxed text-ink/75">
          Nothing on the shelf quite it? Tell us what you want in it and we
          will put it together, price it, and come back to you.
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
            aria-label={`Curate your own ${thing}`}
            className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl border-2 border-ink bg-paper p-5 sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[26px] font-black uppercase leading-[0.95]">
                {state.done
                  ? "That is with us"
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
               * Two ways of saying the same thing, not three.
               *
               * There used to be a card sending people to the menu as well,
               * which is a different question wearing the same coat: a
               * hamper is not a basket of things off our shelves, it is a
               * thing we go and find. So this asks the one question it has,
               * and the chat sits under it for whoever would rather say it
               * out loud.
               */
              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setKind("find")}
                  className="block w-full rounded-xl border-2 border-ink p-4 text-left transition active:translate-x-0.5 active:translate-y-0.5"
                >
                  <span className="block font-bold">
                    Tell us what you want in it
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-ink/70">
                    Anything at all, on our shelves or not. We find it, price
                    it, and come back to you on WhatsApp.
                  </span>
                  <span className="mt-2 block text-sm font-extrabold text-brand">
                    Tell us what you want
                  </span>
                </button>

                {talk && (
                  <a
                    href={talk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink px-4 py-3.5 text-left transition active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <span>
                      <span className="block font-bold">Or just message us</span>
                      <span className="mt-1 block text-sm leading-snug text-ink/70">
                        Most of this shop's conversations start there anyway.
                      </span>
                    </span>
                    <span aria-hidden className="text-brand">
                      →
                    </span>
                  </a>
                )}
              </div>
            ) : (
              <form action={run} className="mt-4 space-y-2.5">
                <input type="hidden" name="shelf" value={shelf} />
                {/* So the list in admin says which kind of thing this is
                    rather than leaving whoever answers to work it out from
                    the shelf's name. */}
                <input type="hidden" name="thing" value={thing} />

                {/*
                 * Three fields, because three is all this is for.
                 *
                 * It used to ask for a budget, a block or an address, and
                 * anything else, which is a page of questions in front of
                 * somebody who has not been quoted a price yet. None of it
                 * is needed to answer them: the whole of this goes on to
                 * WhatsApp, where the day, the place and the money are all
                 * worked out properly anyway. What cannot be worked out
                 * later is what they want and how to reach them.
                 */}
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-bold">
                    What should go in it
                  </span>
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
                </div>

                {state.error !== "" && (
                  <p className="text-sm font-semibold text-brand-dark">
                    {state.error}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Send />
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

function Send() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send it"}
    </button>
  );
}
