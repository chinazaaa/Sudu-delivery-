"use client";

import { useMemo, useState } from "react";
import { useKeepPlace } from "@/components/useKeepPlace";
import { naira } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";
import type { PricedGroup } from "@/lib/laundry";

/**
 * The laundry list as something you tap, rather than something you read.
 *
 * It began as a price sheet: two hundred and eighty rows in folded
 * sections, every one of them true and none of them answering the question
 * somebody actually has, which is what their own bag comes to. Nobody sits
 * and reads a tariff.
 *
 * So it is a shop. Tap the things you have, watch the number move, and the
 * list you built is the message you send. The minimum stops being a rule
 * in a paragraph and becomes a bar that fills, which is the difference
 * between being told you are too small and being shown how close you are.
 *
 * It takes no money. Laundry is counted at your door and paid for when it
 * comes back, so the end of this is a message with an itemised list in it,
 * not a card.
 */
/** The one option that is not a weekday: a collection on a day of its own. */
const OTHER_DAY = "Another day";

export default function LaundryPicker({
  groups,
  minimum,
  note,
  whatsapp,
  opening,
  days,
  otherDay,
  window: comes,
  back,
}: {
  groups: PricedGroup[];
  minimum: number;
  note: string;
  whatsapp: string;
  opening: string;
  /** The days the car goes, from admin rather than from here. */
  days: string[];
  /** What a day of its own costs on top. Zero and it is not offered. */
  otherDay: number;
  /** When on the day we come, and when it comes back. Windows rather
   *  than times: the round of blocks is not ordered until the list
   *  closes, so a time would be a promise nobody can keep. */
  window: string;
  back: string;
}) {
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(groups[0]?.name ?? "");
  const [day, setDay] = useState("");
  /* Opening a section closes the tall one above it, so the heading you
     tapped has to be put back where you tapped it. */
  const { hold, keep } = useKeepPlace(open);

  const priceOf = useMemo(() => {
    const all = new Map<string, number>();
    for (const group of groups) {
      for (const one of group.items) all.set(one.name, one.price);
    }
    return all;
  }, [groups]);

  const lines = Object.entries(picked).filter(([, qty]) => qty > 0);
  /* A day that is not one of the shared ones is a trip for one person, and
     it is priced the way the food side prices one. */
  const offSchedule = day === OTHER_DAY;
  const items = lines.reduce((total, [, qty]) => total + qty, 0);
  const total = lines.reduce(
    (sum, [name, qty]) => sum + (priceOf.get(name) ?? 0) * qty,
    0
  );
  const extra = offSchedule ? otherDay : 0;
  const short = Math.max(0, minimum - total);

  const set = (name: string, qty: number) =>
    setPicked((was) => ({ ...was, [name]: Math.max(0, Math.min(99, qty)) }));

  /* Searching across everything, because somebody looking for "duvet" does
     not know we filed it under Household. An empty box leaves the sections
     as they are, which is how it reads when nobody is looking for one
     thing in particular. */
  const words = typed.trim().toLowerCase();
  const found =
    words === ""
      ? null
      : groups
          .flatMap((group) =>
            group.items
              .filter((one) => one.name.toLowerCase().includes(words))
              .map((one) => ({ ...one, group: group.name }))
          )
          .slice(0, 40);

  // Their own list, written out, so the message says exactly what we are
  // coming for and nobody has to describe a bag in prose.
  const message =
    opening +
    (lines.length > 0
      ? "\n\n" +
        lines
          .map(
            ([name, qty]) =>
              `${qty} x ${name} — ${naira((priceOf.get(name) ?? 0) * qty)}`
          )
          .join("\n") +
        `\n\nTotal: ${naira(total)}` +
        (extra > 0 ? `\nAnother day: ${naira(extra)}` : "")
      : "") +
    (day !== ""
      ? `\nCollection: ${day}${comes !== "" ? `, ${comes.toLowerCase()}` : ""}`
      : "");
  const link = waLink(whatsapp || null, message);

  const Stepper = ({ name, price }: { name: string; price: number }) => {
    const qty = picked[name] ?? 0;
    return (
      <li className="flex items-center justify-between gap-3 py-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug">{name}</span>
          <span className="block font-mono text-sm font-semibold text-muted">
            {naira(price)}
          </span>
        </span>
        {qty > 0 ? (
          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-ink p-0.5 text-white">
            <button
              type="button"
              aria-label={`One less ${name}`}
              onClick={() => set(name, qty - 1)}
              className="grid size-9 place-items-center rounded-full text-lg leading-none"
            >
              −
            </button>
            <span className="min-w-5 text-center font-mono font-semibold">{qty}</span>
            <button
              type="button"
              aria-label={`One more ${name}`}
              onClick={() => set(name, qty + 1)}
              className="grid size-9 place-items-center rounded-full bg-brand text-lg leading-none"
            >
              +
            </button>
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Add ${name}`}
            onClick={() => set(name, 1)}
            className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-brand text-white shadow-press"
          >
            <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        )}
      </li>
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
        Build your bag
      </h2>
      <div className="max-w-[760px] space-y-2.5 leading-relaxed text-ink/80">
        <p>
          Tap what you have and the total works itself out. Collection from
          your block and the trip back are included in these prices.
          {comes !== "" ? ` We come ${comes.toLowerCase()} on the day you pick` : ""}
          {comes !== "" && back !== "" ? `, and it is back ${back.toLowerCase()}.` : comes !== "" ? "." : ""}
        </p>
        {comes !== "" && (
          <p>
            A window rather than a time, because the driver does a round of
            blocks and which one is first depends on who is on the list that
            morning. We message you the day before with where you are in it.
          </p>
        )}
        {note !== "" && <p>{note}</p>}
      </div>

      <div className="relative">
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Search: shirt, duvet, agbada…"
          aria-label="Search the laundry list"
          className="field py-3.5 pl-11"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
      </div>

      {found ? (
        <div className="card">
          {found.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing on the list matches that. Ask us and we will price it.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {found.map((one) => (
                <Stepper key={one.name} name={one.name} price={one.price} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const mine = group.items.reduce(
              (count, one) => count + (picked[one.name] ?? 0),
              0
            );
            return (
              <div key={group.name} className="card">
                <button
                  type="button"
                  ref={keep(group.name)}
                  onClick={() => {
                    hold(group.name);
                    setOpen(open === group.name ? "" : group.name);
                  }}
                  aria-expanded={open === group.name}
                  className="flex w-full items-center justify-between gap-3 text-left font-semibold"
                >
                  <span>
                    {group.name}
                    {mine > 0 && (
                      <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
                        {mine}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-normal text-muted">
                    {open === group.name ? "Close" : `${group.items.length} items`}
                  </span>
                </button>
                {open === group.name && (
                  <ul className="mt-2 divide-y divide-black/5">
                    {group.items.map((one) => (
                      <Stepper key={one.name} name={one.name} price={one.price} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="max-w-[760px] text-sm text-muted">
        Anything not on the list, ask and we will price it. A stain that
        needs treating is its own line and we tell you before it is done,
        never after.
      </p>

      {/* The bar only exists once there is something in the bag, and it is
          the whole of the rest of the page from that moment. */}
      {items > 0 && (
        <div
          data-actionbar
          className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 px-3 sm:bottom-3"
        >
          <div className="mx-auto max-w-2xl space-y-2 rounded-2xl border-2 border-ink bg-paper p-3 shadow-bar">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold">
                {items} item{items === 1 ? "" : "s"}
              </span>
              <span className="font-display text-2xl font-black leading-none">
                {naira(total + extra)}
              </span>
            </div>

            {/* The minimum as a thing filling up rather than a rule in a
                paragraph: being shown how close you are beats being told
                you are too small. */}
            {minimum > 0 && (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.min(100, (total / minimum) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted">
                  {short > 0
                    ? `${naira(short)} more to reach the ${naira(minimum)} collection. Add a few things, or go in with somebody in your hostel.`
                    : `Over the ${naira(minimum)} minimum. We can come for this.`}
                </p>
              </>
            )}

            {/* Said rather than quietly added, because a number that
                changes when you tap a day is the number people remember
                getting wrong. */}
            {extra > 0 && (
              <p className="text-xs font-semibold text-ink">
                {naira(total)} of washing and {naira(extra)} for a day of its
                own, which is a trip we make for you alone.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {[...days, ...(otherDay > 0 ? [OTHER_DAY] : [])].map((one) => (
                <button
                  key={one}
                  type="button"
                  onClick={() => setDay(day === one ? "" : one)}
                  aria-pressed={day === one}
                  className={`chip text-sm ${
                    day === one
                      ? "border-ink bg-ink text-white"
                      : "border-black/10 bg-shell text-muted"
                  }`}
                >
                  {one === OTHER_DAY ? `${OTHER_DAY} · +${naira(otherDay)}` : one}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPicked({})}
                className="chip border-black/10 bg-shell text-sm text-muted"
              >
                Clear
              </button>
            </div>

            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary block py-3 text-center"
              >
                {short > 0 ? "Send it anyway and ask" : "Send this list on WhatsApp"}
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
