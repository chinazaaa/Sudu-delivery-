"use client";

import { useActionState, useEffect, useState } from "react";

import { sendRequest, type AskState } from "@/app/custom-order/actions";
import { waLink } from "@/lib/whatsapp";

/**
 * Asking for something the shop does not carry.
 *
 * Two ways out of the same page, because not everybody fills in forms. The
 * form is here for people who will, and the WhatsApp button carries whatever
 * they have typed so far into a message they send themselves, which is how
 * every other conversation with this shop starts anyway.
 *
 * Held in state rather than left to the browser: React empties an
 * uncontrolled form the moment a server action comes back, so a refusal used
 * to wipe everything somebody had written.
 */
export default function AskForm({
  hostels,
  whatsapp,
  preset = "",
  chips,
  opening = "Hi Sudu, I am looking for something that is not on the menu.",
  lead = "Say what you are looking for, however you would say it out loud. We find it, price it, and send you what it comes to. Nothing is ordered until you say yes.",
  label = "What are you looking for?",
  send = "Ask Sudu to get it",
  fileLabel = "A picture, if you have one",
  fileAccept = "image/*",
  fileHint = "Optional, and often quicker than describing it. A photo of the thing, the damage, or the style you want.",
}: {
  hostels: string[];
  whatsapp: string | null;
  /** What the box starts with, where the page is about one kind of ask.
   *  A project printing page that opens on an empty "what are you looking
   *  for?" has thrown away the thing the page just said. */
  preset?: string;
  /** The taps above the box. The general list unless a page knows better. */
  chips?: string[];
  /** The first line of the message they send themselves. */
  opening?: string;
  lead?: string;
  label?: string;
  /** What the button says. Finding is the smaller half of this and the
   *  wrong half to name: nobody wants a thing located, they want it got. */
  send?: string;
  /** What the attachment is for on this page. A printing page wants the
   *  document itself; a repair page wants a photograph of the damage. */
  fileLabel?: string;
  fileAccept?: string;
  fileHint?: string;
}) {
  const [state, action, busy] = useActionState<AskState, FormData>(sendRequest, {
    error: "",
  });

  const [wanted, setWanted] = useState(preset);
  const [budget, setBudget] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [note, setNote] = useState("");
  // Only the name of it, to show that something is attached. The file
  // itself rides the form and is never held in state.
  const [photo, setPhoto] = useState("");

  /* Tapping a thing in a catalogue below fills this in. Done as an effect
     rather than by remounting the form, which would throw away the name
     and the number somebody had already typed. */
  useEffect(() => {
    if (preset !== "") setWanted(preset);
  }, [preset]);

  // Their own words, carried into the message so nobody types it twice. It
  // is theirs to send: we never send anything on anybody's behalf.
  const message =
    opening +
    (wanted.trim() ? `\n\nWhat: ${wanted.trim()}` : "") +
    (budget.trim() ? `\nLimit: ${budget.trim()}` : "") +
    (hostel.trim() ? `\nBlock: ${hostel.trim()}` : "") +
    (photo !== "" ? "\n\n(I have a file to send.)" : "");
  const link = waLink(whatsapp, message);

  return (
    <div className="space-y-4">
      {/* First, because it is how this shop already talks to everybody. A
          form is the fallback for the few who would rather type into boxes,
          not the other way round.

          The message is written for them and sent by them: nothing here
          messages anybody on their behalf. It carries anything typed in the
          form below, for whoever starts there and changes their mind. */}
      {link && (
        <div className="card space-y-2">
          <p className="font-bold">Tell us on WhatsApp</p>
          <p className="text-sm text-muted">
            {lead}
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary block py-3.5 text-center"
          >
            Message us on WhatsApp
          </a>
        </div>
      )}

      <p className="text-center text-sm font-semibold text-muted">
        {link ? "Or fill this in and we will come back to you" : "Tell us what you need"}
      </p>

      <form action={action} encType="multipart/form-data" className="card space-y-3">
        <div>
          <label className="label" htmlFor="wanted">
            {label}
          </label>
          <textarea
            id="wanted"
            name="wanted"
            rows={3}
            required
            value={wanted}
            onChange={(event) => setWanted(event.target.value)}
            placeholder="A black 20,000mAh power bank"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            The more exact the better. Colour, size, make, anything you know.
          </p>

          {/* Tap one and it writes itself into the box above. They were sat
              further down the page looking like buttons and doing nothing,
              which is the worst a chip can be: it says the shop does these
              and then ignores the finger. */}
          <div className="mt-2 flex flex-wrap gap-2">
            {(chips ?? [
              "Tailoring: ",
              "Laundry: ",
              "A cake: ",
              "A charger: ",
              "Hair or nails: ",
              "Project printing: ",
              "From a pharmacy: ",
              "From a shop in Lekki: ",
            ]).map((one) => (
              <button
                key={one}
                type="button"
                onClick={() => {
                  setWanted(one);
                  document.getElementById("wanted")?.focus();
                }}
                className="chip text-sm text-muted"
              >
                {one.replace(/: $/, "")}
              </button>
            ))}
          </div>
        </div>

        {/* Half of what people want is easier shown than said: a cracked
            screen, a hairstyle, the damage in a garment, the model sticker
            under a laptop. WhatsApp has always carried pictures and the
            form has not, which made the form the poorer of the two ways to
            ask for exactly the things people most want to show. */}
        <div>
          <label className="label" htmlFor="photo">
            {fileLabel}
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept={fileAccept}
            onChange={(event) => setPhoto(event.target.files?.[0]?.name ?? "")}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            {photo !== ""
              ? `${photo} attached.`
              : fileHint}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/*
            A ceiling, not an offer.

            This asked "what would you pay for it?", which is the question a
            market stall asks: it puts the customer in the position of
            naming a price before the shop has, and quietly says the price
            depends on what they will bear.

            It is also a question most of them cannot answer. Somebody
            asking for roasted plantain has no idea what roasted plantain
            costs, and whatever they guess becomes the number in their head,
            so a real quote above it reads as a markup rather than a price.

            A limit is answerable even by somebody who has no idea what the
            thing costs, it reads as protection rather than haggling, and it
            is the one thing actually needed at this end: whether to go
            ahead without asking again.
          */}
          <div>
            <label className="label" htmlFor="budget">
              A limit, if you have one
            </label>
            <input
              id="budget"
              name="budget"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Nothing over ₦20,000"
              className="field"
            />
            <p className="hint mt-1">
              Optional. Only if there is a price you would not want us to go
              past.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">Your number</label>
            <input
              id="phone"
              name="phone"
              required
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0803 123 4567"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              We come back to you on WhatsApp with what it costs.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="hostel">Your block</label>
            {hostels.length > 0 ? (
              <select
                id="hostel"
                name="hostel"
                value={hostel}
                onChange={(event) => setHostel(event.target.value)}
                className="field"
              >
                <option value="">Where it would go</option>
                {hostels.map((one) => (
                  <option key={one} value={one}>
                    {one}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="hostel"
                name="hostel"
                value={hostel}
                onChange={(event) => setHostel(event.target.value)}
                className="field"
              />
            )}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="note">Anything else?</label>
          <input
            id="note"
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Needed before Friday"
            className="field"
          />
        </div>

        {state.error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full py-3.5">
          {busy ? "Sending…" : send}
        </button>
      </form>

    </div>
  );
}
