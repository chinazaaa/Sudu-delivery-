"use client";

import { useActionState, useState } from "react";

import { sendRequest, type AskState } from "@/app/custom-order/actions";

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
}: {
  hostels: string[];
  whatsapp: string | null;
}) {
  const [state, action, busy] = useActionState<AskState, FormData>(sendRequest, {
    error: "",
  });

  const [wanted, setWanted] = useState("");
  const [budget, setBudget] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [note, setNote] = useState("");

  // Their own words, carried into the message so nobody types it twice. It
  // is theirs to send: we never send anything on anybody's behalf.
  const message =
    "Hi Sudu, I am looking for something that is not on the menu." +
    (wanted.trim() ? `\n\nWhat: ${wanted.trim()}` : "") +
    (budget.trim() ? `\nBudget: ${budget.trim()}` : "") +
    (hostel.trim() ? `\nBlock: ${hostel.trim()}` : "");
  const link =
    whatsapp && whatsapp.replace(/\D/g, "").length >= 10
      ? `https://wa.me/${
          whatsapp.replace(/\D/g, "").startsWith("0")
            ? "234" + whatsapp.replace(/\D/g, "").slice(1)
            : whatsapp.replace(/\D/g, "")
        }?text=${encodeURIComponent(message)}`
      : null;

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
            Say what you are looking for, however you would say it out loud. We
            find it, price it, and send you what it comes to. Nothing is
            ordered until you say yes.
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

      <form action={action} className="card space-y-3">
        <div>
          <label className="label" htmlFor="wanted">
            What are you looking for?
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
            {[
              "Tailoring: ",
              "Laundry: ",
              "A cake: ",
              "A charger: ",
              "Hair or nails: ",
              "Printing: ",
              "From a pharmacy: ",
              "From a shop in Lekki: ",
            ].map((one) => (
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="budget">
              What would you pay for it?
            </label>
            <input
              id="budget"
              name="budget"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="About ₦20,000"
              className="field"
            />
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
          {busy ? "Sending…" : "Ask Sudu to find it"}
        </button>
      </form>

    </div>
  );
}
