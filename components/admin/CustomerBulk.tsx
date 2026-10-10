"use client";

import { createContext, useContext, useMemo, useState } from "react";
import PageHeader from "@/components/admin/PageHeader";
import { whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";
/*
 * The cuts, the address of the message screen and the two shapes they are
 * written in all live in lib/customer-views, outside this file. The address
 * is built in here as well as on the pages, so it is imported; neither it
 * nor the cuts are re-exported.
 *
 * This module is a client component. A server page that imports a value out
 * of one is not handed the value: the bundler gives it a reference to
 * something that only exists in the browser, and the first time the server
 * dots into it the render throws. Both server pages that draw this composer
 * read the cuts and build that address, so both have to reach the real
 * module themselves.
 */
import { broadcastHref, type Pattern, type Picked } from "@/lib/customer-views";

/* The two shapes travel on, because every caller that takes a list of
   people also renders something from this file. A type is erased at build
   time, so passing one through a client module costs nothing and cannot
   become a browser-only reference. */
export type { Pattern, Picked };

type Holding = {
  on: Set<string>;
  people: Picked[];
  toggle: (phone: string) => void;
  setAll: (phones: string[]) => void;
  draft: string;
  setDraft: (text: string) => void;
  patterns: Pattern[];
};

const Held = createContext<Holding | null>(null);

/**
 * Ticking several people and writing one message to all of them.
 *
 * The state lives here rather than on the page so the list itself stays a
 * server component: every row is still rendered on the server with its real
 * figures, and only the tick beside it knows anything about React.
 */
export function Picking({
  people,
  patterns,
  start,
  opening = "",
  children,
}: {
  people: Picked[];
  patterns: Pattern[];
  /** Who is ticked to begin with. The book starts with nobody; the phone's
   *  message screen starts with everybody it was handed in the address,
   *  because the picking already happened on the page before it. */
  start?: string[];
  /** The message already in the box. Used where the screen was opened from
   *  a button that named a template, so the owner lands on the wording
   *  rather than on an empty box. */
  opening?: string;
  children: React.ReactNode;
}) {
  const [on, setOn] = useState<Set<string>>(() => new Set(start ?? []));
  const [draft, setDraft] = useState(opening);

  const value = useMemo<Holding>(
    () => ({
      on,
      people,
      patterns,
      draft,
      setDraft,
      toggle: (phone) =>
        setOn((was) => {
          const next = new Set(was);
          if (next.has(phone)) next.delete(phone);
          else next.add(phone);
          return next;
        }),
      // Everybody shown, or nobody, which is the one thing a header tick
      // is for.
      setAll: (phones) =>
        setOn((was) => (was.size >= phones.length ? new Set() : new Set(phones))),
    }),
    [on, people, patterns, draft]
  );

  return <Held.Provider value={value}>{children}</Held.Provider>;
}

/** The tick beside one person. */
export function Tick({
  phone,
  name,
  tap = false,
}: {
  phone: string;
  name: string;
  /** Forty-four pixels of label around the box, for the card on a phone.
   *  The six rules put a floor under a tap target, and a seventeen pixel
   *  checkbox sitting beside a link the size of the card is a tick nobody
   *  can hit without opening the person instead. */
  tap?: boolean;
}) {
  const held = useContext(Held);
  if (!held) return null;

  return (
    <label
      className={`flex cursor-pointer items-center ${
        tap ? "-m-1 size-11 shrink-0 justify-center" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={held.on.has(phone)}
        onChange={() => held.toggle(phone)}
        aria-label={`Pick ${name}`}
        className="size-[17px] accent-brand"
      />
    </label>
  );
}

/** The tick in the header, which takes everybody shown or lets them all go. */
export function TickAll({ label }: { label?: string }) {
  const held = useContext(Held);
  if (!held) return null;
  const phones = held.people.map((one) => one.phone);

  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={phones.length > 0 && held.on.size >= phones.length}
        onChange={() => held.setAll(phones)}
        aria-label="Pick everybody shown"
        className="size-[17px] accent-brand"
      />
      {/* Named where there is no column heading to say what it does, which
          is the list of cards on a phone. */}
      {label !== undefined && <span className="hint">{label}</span>}
    </label>
  );
}

/** Who is ticked, in the order the list shows them. */
function chosen(held: Holding): Picked[] {
  return held.people.filter((one) => held.on.has(one.phone));
}

/**
 * The bar that appears once anything is ticked.
 *
 * On a desk it is the dark strip over the table, where the mouse already is
 * and there is room for every answer at once. On a phone the board puts the
 * two that matter at the bottom of the screen under the thumb, and the
 * composer is a screen of its own rather than a card the list has to be
 * scrolled past, so Message is a link to it carrying the people along.
 *
 * Nothing on either claims to send anything. The message buttons load a
 * template and leave the sending to the owner, because WhatsApp opens one
 * chat at a time whatever a button says.
 */
export function Bar({
  viewLabel,
  codeHref,
  view = "",
  by = "",
  q = "",
}: {
  viewLabel: string;
  codeHref: string;
  /** The cut the list is on, so the way back out of the message screen is
   *  this list rather than everybody. */
  view?: string;
  by?: string;
  q?: string;
}) {
  const held = useContext(Held);
  if (!held || held.on.size === 0) return null;

  const picked = chosen(held);
  const worth = picked.reduce((total, one) => total + one.spend, 0);
  const load = (kind: string) => {
    const pattern = held.patterns.find((one) => one.kind === kind);
    if (pattern) held.setDraft(pattern.body);
  };

  // The book as a spreadsheet, made here rather than asked of the server:
  // everything in it is already on this page.
  const exportThem = () => {
    const head = "Name,Phone,Block,PIN,Orders,Spent\n";
    const body = picked
      .map((one) =>
        [one.name, one.phone, one.block, one.pin, String(one.orders), String(one.spend)]
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const file = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = file;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(file);
  };

  const phones = picked.map((one) => one.phone);
  const asking = held.patterns.some((one) => one.kind === "google")
    ? "google"
    : held.patterns.some((one) => one.kind === "review")
      ? "review"
      : "";

  return (
    <>
      {/* The phone's own bar, fixed over the list and under the tab bar. */}
      <div className="phone-bar flex items-center gap-2">
        <strong className="grow text-sm">{held.on.size} selected</strong>
        {asking !== "" && (
          <a
            href={broadcastHref({ phones, view, by, q, start: asking })}
            className="btn-admin btn-admin-sm"
          >
            Ask for a review
          </a>
        )}
        <a
          href={broadcastHref({ phones, view, by, q })}
          className="btn-admin-go btn-admin-sm min-h-[42px]"
        >
          Message
        </a>
      </div>

      <div className="mb-3.5 hidden flex-wrap items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-shell lg:flex">
        <strong className="text-sm">{held.on.size} selected</strong>
        <span className="text-[13.5px] opacity-60">
          {viewLabel === "" ? "" : `${viewLabel} · `}
          {naira(worth)} lifetime
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <a
            href="#send-a-message"
            className="btn-admin btn-admin-sm border-brand bg-brand text-white hover:bg-brand-dark"
          >
            Send a WhatsApp
          </a>
          {held.patterns.some((one) => one.kind === "google" || one.kind === "review") && (
            <a
              href="#send-a-message"
              onClick={() =>
                load(held.patterns.some((one) => one.kind === "google") ? "google" : "review")
              }
              className="btn-admin btn-admin-sm btn-admin-dark"
            >
              Ask for a review
            </a>
          )}
          <a
            href="#send-a-message"
            onClick={() => load("pin")}
            className="btn-admin btn-admin-sm btn-admin-dark"
          >
            Send PINs
          </a>
          <a
            href={codeHref}
            className="btn-admin btn-admin-sm btn-admin-dark"
          >
            Give them a code
          </a>
          <button
            type="button"
            onClick={exportThem}
            className="btn-admin btn-admin-sm btn-admin-dark"
          >
            Export
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * The gap the phone bar stands in, at the end of the page.
 *
 * A fixed bar is out of the flow, so without this the last person in the
 * list sits under it and cannot be read or tapped. It knows whether the bar
 * is showing, because a permanent gap above the tab bar on a page where
 * nobody is ticked is a hole in the page.
 */
export function Room() {
  const held = useContext(Held);
  if (!held || held.on.size === 0) return null;
  return <div aria-hidden className="h-[72px] lg:hidden" />;
}

/** Fills a draft in for one person. Anything else is left exactly as typed. */
function fill(text: string, who: Picked): string {
  return text
    .replaceAll("{name}", who.greet)
    .replaceAll("{block}", who.block || "your block")
    .replaceAll("{pin}", who.pin || "----");
}

/**
 * The composer beside the table.
 *
 * It writes one message and hands over one WhatsApp link per person, each
 * with that person's own name in it. There is no broadcast here and there
 * cannot be: WhatsApp opens a single chat at a time, so the honest thing is
 * to show the owner the list and let her tap down it. A button claiming to
 * have sent nine messages would be a button that sent none.
 */
export function Composer({ hasOwnNumber }: { hasOwnNumber: boolean }) {
  const held = useContext(Held);
  const [handing, setHanding] = useState(false);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  if (!held) return null;

  const picked = chosen(held);
  const first = picked[0] ?? null;
  const ready = held.draft.trim() !== "" && picked.length > 0;

  return (
    <section className="card p-5" id="send-a-message">
      <h2 className="font-display text-2xl font-black uppercase leading-none">Send a message</h2>
      <p className="hint mb-3 mt-1">
        {picked.length === 0
          ? "Tick anybody in the list and the message is written to them, one at a time, each with their own name."
          : `Goes to the ${picked.length} selected on WhatsApp, one at a time, each with their own name.`}
      </p>

      {/* The wording the shop already has, in Settings, rather than a second
          set of messages nobody knows exists. */}
      {held.patterns.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {held.patterns.map((pattern) => (
            <button
              key={pattern.kind}
              type="button"
              onClick={() => {
                held.setDraft(pattern.body);
                setHanding(false);
              }}
              className="pill-admin min-h-[32px] px-3 text-[12.5px]"
            >
              {pattern.label}
            </button>
          ))}
        </div>
      )}

      <textarea
        rows={4}
        value={held.draft}
        onChange={(event) => {
          held.setDraft(event.target.value);
          setHanding(false);
        }}
        placeholder="Hi {name}, we have not seen you in a while. There is a run to {block} today."
        className="field min-h-[96px] py-2.5"
        aria-label="The message"
      />
      <p className="hint mt-1.5">
        {"{name}"}, {"{block}"} and {"{pin}"} fill themselves in. Keep it under two lines: anything
        longer gets ignored.
      </p>

      {/* What one real person will actually read, which is the only way to
          catch a token that did not fill in. */}
      {first && held.draft.trim() !== "" && (
        <div className="soft mb-3 mt-2.5 bg-shell p-3">
          <p className="ticket mb-1 text-muted">{first.greet} would read</p>
          <p className="whitespace-pre-wrap text-[13.5px] leading-[1.45]">
            {fill(held.draft, first)}
          </p>
        </div>
      )}

      {!handing ? (
        <button
          type="button"
          disabled={!ready}
          onClick={() => setHanding(true)}
          className="btn-admin-go w-full disabled:opacity-40 disabled:shadow-none"
        >
          {picked.length === 0
            ? "Nobody ticked yet"
            : `Send to ${picked.length} ${picked.length === 1 ? "person" : "people"}`}
        </button>
      ) : (
        <div>
          <p className="hint mb-2">
            One tap each. WhatsApp opens with the message ready and you press send.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {picked.map((who) => (
              <a
                key={who.phone}
                href={whatsappTo(who.phone, fill(held.draft, who))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpened((was) => new Set(was).add(who.phone))}
                className={`btn-admin btn-admin-sm ${
                  opened.has(who.phone) ? "border-mint bg-mint-tint text-mint" : ""
                }`}
              >
                {who.greet} {opened.has(who.phone) ? "✓" : "↗"}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setHanding(false)}
            className="mt-2.5 text-[12.5px] font-semibold text-muted hover:text-brand"
          >
            Back to the message
          </button>
        </div>
      )}

      <p className="hint mt-2.5">
        Nothing goes out on its own. Every message waits in WhatsApp for you to send it.
        {!hasOwnNumber &&
          " Set your own WhatsApp number in Settings so replies land on the same number."}
      </p>
    </section>
  );
}

/**
 * The message screen, which is the composer given a screen of its own.
 *
 * On a desk the composer sits beside the book, because the list is what tells
 * you whether the wording is right for the people on it. A phone has no
 * beside: the card was below nine cards of customers, so writing the message
 * meant scrolling away from everybody it was going to. So the board gives it
 * its own screen, reached from the list, and the people it is for travel in
 * the address.
 *
 * It is the same sending as the card beside the table, because there is only
 * one: WhatsApp opens a single chat at a time, so this reveals one link per
 * person, in order, and ticks each one off as it is opened. There is no
 * server action behind this screen and there must not be. A button claiming
 * to have sent nine messages would be a button that sent none.
 */
export function Broadcast({
  viewLabel,
  backHref,
  hasOwnNumber,
}: {
  /** The cut of the book these people came out of, named in the sentence
   *  under the title so the screen says who it is talking to. */
  viewLabel: string;
  backHref: string;
  hasOwnNumber: boolean;
}) {
  const held = useContext(Held);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  if (!held) return null;

  const picked = chosen(held);
  const dropped = held.people.filter((one) => !held.on.has(one.phone));
  const worth = picked.reduce((total, one) => total + one.spend, 0);
  const first = picked[0] ?? null;
  // The next person who has not been opened yet, and where they come in the
  // list, which is the whole of the bar's label: one of nine, then two.
  const at = picked.findIndex((one) => !opened.has(one.phone));
  const next = at === -1 ? null : picked[at];
  const ready = held.draft.trim() !== "";

  // A token on the end of what is already typed, because the cursor is not
  // ours to move: a pill that overwrote the message would be a pill nobody
  // taps twice.
  const put = (token: string) =>
    held.setDraft(
      held.draft === "" || held.draft.endsWith(" ")
        ? held.draft + token
        : `${held.draft} ${token}`
    );

  const open = (
    <a
      href={next ? whatsappTo(next.phone, fill(held.draft, next)) : undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!ready || next === null}
      onClick={(event) => {
        if (!ready || next === null) {
          event.preventDefault();
          return;
        }
        setOpened((was) => new Set(was).add(next.phone));
      }}
      className={`btn-admin-go w-full min-h-[54px] text-base ${
        !ready || next === null ? "pointer-events-none opacity-40 shadow-none" : ""
      }`}
    >
      {!ready
        ? "Write the message first"
        : next === null
          ? `All ${picked.length} opened ✓`
          : `Open WhatsApp · ${at + 1} of ${picked.length} →`}
    </a>
  );

  return (
    <div>
      <PageHeader
        backHref={backHref}
        backLabel="Customers"
        title={`Message ${picked.length} ${picked.length === 1 ? "person" : "people"}`}
        detail={
          <>
            {viewLabel === "" ? "" : `${viewLabel} · `}
            {naira(worth)} of lifetime spend
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          {held.patterns.length > 0 && (
            <>
              <p className="ticket mb-1.5 text-muted">Start from one</p>
              {/* A row that scrolls sideways on a phone and wraps on a desk.
                  Four templates stacked are four cards before the message
                  itself, which is the thing this screen is for. */}
              <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {held.patterns.map((pattern) => {
                  const on = held.draft === pattern.body;
                  return (
                    <button
                      key={pattern.kind}
                      type="button"
                      onClick={() => held.setDraft(pattern.body)}
                      className={`w-[168px] shrink-0 rounded-xl border-[1.5px] p-3 text-left sm:w-[196px] ${
                        on ? "border-2 border-brand bg-brand-tint" : "border-line bg-paper"
                      }`}
                    >
                      <span className="block text-sm font-bold">{pattern.label}</span>
                      <span className="hint mt-0.5 block line-clamp-2">{pattern.body}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="card mb-3 p-3.5">
            <textarea
              rows={4}
              value={held.draft}
              onChange={(event) => held.setDraft(event.target.value)}
              placeholder="Hi {name}, we have not seen you in a while. There is a run to {block} today."
              aria-label="The message"
              className="field min-h-[104px] py-2.5 text-[15px]"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["{name}", "{block}", "{pin}"].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => put(token)}
                  className="pill-admin min-h-[32px] px-3 text-[12.5px]"
                >
                  + {token.slice(1, -1)}
                </button>
              ))}
            </div>
            <p className="hint mt-2">These fill themselves in for each person.</p>
          </div>

          {/* What one real person will read, in the shape they will read it
              in. It is the only way to catch a token that did not fill. */}
          {first && ready && (
            <>
              <p className="ticket mb-1.5 text-muted">{first.greet} would read</p>
              {/* The bubble as WhatsApp draws one: the tint it is filled
                  with and a solid hairline, not that tint at a third over
                  whatever the card happens to be sitting on. An opacity over
                  the page ground is not a colour, it is two colours
                  depending on where the card lands. */}
              <div className="mb-3 rounded-[14px] rounded-tr-[4px] border-[1.5px] border-mint bg-mint-tint p-3">
                <p className="whitespace-pre-wrap text-sm leading-[1.45]">
                  {fill(held.draft, first)}
                </p>
                <p className="hint mt-1 text-right">WhatsApp · one chat at a time</p>
              </div>
            </>
          )}
        </div>

        <div>
          <div className="card mb-3 p-3.5">
            <p className="ticket mb-1.5 text-muted">Going to</p>
            {picked.length === 0 ? (
              <p className="hint">
                Nobody left. Put somebody back below, or go back to the book and tick again.
              </p>
            ) : (
              picked.map((who) => (
                <div
                  key={who.phone}
                  className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-2"
                >
                  <span
                    aria-hidden
                    className={`flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-bold ${
                      opened.has(who.phone)
                        ? "border-mint bg-mint text-white"
                        : "border-line bg-shell"
                    }`}
                  >
                    {opened.has(who.phone) ? "✓" : who.greet.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 grow truncate text-sm font-semibold">{who.name}</span>
                  <span className="hint hidden shrink-0 sm:block">
                    {who.block || "no block"}
                  </span>
                  <button
                    type="button"
                    onClick={() => held.toggle(who.phone)}
                    aria-label={`Take ${who.name} off the list`}
                    className="btn-admin btn-admin-sm shrink-0 px-2.5"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
            {dropped.length > 0 && (
              <div className="mt-2.5 border-t-[1.5px] border-rule pt-2.5">
                <p className="hint mb-1.5">
                  {dropped.length} taken off. Tap to put somebody back.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dropped.map((who) => (
                    <button
                      key={who.phone}
                      type="button"
                      onClick={() => held.toggle(who.phone)}
                      className="pill-admin min-h-[32px] px-3 text-[12.5px]"
                    >
                      + {who.greet}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="soft border-volt-line bg-brand-tint p-3.5">
            <strong className="text-sm">Nothing sends on its own</strong>
            <p className="hint mt-1">
              WhatsApp opens with each message typed out. You tap send, then come back here and
              the button has moved on to the next person.
              {!hasOwnNumber &&
                " Set your own WhatsApp number in Settings so replies land on the same number."}
            </p>
          </div>

          {/* On a desk the one button lives at the end of the column it
              belongs to; on a phone the board puts it in the bar under the
              thumb, which is the same button in the place a hand can reach
              without letting go of the car door. */}
          <div className="mt-3 hidden lg:block">{open}</div>
        </div>
      </div>

      <div className="phone-bar">{open}</div>
      <div aria-hidden className="h-[78px] lg:hidden" />
    </div>
  );
}
