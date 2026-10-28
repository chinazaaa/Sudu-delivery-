"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { orderBox, type BoxOrderState } from "@/app/collections/actions";
import type { BoxView, WhenOption } from "@/lib/box-view";
import Thumb from "./Thumb";
import { naira } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";
import { OPENED, TRAP } from "@/lib/guard";
import AbroadMoney, { type Money } from "./AbroadMoney";
import { STANDARD_DAYS } from "@/lib/box-day";
import HeardFrom from "./HeardFrom";

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
  hint = "",
  monies = [],
  today,
  soonest,
  latest,
  hostels,
  promoters,
  sentBy = "",
  me,
  note,
  shut,
  seasonal = false,
  only = false,
  whatsapp = "",
}: {
  slug: string;
  boxes: BoxView[];
  when: WhenOption[];
  /** A thing with a whistle: a match, a kick-off. Those pick a real car out
   *  of the ones the shop is driving. Everything else picks a date. */
  timed: boolean;
  /** What to suggest in the "want it changed?" box, in the words of this
   *  shelf. Empty falls back to something true of every box. */
  hint?: string;
  /** The currencies a card link can be made out in, where somebody abroad is
   *  paying. Empty where that is switched off. */
  monies?: Money[];
  /** Today on the shop's clock, the soonest day a box can be packed for at
   *  the standard price, and the furthest ahead worth planning. All three
   *  worked out on the server: a phone's clock is anybody's guess, and a
   *  page left open overnight has yesterday's.
   *
   *  The floor under the picker is today, not `soonest`. Sooner than two
   *  clear days is allowed and costs the rush price, which is the whole
   *  point of the line under it; flooring at `soonest` made that line
   *  unreachable and, in a browser lenient about `min`, let a day that has
   *  already been through in its place. */
  today: string;
  soonest: string;
  latest: string;
  hostels: string[];
  promoters: { code: string; name: string }[];
  /** Whose link they arrived on, already checked against the live list. */
  sentBy?: string;
  me: { name: string; hostel: string; paymentMethod: "transfer" | "card" } | null;
  note: string;
  shut: boolean;
  /** A shelf with a season of its own: Christmas, not foodstuff. Nobody
   *  wants a hamper again every month, so the standing order is left off
   *  rather than sitting there as a question with one sensible answer. */
  seasonal?: boolean;
  /** One box, on a page of its own: no shelf of tiles above it, and it is
   *  chosen the moment the page opens because choosing it is why somebody
   *  is here. */
  only?: boolean;
  /** Where "Customise" goes. Empty leaves the button off rather than
   *  sending anybody to a dead link. */
  whatsapp?: string;
}) {
  const router = useRouter();
  const [state, act, busy] = useActionState<BoxOrderState, FormData>(orderBox, {
    error: "",
  });

  const meals = boxes.filter((one) => !one.isExtra);
  const extras = boxes.filter((one) => one.isExtra);

  const [picked, setPicked] = useState(only ? (boxes[0]?.id ?? "") : "");
  const [swaps, setSwaps] = useState<Record<string, number>>({});
  const [going, setGoing] = useState(when[0]?.key ?? "");
  const [day, setDay] = useState(when[0]?.date ?? "");
  const [wantedOn, setWantedOn] = useState(soonest);
  const [anyDay, setAnyDay] = useState(false);
  const [again, setAgain] = useState(false);
  /* Where it goes, when that is not a block on campus. The same toggle the
     skincare counter has had for a while: a hamper is carried rather than
     driven hot, so it can reach a house in Awoyaya on any day. */
  const [inPau, setInPau] = useState(true);
  const [address, setAddress] = useState("");
  /* Most of these are bought for somebody else, so the driver needs the
     person at the door rather than the person who paid. Blank means it is
     for the buyer, which is the quieter half of the time. */
  const [forSomeone, setForSomeone] = useState(false);
  const [block, setBlock] = useState(me?.hostel ?? "");
  const [pay, setPay] = useState<"transfer" | "card">(me?.paymentMethod ?? "transfer");
  const [money, setMoney] = useState("");

  // Sooner than the shop can comfortably find it, buy it and pack it. It
  // is still allowed and still costs the same: a box has one delivery
  // price now, and the rush price it used to carry was the car fee, which
  // is the one thing a box no longer does. Kept only to say so.
  const rush = !anyDay && wantedOn !== "" && wantedOn >= today && wantedOn < soonest;

  // A day that has already been. `min` on a date field is a hint rather than
  // a rule in some browsers, and it can be typed into besides, so the page
  // says so plainly instead of quoting a rush price for last month. The
  // server refuses it too; this is so nobody gets that far.
  const gone = !anyDay && wantedOn !== "" && wantedOn < today;

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

  // Down to what is in the box. Waits a moment because on the first pick
  // the form is not on the page yet: it is drawn by the same render that
  // chose the box.
  const goToRest = (showSwaps = false) => {
    setTimeout(() => {
      rest.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

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

  /** A message that already says which box it is about, so nobody has to
   *  explain themselves twice. */
  const chatAbout = (name: string) =>
    waLink(
      whatsapp,
      `Hi Sudu, I want the ${name}, with some changes. Here is what I would like in it:`
    ) ?? "";

  const priceOf = (one: BoxView) =>
    one.food +
    one.runFee +
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

      {/* The boxes themselves, as the board draws them: what is in it on
          the left with a tick against every line, and what it costs on a
          panel of its own down the right with the button on it.

          One price each, delivery in it, and the price moves with the car
          rather than pretending it does not. */}
      {/*
          A shelf, laid out like the shop.

          These were full-width boards, one under another: a column of
          contents on the left and a price panel on the right, each as tall
          as a phone screen. Four of them was four screens of scrolling
          before anybody had seen what the fourth one was, and nothing could
          be compared with anything else.

          Every shop selling hampers lays them out as cards you can see at
          once, and so does the rest of this shop: the kitchens, the kinds,
          the most-bought row. The contents stay in full, because what is in
          it is the only question anybody has, and the price stays big.
      */}
      {!only && (
      <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {meals.map((one) => {
          const on = one.id === picked;
          const howMany = one.contents.length || one.lines.length;
          return (
            <li key={one.id}>
              {/*
                  One tile, the same shape as every other tile in the shop.

                  These were full-width boards, and then full-width cards: a
                  photograph the height of a phone screen on the ones that
                  had a photograph, and a short stub of text on the ones that
                  did not. Scrolling past them, no two were the same size,
                  which is what made the shelf unreadable. A tile is a
                  square picture, a name and a price, and it is the same
                  square whether or not there is a photograph yet.
              */}
              {/* A page of its own where it has one: a hamper is a thing
                  somebody searches for, sends to their sister and comes
                  back to, and none of that works at a shelf's address.
                  Everything else is still picked in place. */}
              <Tile
                href={one.slug === "" ? "" : `/hampers/${one.slug}`}
                onPick={() => setPicked(on ? "" : one.id)}
                on={on}
              >
                <span className="block aspect-square border-b-2 border-ink">
                  <Thumb src={one.imageUrl} name={one.name} rounded="" />
                </span>

                <span className="flex flex-1 flex-col gap-1.5 p-3">
                  {one.serves !== "" && (
                    <span className="ticket block text-brand-dark">{one.serves}</span>
                  )}
                  <span className="line-clamp-2 text-[15px] font-semibold leading-snug">
                    {one.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {howMany} thing{howMany === 1 ? "" : "s"} in it · delivery in
                    the price
                  </span>

                  <span className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-1.5">
                    <span className="font-display text-2xl font-extrabold leading-none">
                      {naira(priceOf(one))}
                    </span>
                    <span
                      aria-hidden
                      className={`ml-auto grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink shadow-press ${
                        on ? "bg-ink text-white" : "bg-brand text-white"
                      }`}
                    >
                      {on ? (
                        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12.5 9 17.5 20 6.5" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      )}
                    </span>
                  </span>
                </span>
              </Tile>
            </li>
          );
        })}
      </ul>

      {/* One of these for the shelf rather than one per tile. Nothing on a
          shelf is quite what somebody had in mind, and the answer to that
          is the same conversation whichever tile they were looking at. */}
      {chatAbout(meals[0]?.name ?? "") !== "" && (
        <p className="text-sm text-ink/75">
          Want one made up differently?{" "}
          <a
            href={chatAbout(box?.name ?? meals[0]?.name ?? "")}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand underline-offset-4 hover:underline"
          >
            Tell us what to put in it
          </a>
          .
        </p>
      )}

      </>
      )}

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
            {/* A package is written out rather than totted up: it is sold at
                one price, and what is in it is the shop's description of it
                rather than a receipt. */}
            {box.contents.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {box.contents.map((one) => (
                  <li key={one} className="flex gap-2">
                    <span aria-hidden className="text-brand">·</span>
                    <span>{one}</span>
                  </li>
                ))}
              </ul>
            ) : (
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

                </li>
              ))}
            </ul>
            )}
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
                            On the run
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {naira(
                          box.food +
                            box.runFee +
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
                    min={today}
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
                    appears at the end is a price that feels like a catch.
                    A day that has already been gets no price at all: quoting
                    one for it says the shop will do something it cannot. */}
                {gone ? (
                  <p className="text-sm font-semibold text-brand-dark">
                    That day has gone. Pick today or later.
                  </p>
                ) : (
                  <p className="text-sm">
                    <span className="font-extrabold">
                      {naira(box.food + box.runFee + moved(box, swaps))}
                    </span>{" "}
                    <span className="text-muted">
                      {anyDay
                        ? "delivery in it. We message you to agree the day."
                        : rush
                          ? `delivery in it. Sooner than ${STANDARD_DAYS} days, so we will confirm we can pack it in time.`
                          : "delivery in it."}
                    </span>
                  </p>
                )}
              </>
            )}
          </section>

          {/* One tick. Everything it needs only appears once it is ticked,
              because a frequency nobody asked for is a field in the way.
              Off a seasonal shelf altogether: a hamper comes once. */}
          {!seasonal && (
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
                  Nothing charges itself. We message you each time to pay.
                </p>
              </div>
            )}
          </section>
          )}

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
            <div className="space-y-2">
              <span className="label">Where it goes</span>
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
                hostels.length > 0 ? (
                  <select
                    aria-label="Which block"
                    value={block}
                    onChange={(event) => setBlock(event.target.value)}
                    className="field"
                  >
                    <option value="">Pick a block</option>
                    {hostels.map((one) => (
                      <option key={one} value={one}>{one}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    aria-label="Which block"
                    value={block}
                    onChange={(event) => setBlock(event.target.value)}
                    className="field"
                  />
                )
              ) : (
                <>
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    rows={3}
                    placeholder="Street, estate, area, and anything the driver needs to find it"
                    aria-label="The address in Lagos"
                    className="field"
                  />
                  <span className="block text-xs text-muted">
                    Anywhere in Lagos. Outside Lagos we cannot bring it.
                  </span>
                </>
              )}
              {/* One field reaches the server whichever was filled in,
                  because an order has one place it is going. */}
              <input
                type="hidden"
                name="hostel"
                value={inPau ? block : address}
              />
            </div>

            {/*
                Who the driver rings.

                Most hampers are bought for somebody else, and the number on
                the order was always the buyer's: the driver would ring the
                person who paid, standing somewhere else entirely, to ask
                where to bring a basket. Off by default, because the other
                half of the time it really is for them.
            */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={forSomeone}
                  onChange={(event) => setForSomeone(event.target.checked)}
                />
                It is a gift for somebody else
              </label>

              {forSomeone && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-xs text-muted sm:col-span-2">
                    You pay and we deal with you about the money. These are
                    who we ring when it is at the door.
                  </p>
                  <div>
                    <label className="label" htmlFor="box_gift_name">
                      Their name
                    </label>
                    <input id="box_gift_name" name="gift_name" className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="box_gift_phone">
                      Their number
                    </label>
                    <input
                      id="box_gift_phone"
                      name="gift_phone"
                      inputMode="tel"
                      className="field"
                      placeholder="The driver rings this one"
                    />
                  </div>
                </div>
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
                    checked={pay === value}
                    onChange={() => setPay(value)}
                    className="sr-only"
                  />
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-muted">{detail}</span>
                </label>
              ))}
            </div>

            {/* A mother in London cannot make a Nigerian transfer, and a
                care package is exactly the thing she is buying. */}
            {pay === "card" && (
              <>
                <input type="hidden" name="pay_currency" value={money} />
                <AbroadMoney
                  monies={monies}
                  value={money}
                  onChange={setMoney}
                  total={box ? priceOf(box) : 0}
                />
              </>
            )}

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
              <p className="mb-1.5 text-xs text-ink/75">
                A flavour, a size, a colour, something written on it.
              </p>
              <textarea
                id="box_note"
                name="note"
                rows={3}
                maxLength={500}
                placeholder={
                  // This box's own suggestion first. "Write Congratulations
                  // Ada on it" is good advice on the box with a cake in it
                  // and nonsense on the one holding cupcakes, which nobody
                  // can write on.
                  box?.customHint || hint || "Say what you would like different about it"
                }
                className="field"
              />
              {/* A message on the card and a change to the box are two
                  different things, and saying "anything you write here can
                  change the price" makes the first sound like the second.
                  Somebody writing "Congratulations Ada" should not be left
                  wondering what those three words will cost. */}
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                A message on the card is free. Changing what is in the box, a
                different flavour, a bigger size, an extra thing, can cost
                more. Nothing is charged now: we work it out, message you on
                WhatsApp, and your order page updates before you pay.
              </p>
            </fieldset>

            {!me && <HeardFrom promoters={promoters} sentBy={sentBy} />}
          </section>

          {state.error !== "" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            /* A thing with a whistle needs a car picked. Everything else
               needs a day that has not already been: the server refuses one
               anyway, and letting them reach it only to be turned back is a
               worse way to say the same thing. `going` is only a car, so it
               has nothing to say about a box that travels on a date. */
            disabled={busy || (timed ? going === "" : gone)}
            className="btn-primary w-full py-3.5 text-base"
          >
            {busy
              ? "Placing…"
              : `Order this box · ${naira(
                  box.food + box.runFee + moved(box, swaps)
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

/**
 * One tile on a shelf: a link where the box has a page, a button where it
 * does not.
 *
 * The same square either way. A box with an address of its own has to be a
 * real link, so it can be opened in another tab, copied, sent to somebody
 * and followed by a search engine; a box without one still has to pick
 * itself in place, which a link cannot do.
 */
function Tile({
  href,
  onPick,
  on,
  children,
}: {
  href: string;
  onPick: () => void;
  on: boolean;
  children: React.ReactNode;
}) {
  const look = `flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 bg-paper text-left transition ${
    on ? "border-brand shadow-card" : "border-ink"
  }`;

  if (href !== "") {
    return (
      <Link href={href} className={look}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onPick} aria-pressed={on} className={look}>
      {children}
    </button>
  );
}
