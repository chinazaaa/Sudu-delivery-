"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendDealPush, type DealPushState } from "@/app/admin/actions";

type Restaurant = { id: string; name: string; categories: { id: string; name: string }[] };

/** The longest the notification itself will carry, which the counter reads. */
const TITLE_MOST = 80;
const BODY_MOST = 180;

/** One of the board's starting points: a kind, and what it fills in. */
type Template = {
  kind: string;
  title: string;
  body: string;
  /** The same value the Opens list uses, so picking a template sets where it
   *  lands as well as what it says. */
  where: string;
};

/**
 * Writing one, and saying where it lands.
 *
 * The destination is a pair of dropdowns rather than a path, because a path
 * typed by hand is a path typed wrong, and a notification that opens the wrong
 * screen is worse than one nobody sent.
 *
 * The board puts three things around the writing, and all three are here for
 * the same reason: this is the one control in admin with no undo. A starting
 * point, so nobody writes the closing-soon line from scratch for the
 * fortieth time; the phone preview, because the only place a title is too
 * long is on a lock screen, not in a text box; and the list of what has
 * already gone, so two people at two counters do not send the same thing
 * twice in an hour.
 *
 * On a phone the send button leaves the form and stands on the bottom bar,
 * where the thumb is, which is what every mobile board does with the one
 * thing a screen is for.
 */
