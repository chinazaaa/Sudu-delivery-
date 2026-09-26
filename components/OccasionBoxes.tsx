"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { orderBox, type BoxOrderState } from "@/app/collections/actions";
import type { BoxView, WhenOption } from "@/lib/box-view";
import { naira } from "@/lib/money";
import { OPENED, TRAP } from "@/lib/guard";
import { STANDARD_DAYS } from "@/lib/box-day";

/**
 * Picking a box and ordering it.
 *
 * Three cards and then one form. The deciding is meant to be already done,
 * so nothing here asks a question the shop could have answered: what is in
 * it, what it costs and when it can come are all on the screen before
 * anybody types anything.
 *
 * Swaps are here for the person who would otherwise leave. Most people will
 * never open one, so they are folded away rather than laid out.
 */
export default function OccasionBoxes({
  slug,
  boxes,
  when,
  timed,
  soonest,
  latest,
  hostels,
  promoters,
  me,
  note,
  shut,
}: {
  slug: string;
  boxes: BoxView[];
  when: WhenOption[];
  /** A thing with a whistle: a match, a kick-off. Those pick a real car out
   *  of the ones the shop is driving. Everything else picks a date. */
  timed: boolean;
  /** The soonest day a box can be packed for, and the furthest ahead worth
   *  planning. Both worked out on the server: the clock is the shop's. */
  soonest: string;
  latest: string;
  hostels: string[];
  promoters: { code: string; name: string }[];
  me: { name: string; hostel: string; paymentMethod: "transfer" | "card" } | null;
  note: string;
  shut: boolean;
}) {
  const router = useRouter();
  const [state, act, busy] = useActionState<BoxOrderState, FormData>(orderBox, {
    error: "",
  });

  const meals = boxes.filter((one) => !one.isExtra);
  const extras = boxes.filter((one) => one.isExtra);

  const [picked, setPicked] = useState("");
  const [swaps, setSwaps] = useState<Record<string, number>>({});
  const [going, setGoing] = useState(when[0]?.key ?? "");
  const [day, setDay] = useState(when[0]?.date ?? "");
  const [wantedOn, setWantedOn] = useState(soonest);
  const [anyDay, setAnyDay] = useState(false);
  const [again, setAgain] = useState(false);

  // Sooner than the shop can find it, buy it and pack it, so it costs what a
  // car of its own costs. Worked out from dates the server sent, because a
  // phone's clock is anybody's guess.
  const rush = !anyDay && wantedOn !== "" && wantedOn < soonest;

  // One entry per day that has anything going, in order, each carrying its
  // own cars. Built here rather than on the server because it is a shape,
  // not a fact, and the server already sent every fact it has.
  const days = useMemo(() => {
    const byDate = new Map<string, WhenOption[]>();
    for (const one of when) {
      byDate.set(one.date, [...(byDate.get(one.date) ?? []), one]);
    }
    return [...byDate.entries()].map(([date, options]) => ({
      date,
      options,
      weekday: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-NG", {
        weekday: "short",
      }),
      short: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      }),
    }));
  }, [when]);
  const [opened] = useState(() => Date.now());

  const box = meals.find((one) => one.id === picked) ?? null;
  const rest = useRef<HTMLFormElement>(null);

  // Picking a box moves you to what is in it, because the next thing to do
  // is below the fold on every phone and hunting for it reads as nothing
  // having happened. Only on opening one: closing it should leave the page
  // where the thumb is.
  useEffect(() => {
    if (picked === "") return;
    rest.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [picked]);
  const car = when.find((one) => one.key === going) ?? null;

  // An order made is a page they should be on, not a message on this one.
  useEffect(() => {
    if (state.orderId) router.push(`/o/${state.orderId}`);
  }, [state.orderId, router]);

  const priceOf = (one: BoxView) =>
    one.food +
    (car ? (car.onARun ? one.runFee : one.carFee) : one.runFee) +
    (one === box ? moved(one, swaps) : 0);

  return (
    <div className="space-y-4">
      {shut && (
        <p className="card border-amber-300 bg-amber-50 text-sm font-semibold text-amber-900">
          Nothing can get there in time any more. Everything on the menu is
          still going out though.{" "}
          <Link href="/" className="underline">
            See what is on
          </Link>
          .
        </p>
      )}

      {/* The boxes themselves. One price each, delivery in it, and the price
          moves with the car rather than pretending it does not. */}
      <ul className="space-y-3">
        {meals.map((one) => (
          <li key={one.id}>
            <button
              type="button"
              onClick={() => setPicked(one.id === picked ? "" : one.id)}
              className={`w-full rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] ${
                one.id === picked ? "border-brand bg-brand-tint" : "border-black/10"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-extrabold">{one.name}</span>
                <span className="shrink-0 text-lg font-extrabold">
                  {naira(priceOf(one))}
                </span>
              </div>
              {one.serves !== "" && (
                <span className="block text-sm text-muted">{one.serves}</span>
              )}
              <span className="mt-1 block text-sm text-ink/75">
                {one.lines
                  .map((line) => `${line.qty > 1 ? `${line.qty} × ` : ""}${line.name}`)
                  .join(" · ")}
              </span>
              <span className="mt-1 block text-sm font-semibold text-brand">
                Delivery included
              </span>
            </button>
          </li>
        ))}
      </ul>

      {box && !shut && (
        <form ref={rest} action={act} className="scroll-mt-24 space-y-4">
          <input type="hidden" name="occasion" value={slug} />
          <input type="hidden" name="box" value={box.id} />
          <input type="hidden" name={OPENED} value={String(opened)} />
          {/* Nothing a person can see, so anything in it is a script. Named
              for something dull, because a field called "email" is one every
              password manager fills in for a real customer. */}
          <input
            type="text"
            name={TRAP}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />

          <section className="card space-y-3">
            <h2 className="font-bold">What is in it</h2>
            <ul className="space-y-3">
              {box.lines.map((line) => (
                <li key={line.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>
                      <span className="font-semibold">
                        {line.qty > 1 && `${line.qty} × `}
                        {swapped(line, swaps)?.name ?? line.name}
                      </span>
                      <span className="block text-muted">
                        {swapped(line, swaps)?.restaurant ?? line.restaurant}
                        {(swapped(line, swaps)?.choices ?? line.choices).length > 0 &&
                          ` · ${(swapped(line, swaps)?.choices ?? line.choices).join(", ")}`}
                      </span>
                    </span>
                  </div>

                  {line.swaps.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer list-none text-sm text-muted underline decoration-dotted underline-offset-4">
                        Swap
                      </summary>
                      <div className="mt-2 space-y-1">
                        {[
                          {
                            name: line.name,
                            restaurant: line.restaurant,
                            choices: line.choices,
                            delta: 0,
                          },
                          ...line.swaps,
                        ].map((option, index) => (
                            <label
                              key={`${line.id}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm odd:bg-black/[0.03]"
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`swap_${line.id}`}
                                  value={index - 1}
                                  checked={(swaps[line.id] ?? -1) === index - 1}
                                  onChange={() =>
                                    setSwaps((was) => ({ ...was, [line.id]: index - 1 }))
                                  }
                                />
                                <span>
                                  {option.name}
                                  {/* The choice, in the name itself where it
                                      is the only thing telling two rows
                                      apart. Spicy and crunchy are the same
                                      pot at the same price, and printing
                                      both as "POT Chicken (8 Pieces)" asks
                                      somebody to guess. */}
                                  {option.choices.length > 0 && (
                                    <span className="font-semibold">
                                      {" "}· {option.choices.join(", ")}
                                    </span>
                                  )}
                                  <span className="block text-xs text-muted">
                                    {option.restaurant}
                                  </span>
                                </span>
                              </span>
                              <span className="shrink-0 font-semibold text-muted">
                                {option.delta === 0
                                  ? index === 0
                                    ? "as packed"
                                    : "same price"
                                  : option.delta > 0
                                    ? `+${naira(option.delta)}`
                                    : `−${naira(-option.delta)}`}
                              </span>
                            </label>
                        ))}
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold">When do you want it?</h2>

            {/* Two models, and only ever one on screen.
                A match has a whistle, so it needs the real cars the shop is
                driving before it. A care package has to be found, bought and
                packed, so it needs a date and nothing else. Showing a
                fortnight of runs on a care package was thirty rows about days
                nobody asked for. */}
            {timed ? (
              <>
                <div className="-mx-4 overflow-x-auto px-4">
                  <div className="flex gap-2 pb-1">
                    {days.map((one) => (
                      <button
                        key={one.date}
                        type="button"
                        onClick={() => {
                          setDay(one.date);
                          setGoing(one.options[0]?.key ?? "");
                        }}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-center text-sm transition ${
                          one.date === day
                            ? "border-brand bg-brand-tint font-bold"
                            : "border-black/10"
                        }`}
                      >
                        <span className="block font-semibold">{one.weekday}</span>
                        <span className="block text-xs text-muted">{one.short}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  {(days.find((one) => one.date === day)?.options ?? []).map((one) => (
                    <label
                      key={one.key}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                        one.key === going ? "border-brand bg-brand-tint" : "border-black/10"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="when"
                          value={one.key}
                          checked={one.key === going}
                          onChange={() => setGoing(one.key)}
                        />
                        <span>
                          <span className="font-semibold">{one.window}</span>
                          <span className="block text-muted">
                            {one.onARun ? "On the run" : "A car of its own"}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {naira(
                          box.food +
                            (one.onARun ? box.runFee : box.carFee) +
                            moved(box, swaps)
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted">{note}</p>
              </>
            ) : (
              <>
                <input type="hidden" name="when" value={anyDay ? "anytime" : `day:${wantedOn}`} />

                <label
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    anyDay ? "border-black/10" : "border-brand bg-brand-tint"
                  }`}
                >
                  <span className="text-sm font-semibold">On a day I pick</span>
                  <input
                    type="date"
                    value={wantedOn}
                    min={soonest}
                    max={latest}
                    onChange={(event) => {
                      setWantedOn(event.target.value);
                      setAnyDay(false);
                    }}
                    onFocus={() => setAnyDay(false)}
                    className="field w-44 py-1.5 text-sm"
                  />
                </label>

                <label
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                    anyDay ? "border-brand bg-brand-tint" : "border-black/10"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={anyDay}
                    onChange={(event) => setAnyDay(event.target.checked)}
                  />
                  <span className="font-semibold">Any day is fine, tell me</span>
                </label>

                {/* One line, and it changes as they pick. A price that only
                    appears at the end is a price that feels like a catch. */}
                <p className="text-sm">
                  <span className="font-extrabold">
                    {naira(box.food + (rush ? box.carFee : box.runFee) + moved(box, swaps))}
                  </span>{" "}
                  <span className="text-muted">
                    {anyDay
                      ? "delivery in. We message you to agree the day."
                      : rush
                        ? `delivery in. Sooner than ${STANDARD_DAYS} days, so it is the rush price.`
                        : "delivery in."}
                  </span>
                </p>
              </>
            )}
          </section>

          {/* One tick. Everything it needs only appears once it is ticked,
              because a frequency nobody asked for is a field in the way. */}
          <section className="card space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={again}
                onChange={(event) => setAgain(event.target.checked)}
              />
              Send this again, every so often
            </label>

            {again && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="box_repeat">How often</label>
                  <select
                    id="box_repeat"
                    name="repeat"
                    defaultValue="monthly"
                    className="field"
                  >
                    <option value="weekly">Every week</option>
                    <option value="fortnightly">Every two weeks</option>
                    <option value="monthly">Every month</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="box_repeat_note">
                    When suits (optional)
                  </label>
                  <input
                    id="box_repeat_note"
                    name="repeat_note"
                    placeholder="Last Saturday of the month"
                    className="field"
                  />
                </div>
                <p className="text-xs text-muted sm:col-span-2">
                  Nothing charges itself. We set the next one up and message
                  you to pay, with whatever changes you made last time already
                  in it.
                </p>
              </div>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold">Where it goes</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="box_name">Your name</label>
                <input
                  id="box_name"
                  name="name"
                  defaultValue={me?.name ?? ""}
                  required
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="box_phone">Your number</label>
                <input
                  id="box_phone"
                  name="phone"
                  inputMode="tel"
                  required
                  className="field"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="box_hostel">Which block it goes to</label>
              {hostels.length > 0 ? (
                <select
                  id="box_hostel"
                  name="hostel"
                  defaultValue={me?.hostel ?? ""}
                  required
                  className="field"
                >
                  <option value="">Pick one</option>
                  {hostels.map((one) => (
                    <option key={one} value={one}>{one}</option>
                  ))}
                </select>
              ) : (
                <input id="box_hostel" name="hostel" defaultValue={me?.hostel ?? ""} required className="field" />
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["transfer", "Bank transfer", "Account details next, with a four-digit number for the narration."],
                  ["card", "Card", "We send the link to your WhatsApp after you order."],
                ] as const
              ).map(([value, title, detail]) => (
                <label
                  key={value}
                  className="rounded-xl border border-black/10 p-3 text-left has-[:checked]:border-brand has-[:checked]:bg-brand-tint"
                >
                  <input
                    type="radio"
                    name="payment"
                    value={value}
                    defaultChecked={(me?.paymentMethod ?? "transfer") === value}
                    className="sr-only"
                  />
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-muted">{detail}</span>
                </label>
              ))}
            </div>

            {/* Buying it for somebody else. Folded away, because most
                orders are for whoever is typing and an extra pair of
                boxes on every checkout is a tax on all of them. */}
            <details className="rounded-xl bg-black/[0.03] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand">
                It is a gift for somebody else
              </summary>
              <p className="mt-2 text-xs text-muted">
                Fill these in and it goes to them instead. You pay, and we
                deal with you about the money. The block above is theirs, and
                these are who we call when it is at their door. Leave them
                blank and it comes to you.
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="gift_name">Their name</label>
                  <input id="gift_name" name="gift_name" className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="gift_phone">Their number</label>
                  <input id="gift_phone" name="gift_phone" inputMode="tel" className="field" />
                </div>
              </div>
            </details>

            {/* A box is written at a high level on purpose: "a cake", "a
                flower". Everything below that level is where somebody's own
                birthday lives, and a box that cannot hold "vanilla, twelve
                inches, write Happy Birthday Ada on it" is a box they will
                not buy.

                Nothing here is priced automatically, and it must not be:
                twelve inches is not eight inches. So it says plainly that a
                change can cost more and that we will say how much on
                WhatsApp before anybody pays a naira of it. */}
            <fieldset className="rounded-xl border border-brand/25 bg-brand-tint/40 p-3">
              <legend className="px-1 text-sm font-extrabold">
                Want it changed?
              </legend>
              <label className="label sr-only" htmlFor="box_note">
                What you want changed
              </label>
              <p className="mb-1.5 text-xs leading-relaxed text-ink/75">
                The box says what is in it, not which one. Say here if you want
                a flavour, a size, a colour, or something written on it. To
                change a whole item, use Swap above.
              </p>
              <textarea
                id="box_note"
                name="note"
                rows={3}
                maxLength={500}
                placeholder="Vanilla cake, 12 inches, write Happy Birthday Ada. Red roses if you have them. Room 12, call me when you are outside."
                className="field"
              />
              {/* Said out loud and ticked, rather than guessed from whether
                  they typed anything: "room 12, call me outside" is not a
                  change to the price, and an order quietly marked provisional
                  over it would be a number nobody trusts. */}
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input type="checkbox" name="custom" className="mt-0.5" />
                <span>
                  <span className="font-bold">
                    Tick this if what you wrote changes what is in it.
                  </span>{" "}
                  <span className="text-ink/75">
                    Then the total here is not the final one. We work out what
                    the change costs, message you on WhatsApp, and your order
                    page updates before you pay a naira of it.
                  </span>
                </span>
              </label>
            </fieldset>

            {promoters.length > 0 && !me && (
              <div>
                <label className="label" htmlFor="box_heard">Where did you hear about us?</label>
                <select id="box_heard" name="heard_from" defaultValue="" className="field">
                  <option value="">Nowhere in particular</option>
                  {promoters.map((one) => (
                    <option key={one.code} value={one.code}>{one.name}</option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {state.error !== "" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || going === ""}
            className="btn-primary w-full py-3.5 text-base"
          >
            {busy
              ? "Placing…"
              : `Order this box · ${naira(
                  box.food + (car?.onARun === false ? box.carFee : box.runFee) + moved(box, swaps)
                )}`}
          </button>
        </form>
      )}

      {extras.length > 0 && box && !shut && (
        <p className="text-sm text-muted">
          {extras[0].name} rides the same car: {extras[0].blurb || "ask on WhatsApp"}.
        </p>
      )}
    </div>
  );
}

/** What the swaps they picked have done to the price. */
function moved(box: BoxView, swaps: Record<string, number>): number {
  return box.lines.reduce((sum, line) => {
    const pick = swaps[line.id];
    return sum + (pick !== undefined && pick >= 0 ? (line.swaps[pick]?.delta ?? 0) : 0);
  }, 0);
}

const swapped = (
  line: BoxView["lines"][number],
  swaps: Record<string, number>
) => {
  const pick = swaps[line.id];
  return pick !== undefined && pick >= 0 ? line.swaps[pick] ?? null : null;
};
