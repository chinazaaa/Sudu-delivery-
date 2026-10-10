"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendDealPush, type DealPushState } from "@/app/admin/actions";

type Restaurant = { id: string; name: string; categories: { id: string; name: string }[] };

/*
 * The longest the notification itself will carry, which the counter reads.
 *
 * Forty, not eighty: forty is about what a lock screen shows before it cuts
 * the line off, and a title nobody can read to the end is the whole reason
 * the preview above the boxes exists. The send itself allows more, so this
 * is the stricter of the two and the one that matters.
 */
const TITLE_MOST = 40;
const BODY_MOST = 180;

/** One of the board's starting points: a kind, and what it fills in. */
type Template = {
  kind: string;
  title: string;
  body: string;
  /** What this starting point is for, which is what the card says under its
   *  title. The body itself is already shown in the preview, and printed
   *  here as well it was two copies of the same sentence in one screen. */
  note: string;
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
 * long is on a lock screen, not in a text box; and how long ago the last
 * one went, so two people at two counters do not send the same thing twice
 * in an hour. The sends themselves are listed beside this form, off the
 * real history rather than off what this browser has done.
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
  lastSent = "",
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
  /**
   * "Last one went 7 days ago", worked out on the page from the newest send
   * there is. A sentence rather than a date, because the card it stands in
   * is a warning and the warning is about how often, not about when.
   *
   * Empty until something has been sent, and the card then keeps the advice
   * it has always carried: there is nothing to be told about yet.
   */
  lastSent?: string;
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
   * Emptying the boxes once something has gone.
   *
   * This used to keep its own list of what this browser had sent, because
   * nothing wrote a send down anywhere. Something does now, and the page
   * draws the real history beside this form, so the only thing left for the
   * browser to do is clear the boxes: a second press of the same button
   * would otherwise send the same line twice.
   */
  const last = useRef<DealPushState | null>(null);

  useEffect(() => {
    if (last.current === state) return;
    last.current = state;
    if (state.sent === null || state.error) return;
    setTitle("");
    setBody("");
  }, [state]);

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
      note: "For the hour before a cut off.",
      where: "",
    },
    ...(restaurants.length > 0
      ? [
          {
            kind: "New deals",
            title: `New deals at ${restaurants[0].name}`,
            body: "Something new on the menu today. Tap to see it.",
            note: `Opens ${restaurants[0].name}.`,
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
            note: `Opens the ${occasions[0].name} collection.`,
            where: `occasion:${occasions[0].slug}`,
          },
        ]
      : []),
    {
      kind: "Payday",
      title: "It's payday weekend",
      body: "Every kitchen, one delivery fee, split with your block.",
      note: "For the end of the month.",
      where: "",
    },
  ];

  const pick = (one: Template) => {
    // Cut to what the box itself allows, so a long restaurant name cannot
    // put the counter over its own limit the moment a card is tapped.
    setTitle(one.title.slice(0, TITLE_MOST));
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
              <span className="hint mt-0.5 block">{one.note}</span>
            </button>
          ))}
        </div>
      </div>

      {/* What it will look like on a lock screen. The only place a title is
          too long is here, and the box it is typed into will never show
          that. */}
      <div>
        <p className="ticket mb-2 text-muted">What it will look like</p>
        {/* The board's phone is a lighter ink than the rail, so the white
            card inside it reads as a notification rather than a hole. */}
        <div className="rounded-[16px] bg-rail-line p-3.5">
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
              {/*
                Today's run and the shop front are the same screen: the front
                page is where the open runs and their cut-offs are drawn, and
                there is no page of its own for one run that a customer could
                be sent to. So this option is worded for the thing the first
                starting point is about, rather than offered twice under two
                names that would land on the same URL.
              */}
              <option value="">
                Today&apos;s run, on the shop front where the cut-off is
              </option>

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
            <p className="hint mt-1">
              Today&apos;s run, one restaurant, a collection or a basket you
              have already filled. Picked from this list rather than typed,
              because a notification that opens the wrong screen is worse than
              one nobody sent.
            </p>
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

      {/*
        The one control in admin with no undo, said under the boxes it is
        about rather than over them: on a phone this card stood above the
        form and was read before there was anything to send. A soft note
        rather than the Ink outline, because it is worth reading and it is
        not an error.
      */}
      <div className="soft border-volt-line bg-brand-tint p-3.5">
        {/* How long ago the last one went, once there is a send to read it
            off. A fact beats advice: "sparingly" is a thing to agree with
            and forget, and "went today" is the thing that stops a second
            one this afternoon. The advice stays underneath either way. */}
        <p className="text-sm font-bold">{lastSent || "Send these sparingly"}</p>
        <p className="hint mt-1">
          More than about two a week and people turn them off in the app.
          There is no undo once one has gone.
        </p>
      </div>

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
