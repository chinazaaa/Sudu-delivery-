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
/** The three ways a laundry job can go, said the way a student would. */
const LAUNDRY_WAYS = [
  { label: "There and back", hint: "We take it to the laundry, then bring it to you when it is ready." },
  { label: "Take it to the laundry", hint: "We take it there. You collect it yourself." },
  { label: "Bring it back", hint: "You already dropped it off. We bring it to you when it is ready." },
] as const;

/** The dropdown entry for a place that is not on the list. */
const OTHER_PLACE = "__other__";

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
  /*
   * What a picture is for here.
   *
   * This said "the thing, the damage, or the style you want", which was
   * one sentence trying to cover printing, tailoring, hair and repair at
   * once. On the custom order page, where somebody is asking us to go and
   * buy something, it offered to look at damage nobody had mentioned. Each
   * errand says what its own picture is for; this is the shopping one.
   */
  fileHint = "Optional, and often quicker than describing it. A photo of the thing, a screenshot, or the label off the pack you want.",
  tag = "",
  rows = 3,
  placeholder = "A black 20,000mAh power bank",
  help = "The more exact the better. Colour, size, make, anything you know.",
  simple = false,
  noChips = false,
  kinds = false,
  notePlaceholder = "Needed before Friday",
  places,
  noBudget = false,
  back = "",
}: {
  /** Put in front of what they wrote when it is saved, so admin can tell
   *  this kind of ask apart: "Market list". */
  tag?: string;
  rows?: number;
  placeholder?: string;
  help?: string;
  /** No picture and no limit: a list is just a list. */
  simple?: boolean;
  /** Hide the taps above the box, or the limit box, on their own. */
  noChips?: boolean;
  /** Ask what is being collected as three taps: food, laundry or printing,
   *  and for laundry which way it is going. */
  kinds?: boolean;
  /** The grey example in the "Anything else?" box. */
  notePlaceholder?: string;
  /** Where to collect from, as a dropdown above the box. */
  places?: string[];
  noBudget?: boolean;
  /** Where to land after sending, where it is not the custom order page. */
  back?: string;
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
  const [chosen, setChosen] = useState("");
  const [kind, setKind] = useState<"Food" | "Laundry" | "Printing">("Food");
  const [way, setWay] = useState<(typeof LAUNDRY_WAYS)[number]["label"]>("There and back");
  // Food is the usual one and needs no word; the others say what they are.
  const what =
    !kinds || kind === "Food"
      ? ""
      : kind === "Laundry"
        ? `Laundry: ${way.toLowerCase()}`
        : "Printing";
  const [otherPlace, setOtherPlace] = useState("");
  // Somewhere not on the list: what they typed stands in for the choice.
  const place = chosen === OTHER_PLACE ? otherPlace.trim() : chosen;
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
    (place !== "" ? `\n\nCollect from: ${place}` : "") +
    (what !== "" ? `\n\nFor: ${what}` : "") +
    (wanted.trim() ? `\n\n${tag === "" ? "What: " : ""}${wanted.trim()}` : "") +
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
        {kinds && (
          <div className="space-y-2">
            <p className="label">What should we collect?</p>
            {/* Taps, not a dropdown: three answers are better all in sight. */}
            <div className="flex flex-wrap gap-2">
              {(["Food", "Laundry", "Printing"] as const).map((one) => (
                <label
                  key={one}
                  className={`chip cursor-pointer text-sm font-bold ${
                    kind === one ? "bg-ink text-shell" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={one}
                    checked={kind === one}
                    onChange={() => setKind(one)}
                    className="sr-only"
                  />
                  {one}
                </label>
              ))}
            </div>
            {kind === "Laundry" && (
              <div className="space-y-1.5">
                {LAUNDRY_WAYS.map((one) => (
                  <label
                    key={one.label}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border-2 px-3 py-2.5 ${
                      way === one.label ? "border-ink bg-white" : "border-black/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="laundry_way"
                      value={one.label}
                      checked={way === one.label}
                      onChange={() => setWay(one.label)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-bold">{one.label}</span>
                      <span className="block text-sm text-muted">{one.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {places && places.length > 0 && (
          <div>
            <label className="label" htmlFor="place">
              Where are we collecting from?
            </label>
            <select
              id="place"
              required
              value={chosen}
              onChange={(event) => setChosen(event.target.value)}
              className="field"
            >
              <option value="">Choose a place</option>
              {places.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
              <option value={OTHER_PLACE}>Somewhere else</option>
            </select>
            {chosen === OTHER_PLACE && (
              <input
                required
                value={otherPlace}
                onChange={(event) => setOtherPlace(event.target.value)}
                placeholder="Where should we collect it from?"
                className="field mt-2"
              />
            )}
          </div>
        )}

        <div>
          <label className="label" htmlFor="wanted">
            {label}
          </label>
          <textarea
            id="wanted"
            name={tag === "" ? "wanted" : undefined}
            rows={rows}
            required
            value={wanted}
            onChange={(event) => setWanted(event.target.value)}
            placeholder={placeholder}
            className="field"
          />
          {tag !== "" && <input type="hidden" name="wanted" value={`${tag}${place !== "" ? ` · ${place}` : ""}: ${what !== "" ? `${what}. ` : ""}${wanted}`} />}
          {back !== "" && <input type="hidden" name="back" value={back} />}
          <p className="mt-1 text-xs text-muted">{help}</p>

          {/* Tap one and it writes itself into the box above. They were sat
              further down the page looking like buttons and doing nothing,
              which is the worst a chip can be: it says the shop does these
              and then ignores the finger. */}
          <div className={`mt-2 flex flex-wrap gap-2 ${simple || noChips ? "hidden" : ""}`}>
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

        {/* Half of what people want is easier shown than said: the pack
            off a shelf, a cracked screen, a hairstyle, the model sticker
            under a laptop. WhatsApp has always carried pictures and the
            form has not, which made the form the poorer of the two ways to
            ask for exactly the things people most want to show. What the
            picture is for changes with the page, so each errand says it in
            its own words rather than one sentence trying to cover all of
            them. */}
        <div className={simple ? "hidden" : ""}>
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
          <div className={simple || noBudget ? "hidden" : ""}>
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
            placeholder={notePlaceholder}
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
