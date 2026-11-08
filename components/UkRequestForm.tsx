"use client";

import { useActionState, useState } from "react";

import { sendUkRequest, type UkState } from "@/app/uk-order/actions";
import {
  BOOK_FORMATS,
  SHIRT_FITS,
  SHIRT_STYLES,
  type UkKind,
} from "@/lib/uk-requests";
import { waLink } from "@/lib/whatsapp";

/**
 * Asking for a football shirt or a book from the UK.
 *
 * No prices anywhere: they depend on the item and are sent on WhatsApp.
 * So this is as short as a form can be and still be quotable, and the
 * WhatsApp button is right beside it for anybody who would rather type
 * there. The button carries what they have filled in, so nobody types it
 * twice, and it is theirs to send: nothing here messages anyone.
 *
 * Held in state rather than left to the browser, which empties an
 * uncontrolled form the moment a server action comes back and used to
 * wipe everything somebody had written when one box was missing.
 */
export default function UkRequestForm({
  kind,
  hostels,
  whatsapp,
}: {
  kind: UkKind;
  hostels: string[];
  whatsapp: string | null;
}) {
  const [state, action, busy] = useActionState<UkState, FormData>(sendUkRequest, {
    error: "",
  });

  const [club, setClub] = useState("");
  const [style, setStyle] = useState("");
  const [look, setLook] = useState("");
  const [fit, setFit] = useState("");
  const [size, setSize] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [format, setFormat] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // The campus is most of who orders, so it is the one already chosen.
  const [where, setWhere] = useState<"pau" | "lagos">("pau");
  const [hostel, setHostel] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  // Only the name of it, to show that something is attached. The file
  // itself rides the form and is never held in state.
  const [photo, setPhoto] = useState("");

  const what =
    kind === "book"
      ? [title.trim(), author.trim() ? `by ${author.trim()}` : "", format]
          .filter(Boolean)
          .join(" ")
      : [club.trim(), style.toLowerCase(), look.trim() ? `(${look.trim()})` : "", fit, size.trim()]
          .filter(Boolean)
          .join(" ");

  const link = waLink(
    whatsapp,
    `Hi Sudu, I would like ${kind === "book" ? "a book" : "a football shirt"} from the UK.` +
      (what ? `\n\n${what}` : "") +
      (where === "lagos"
        ? address.trim()
          ? `\nDelivery in Lagos: ${address.trim()}`
          : "\nDelivery in Lagos"
        : hostel.trim()
          ? `\nDelivery in PAU: ${hostel.trim()}`
          : "\nDelivery in PAU") +
      (photo !== "" ? "\n\n(I have a picture to send.)" : "")
  );

  const chip = (on: boolean) =>
    `chip ${on ? "chip-on" : "bg-transparent"}`;

  return (
    <form action={action} encType="multipart/form-data" className="card space-y-4">
      <input type="hidden" name="kind" value={kind} />

      {kind === "shirt" ? (
        <>
          <div>
            <label className="label" htmlFor="club">Club or country</label>
            <input
              id="club"
              name="club"
              required
              value={club}
              onChange={(event) => setClub(event.target.value)}
              placeholder="Arsenal, PSG, Bayern, Nigeria"
              className="field"
            />
          </div>

          <div>
            <span className="label">Which shirt</span>
            <input type="hidden" name="style" value={style} />
            <div className="flex flex-wrap gap-2">
              {SHIRT_STYLES.map((one) => (
                <button
                  key={one}
                  type="button"
                  aria-pressed={style === one}
                  onClick={() => setStyle(style === one ? "" : one)}
                  className={chip(style === one)}
                >
                  {one}
                </button>
              ))}
            </div>
            <input
              name="look"
              value={look}
              onChange={(event) => setLook(event.target.value)}
              placeholder="Colour or season, e.g. the blue one"
              aria-label="Colour or season"
              className="field mt-2"
            />
          </div>

          <div>
            <span className="label">Fit and size</span>
            <input type="hidden" name="fit" value={fit} />
            <div className="flex flex-wrap gap-2">
              {SHIRT_FITS.map((one) => (
                <button
                  key={one}
                  type="button"
                  aria-pressed={fit === one}
                  onClick={() => setFit(fit === one ? "" : one)}
                  className={chip(fit === one)}
                >
                  {one}
                </button>
              ))}
            </div>
            <input
              name="size"
              required
              value={size}
              onChange={(event) => setSize(event.target.value)}
              placeholder="M, or for kids their age"
              aria-label="Size"
              className="field mt-2"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="title">Book</label>
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              className="field"
            />
            <input
              name="author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Author, if you know it"
              aria-label="Author"
              className="field mt-2"
            />
          </div>

          <div>
            <span className="label">Which kind</span>
            <input type="hidden" name="format" value={format} />
            <div className="flex flex-wrap gap-2">
              {BOOK_FORMATS.map((one) => (
                <button
                  key={one}
                  type="button"
                  aria-pressed={format === one}
                  onClick={() => setFormat(format === one ? "" : one)}
                  className={chip(format === one)}
                >
                  {one}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <label className="label" htmlFor="photo">Picture</label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          onChange={(event) => setPhoto(event.target.files?.[0]?.name ?? "")}
          className="field"
        />
        {photo !== "" && <p className="mt-1 text-xs text-muted">{photo} attached.</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        <div>
          <label className="label" htmlFor="phone">WhatsApp number</label>
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
        </div>
      </div>

      <div>
        <span className="label">Delivery</span>
        <input type="hidden" name="where" value={where} />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={where === "pau"}
            onClick={() => setWhere("pau")}
            className={chip(where === "pau")}
          >
            Delivery in PAU
          </button>
          <button
            type="button"
            aria-pressed={where === "lagos"}
            onClick={() => setWhere("lagos")}
            className={chip(where === "lagos")}
          >
            Delivery in Lagos
          </button>
        </div>

        {/* One question each, and only the one that applies. A campus
            order is a block off a list; anywhere else in Lagos is an
            address, which nobody can pick from a list. */}
        {where === "pau" ? (
          hostels.length > 0 ? (
            <select
              name="hostel"
              required
              value={hostel}
              onChange={(event) => setHostel(event.target.value)}
              aria-label="Your block"
              className="field mt-2"
            >
              <option value="">Your block</option>
              {hostels.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="hostel"
              required
              value={hostel}
              onChange={(event) => setHostel(event.target.value)}
              placeholder="Your block"
              aria-label="Your block"
              className="field mt-2"
            />
          )
        ) : (
          <input
            name="address"
            required
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Your address in Lagos"
            aria-label="Your address in Lagos"
            className="field mt-2"
          />
        )}
      </div>

      <div>
        <label className="label" htmlFor="note">Anything else</label>
        <input
          id="note"
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="field"
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full py-3.5">
        {busy ? "Sending…" : "Send"}
      </button>

      {link && (
        <p className="text-center text-sm text-muted">
          Or{" "}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand underline"
          >
            message us on WhatsApp
          </a>
        </p>
      )}
    </form>
  );
}