export default function DealPush({
  restaurants,
  occasions = [],
  links = [],
  skincare = false,
  audience,
}: {
  restaurants: Restaurant[];
  /** Boxes somebody has packed, which is the thing most worth a notification:
   *  a match with a kick-off is a reason to tap that a menu never is. */
  occasions?: { slug: string; name: string }[];
  /** A basket already filled, so the notification is one tap from paying. */
  links?: { short: string; label: string }[];
  skincare?: boolean;
  /** How many phones this would reach, so the button can say what pressing
   *  it does rather than "Send it". */
  audience?: number;
}) {
  const [state, action, pending] = useActionState<DealPushState, FormData>(sendDealPush, {
    error: null,
    sent: null,
  });

  const [restaurant, setRestaurant] = useState("");
  const [category, setCategory] = useState("");
  const chosen = restaurants.find((one) => one.id === restaurant) ?? null;

  // Controlled, because the starting points fill them in and the preview
  // reads them back. A notification is the one thing here that cannot be
  // edited after it has gone, so what it will look like has to be visible
  // while it is still being typed.
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  /*
   * What has gone since this page was opened.
   *
   * Nothing records a sent deal anywhere, so this is honest about its own
   * limits: it is what this browser has sent, not a history, and it empties
   * on a reload. It is still the thing worth having, because the mistake it
   * prevents is the one that actually happens: sending the same line twice
   * within the hour while somebody else is doing the same from the counter.
   */
  const [gone, setGone] = useState<{ title: string; sent: number; at: string }[]>([]);
  const last = useRef<DealPushState | null>(null);

  useEffect(() => {
    if (last.current === state) return;
    last.current = state;
    if (state.sent === null || state.error) return;
    setGone((before) => [
      {
        title,
        sent: state.sent as number,
        at: new Date().toLocaleTimeString("en-NG", {
          hour: "numeric",
          minute: "2-digit",
        }),
      },
      ...before,
    ]);
    // Cleared so the next one starts empty rather than resending what has
    // just gone on a second press of the same button.
    setTitle("");
    setBody("");
  }, [state, title]);

  /*
   * The board's starting points, built out of what this shop actually has.
   *
   * The wording is deliberately general: a template that says "closes at
   * 12:45" or names a price is a template that is wrong most days, and a
   * line nobody re-reads before sending is worse than an empty box. Where
   * one can name a real restaurant or a real box, it does.
   */
  const templates: Template[] = [
    {
      kind: "Closing soon",
      title: "Ordering closes soon",
      body: "Get your order in for today's run.",
      where: "",
    },
    ...(restaurants.length > 0
      ? [
          {
            kind: "New deals",
            title: `New deals at ${restaurants[0].name}`,
            body: "Something new on the menu today. Tap to see it.",
            where: restaurants[0].id,
          },
        ]
      : []),
    ...(occasions.length > 0
      ? [
          {
            kind: "Boxes",
            title: `${occasions[0].name} boxes are open`,
            body: "One box, one delivery fee, split it with your block.",
            where: `occasion:${occasions[0].slug}`,
          },
        ]
      : []),
    {
      kind: "Payday",
      title: "It's payday weekend",
      body: "Every kitchen, one delivery fee, split with your block.",
      where: "",
    },
  ];

  const pick = (one: Template) => {
    setTitle(one.title);
    setBody(one.body);
    setRestaurant(one.where);
    setCategory("");
  };

  const sendLabel = pending
    ? "Sending…"
    : audience === undefined
      ? "Send it"
      : `Send to ${audience} phone${audience === 1 ? "" : "s"}`;

  return (
    <form action={action} className="space-y-3.5">
      {/* Scrolled sideways rather than wrapped: four cards wrapped on a
          phone is most of a screen, and these are a shortcut past the
          typing, not the page. */}
      <div>
        <p className="ticket mb-2 text-muted">Start from one of these</p>
        <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
          {templates.map((one) => (
            <button
              key={one.kind}
              type="button"
              onClick={() => pick(one)}
              className="soft min-h-[44px] w-[208px] shrink-0 p-3 text-left hover:border-ink"
            >
              <span className="ticket block text-brand-dark">{one.kind}</span>
              <span className="mt-0.5 block text-sm font-bold leading-[1.3]">
                {one.title}
              </span>
              <span className="hint mt-0.5 block">{one.body}</span>
            </button>
          ))}
        </div>
      </div>

      {/* What it will look like on a lock screen. The only place a title is
          too long is here, and the box it is typed into will never show
          that. */}
      <div>
        <p className="ticket mb-2 text-muted">What it will look like</p>
        <div className="rounded-[16px] bg-ink p-3.5">
          <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.13] p-3">
            <span className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-brand font-display text-[15px] font-black text-white">
              S
            </span>
            <span className="min-w-0 flex-1 text-shell">
              <span className="flex items-baseline gap-2">
                <strong className="text-[13.5px]">Sudu</strong>
                <span className="ml-auto text-[11px] opacity-60">now</span>
              </span>
              <span className="mt-0.5 block break-words text-[13.5px] font-semibold">
                {title || "Your title goes here"}
              </span>
              <span className="block break-words text-[13px] leading-[1.35] opacity-85">
                {body || "And the line underneath it."}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="card space-y-3.5">
        <div>
          <label className="label" htmlFor="title">
            Title{" "}
            <span className="hint font-normal">
              · {title.length} of {TITLE_MOST}
            </span>
          </label>
          <input
            id="title"
            name="title"
            className="field field-admin min-h-[46px]"
            maxLength={TITLE_MOST}
            placeholder="New deals at Domino's"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="body">The line underneath</label>
          <textarea
            id="body"
            name="body"
            rows={2}
            maxLength={BODY_MOST}
            className="field min-h-[66px] py-2.5 text-[14.5px]"
            placeholder="Two for one on large pizzas today. Tap to see them."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            {/* One list rather than one box per kind of thing. Whoever is
                sending this is choosing where it lands, not what sort of
                destination it is. */}
            <label className="label" htmlFor="restaurant">Opens</label>
            <select
              id="restaurant"
              name="restaurant"
              className="field field-admin"
              value={restaurant}
              onChange={(event) => {
                setRestaurant(event.target.value);
                setCategory("");
              }}
            >
              <option value="">The shop, for anything about delivery or a code</option>

              {occasions.length > 0 && (
                <optgroup label="Boxes">
                  {occasions.map((one) => (
                    <option key={one.slug} value={`occasion:${one.slug}`}>
                      {one.name}
                    </option>
                  ))}
                </optgroup>
              )}

              {links.length > 0 && (
                <optgroup label="Checkout links">
                  {links.map((one) => (
                    <option key={one.short} value={`link:${one.short}`}>
                      {one.label}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Restaurants">
                {restaurants.map((one) => (
                  <option key={one.id} value={one.id}>{one.name}</option>
                ))}
              </optgroup>

              {skincare && (
                <optgroup label="Other">
                  <option value="skincare">Skincare</option>
                </optgroup>
              )}
            </select>
          </div>

          {chosen && chosen.categories.length > 0 && (
            <div>
              <label className="label" htmlFor="category">Straight to</label>
              <select
                id="category"
                name="category"
                className="field field-admin"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">The whole menu</option>
                {chosen.categories.map((one) => (
                  <option key={one.id} value={one.id}>{one.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* On a desk the send button is where the mouse already is, at the
            end of the form. On a phone it is on the bar at the bottom
            instead, so it is not a reach away at the end of a scroll. */}
        <button
          type="submit"
          className="btn-admin-go hidden w-full lg:flex"
          disabled={pending}
        >
          {sendLabel}
        </button>

        {state.error && (
          <p className="soft border-brand-dark bg-brand-wash px-3 py-2 text-sm font-semibold text-brand-dark">
            {state.error}
          </p>
        )}
        {state.sent !== null && !state.error && (
          <p className="soft border-mint bg-mint-tint px-3 py-2 text-sm font-semibold text-mint">
            Sent to {state.sent} phone{state.sent === 1 ? "" : "s"}.
          </p>
        )}
      </div>

      {gone.length > 0 && (
        <div className="card">
          <p className="ticket text-muted">Sent since you opened this page</p>
          {gone.map((one, index) => (
            <div
              key={`${one.at}-${index}`}
              className="flex items-start gap-2.5 border-t-[1.5px] border-rule py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-[1.3]">
                  {one.title || "No title"}
                </span>
                <span className="hint block">
                  {one.at} · {one.sent} phone{one.sent === 1 ? "" : "s"}
                </span>
              </span>
              <span className="tag shrink-0 bg-mint-tint text-mint">gone</span>
            </div>
          ))}
          <p className="hint mt-2 leading-[1.5]">
            This browser only, and it empties on a reload. Nothing keeps a
            record of a sent notification yet.
          </p>
        </div>
      )}

      {/* The bar stands above the tab bar and holds the one thing this
          screen is for. The page adds the bottom padding it needs. */}
      <div className="phone-bar">
        <button type="submit" className="btn-admin-go min-h-[50px] w-full" disabled={pending}>
          {sendLabel}
        </button>
      </div>
    </form>
  );
}
