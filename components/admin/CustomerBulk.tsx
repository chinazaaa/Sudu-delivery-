"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { whatsappTo } from "@/lib/messages";
import { naira } from "@/lib/money";

/** One person in the book, as much of them as a message needs. */
export type Picked = {
  phone: string;
  /** Their name as the book has it, or their number where there is none. */
  name: string;
  /** What a message opens with, worked out on the server where the book's
   *  own answer for this person lives. */
  greet: string;
  block: string;
  pin: string;
  spend: number;
  orders: number;
};

/** A template the owner can drop into the box, as the settings have it. */
export type Pattern = {
  kind: string;
  label: string;
  /** The admin's own wording with {name}, {block} and {pin} still in it. */
  body: string;
};

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
  children,
}: {
  people: Picked[];
  patterns: Pattern[];
  children: React.ReactNode;
}) {
  const [on, setOn] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");

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
export function Tick({ phone, name }: { phone: string; name: string }) {
  const held = useContext(Held);
  if (!held) return null;

  return (
    <label className="flex cursor-pointer items-center">
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
export function TickAll() {
  const held = useContext(Held);
  if (!held) return null;
  const phones = held.people.map((one) => one.phone);

  return (
    <label className="flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={phones.length > 0 && held.on.size >= phones.length}
        onChange={() => held.setAll(phones)}
        aria-label="Pick everybody shown"
        className="size-[17px] accent-brand"
      />
    </label>
  );
}

/** Who is ticked, in the order the list shows them. */
function chosen(held: Holding): Picked[] {
  return held.people.filter((one) => held.on.has(one.phone));
}

/**
 * The dark bar over the table, once anything is ticked.
 *
 * Nothing on it claims to send anything. The three message buttons load the
 * composer beside the table with a template and leave the sending to the
 * owner, because WhatsApp opens one chat at a time whatever a button says.
 */
export function Bar({ viewLabel, codeHref }: { viewLabel: string; codeHref: string }) {
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

  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-shell">
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
            className="btn-admin btn-admin-sm border-shell/25 bg-transparent text-shell hover:bg-shell/10"
          >
            Ask for a review
          </a>
        )}
        <a
          href="#send-a-message"
          onClick={() => load("pin")}
          className="btn-admin btn-admin-sm border-shell/25 bg-transparent text-shell hover:bg-shell/10"
        >
          Send PINs
        </a>
        <a
          href={codeHref}
          className="btn-admin btn-admin-sm border-shell/25 bg-transparent text-shell hover:bg-shell/10"
        >
          Give them a code
        </a>
        <button
          type="button"
          onClick={exportThem}
          className="btn-admin btn-admin-sm border-shell/25 bg-transparent text-shell hover:bg-shell/10"
        >
          Export
        </button>
      </div>
    </div>
  );
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
