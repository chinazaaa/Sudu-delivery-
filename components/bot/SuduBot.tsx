"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { naira } from "@/lib/money";
import { Asking, Rail, Said, Typing, useSaying, type Ask, type Line } from "./Chat";

/**
 * Sudu Bot.
 *
 * Ordering, as a conversation. Not because a chat is fashionable, but
 * because the shortest way to a pizza on this site is four pages and
 * fourteen taps, and most people who leave do it somewhere in the middle
 * of that.
 *
 * Three things it is not. It is not clever: there is no model in it, and
 * every price, run and fee comes off the same server that charges the
 * order. It is not a dead end: a sentence it cannot read offers the
 * kitchen's own list before it offers a person. And it never decides
 * anything about money.
 *
 * The button jumps on purpose. A chat nobody notices is a chat nobody
 * opens, which is the whole investment wasted, so the launcher hops, a
 * ring goes out of it, and a bubble says what it is for.
 */

type Start = {
  hostels: string[];
  runs: Run[];
  kitchens: { id: string; name: string }[];
  feeFrom: number;
  whatsapp: string;
};

type Run = {
  id: string;
  label: string;
  said: string;
  runDate: string;
  window: string;
  closes: string;
  dow: string;
  dom: number;
};

type Group = {
  id: string;
  name: string;
  required: boolean;
  dearest: boolean;
  options: { id: string; name: string }[];
};

type Hit = {
  id: string;
  name: string;
  /** Which counter it comes from, which is the answer rather than the
   *  question: nobody arrives wanting a restaurant, they arrive wanting
   *  wings. */
  shop: { id: string; name: string };
  price: number;
  score: number;
  groups: Group[];
};

/** What the chat has gathered so far. */
type Held = {
  name: string;
  phone: string;
  hostel: string;
  run: Run | null;
  kitchen: { id: string; name: string } | null;
  /** What has been chosen, as the server will be told it. */
  lines: { itemId: string; name: string; qty: number; optionIds: string[]; chose: string[] }[];
};

const EMPTY: Held = {
  name: "",
  phone: "",
  hostel: "",
  run: null,
  kitchen: null,
  lines: [],
};

export default function SuduBot({ whatsapp = "" }: { whatsapp?: string }) {
  const [open, setOpen] = useState(false);
  const [teasing, setTeasing] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [ask, setAsk] = useState<Ask>({ of: "nothing" });
  const [at, setAt] = useState(0);
  const [start, setStart] = useState<Start | null>(null);
  const held = useRef<Held>({ ...EMPTY });
  /* The option walk, held in a box so the steps above it can reach it.
     They are written in the order a person meets them, which puts the
     browsing list before the thing it hands off to. */
  const walkRef = useRef<((hit: Hit, qty: number) => void) | null>(null);
  /* Counters still to be asked about, where somebody named more than one.
     "Domino's and KFC" is two questions, taken in the order they said
     them, rather than one search that finds neither. */
  const queue = useRef<{ id: string; name: string }[]>([]);
  const log = useRef<HTMLDivElement | null>(null);

  const push = useCallback((line: Line) => setLines((all) => [...all, line]), []);
  const { say, clear, typing } = useSaying(push, () => undefined);

  const wa = (start?.whatsapp || whatsapp || "").replace(/[^\d]/g, "");
  const waLink = wa === "" ? "https://wa.me/" : `https://wa.me/${wa}`;

  /* The bubble, once, after a moment. Not on arrival: a panel that opens
     itself is the thing people close without reading. */
  useEffect(() => {
    if (open) return undefined;
    const seen = (() => {
      try {
        return window.sessionStorage.getItem("sudubot-teased") === "1";
      } catch {
        return false;
      }
    })();
    if (seen) return undefined;
    const when = setTimeout(() => setTeasing(true), 6000);
    return () => clearTimeout(when);
  }, [open]);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lines, typing, ask]);

  /* Everything it needs to ask anything, read once when it is opened. */
  useEffect(() => {
    if (!open || start) return;
    let gone = false;
    fetch("/api/bot/start")
      .then((answer) => answer.json())
      .then((got: Start) => {
        if (!gone) setStart(got);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [open, start]);

  const me = useCallback((said: string) => say({ kind: "me", said }, 0), [say]);
  const bot = useCallback(
    (html: string, pause?: number) => say({ kind: "bot", html }, pause),
    [say]
  );

  /* ---------------------------------------------------------------- steps */

  const askOrder = useCallback((again = false) => {
    setAt(2);
    /* Where somebody named counters, the question names the next one and
       the search is kept to it, so "wings" means their wings. */
    const only = queue.current[0] ?? null;
    bot(
      only
        ? `What would you like from <b>${only.name}</b>?`
        : again
          ? "Go on, what else?"
          : "So, what do you fancy? Say it however you like, and a typo is fine."
    );
    setAsk({
      of: "text",
      placeholder: only ? `Something from ${only.name}` : "e.g. 2 medium bbq pizza",
      onSay: async (said) => {
        me(said);
        setAsk({ of: "nothing" });
        try {
          const answer = await fetch("/api/bot/find", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ said, kitchen: queue.current[0]?.id ?? "" }),
          });
          const got = (await answer.json()) as {
            how: string;
            qty: number;
            hits: Hit[];
            instead: { id: string; name: string; shop: string }[];
            shops?: { id: string; name: string }[];
          };
          if (got.how === "kitchens" && (got.shops ?? []).length > 0) {
            queue.current = [...(got.shops ?? [])];
            const names = queue.current.map((one) => one.name);
            bot(
              names.length === 1
                ? `<b>${names[0]}</b> it is.`
                : `<b>${names.join("</b> and <b>")}</b>. We will do them one at a time.`,
              450
            );
            askOrder();
            return;
          }
          if (got.how === "person") {
            bot("Of course. A person will pick this up on WhatsApp with everything you have told me already.");
            setAsk({
              of: "buttons",
              buttons: [
                { said: "Continue on WhatsApp", look: "green", href: waLink },
                { said: "Actually, let me carry on here", look: "alt", go: askOrder },
              ],
            });
            return;
          }
          if (got.how === "sure" && got.hits[0]) {
            walk(got.hits[0], got.qty);
            return;
          }
          if (got.hits.length > 0) {
            bot("I think I have it. Which one did you mean?", 500);
            setAsk({
              of: "chips",
              chips: [
                ...got.hits.map((hit, which) => ({
                  /* The counter is on the chip, so one tap answers both
                     "which dish" and "from where". */
                  said: hit.shop.name ? `${hit.name} · ${hit.shop.name}` : hit.name,
                  hot: which === 0,
                  go: () => {
                    me(hit.name);
                    walk(hit, got.qty);
                  },
                })),
                { said: "None of these", go: () => { me("None of these"); askOrder(); } },
              ],
              hint: "Tap the right one, or say it another way.",
            });
            return;
          }
          /* Nothing close. The kitchen's own list, not the door. */
          bot("I could not find that one. Here is some of what is on today.", 520);
          setAsk({
            of: "chips",
            chips: [
              ...(got.instead ?? []).map((one) => ({
                said: one.shop ? `${one.name} · ${one.shop}` : one.name,
                go: () => {
                  me(one.name);
                  setAsk({ of: "nothing" });
                  fetch("/api/bot/find", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ said: one.name }),
                  })
                    .then((answer) => answer.json())
                    .then((again: { hits: Hit[] }) => {
                      if (again.hits[0]) walk(again.hits[0], 1);
                      else askOrder();
                    })
                    .catch(askOrder);
                },
              })),
              { said: "Let me type it again", go: () => { me("Let me type it again"); askOrder(); } },
            ],
            hint: "Or type it another way. I am not fussy about spelling.",
          });
        } catch {
          bot("Something went wrong finding that. Try saying it again?");
          askOrder();
        }
      },
    });
  }, [bot, me, waLink]);

  /* Walking the choices a dish asks before it can be priced. */
  const walk = useCallback(
    (hit: Hit, qty: number) => {
      const chosen: string[] = [];
      const named: string[] = [];
      const wanted = hit.groups.filter((group) => group.required || group.dearest);

      const next = (which: number) => {
        if (which >= wanted.length) {
          held.current.lines.push({
            itemId: hit.id,
            name: hit.name,
            qty,
            optionIds: chosen,
            chose: named,
          });
          bot(
            `Added <b>${qty > 1 ? `${qty} × ` : ""}${hit.name}</b>` +
              (named.length > 0 ? ` (${named.join(", ")})` : "") +
              (hit.shop.name ? ` from <b>${hit.shop.name}</b>.` : "."),
            450
          );
          /* Done with this counter, so the next one somebody named is the
             next question rather than something they have to remember. */
          if (queue.current.length > 0) queue.current.shift();
          if (queue.current.length > 0) {
            askOrder();
            return;
          }
          setAsk({
            of: "buttons",
            buttons: [
              { said: "Add something else", look: "alt", go: () => { me("Add something else"); askOrder(true); } },
              { said: "That's everything", go: () => { me("That's everything"); soon(); } },
            ],
          });
          return;
        }
        const group = wanted[which];
        bot(`${group.name}?`, 420);
        setAsk({
          of: "chips",
          chips: group.options.map((one, place) => ({
            said: one.name,
            hot: place === 0,
            go: () => {
              me(one.name);
              chosen.push(one.id);
              named.push(one.name);
              next(which + 1);
            },
          })),
          hint: group.dearest ? "Half of the pizza. You pay for the dearer half." : undefined,
        });
      };

      bot(`Found it: <b>${hit.name}</b>.`, 420);
      next(0);
    },
    [askOrder, bot, me]
  );

  useEffect(() => {
    walkRef.current = walk;
  }, [walk]);

  /*
   * The bill, asked for rather than worked out.
   *
   * Every figure on it comes back from the till: the same ladder with its
   * steps, the same floors, the same extra for a far kitchen. The chat
   * adds nothing up, which is the only way it cannot be cheated and the
   * only way it cannot disagree with what is taken at the door.
   */
  const soon = useCallback(async () => {
    setAt(4);
    setAsk({ of: "nothing" });
    const mine = held.current;
    try {
      const answer = await fetch("/api/bot/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: mine.lines.map((line) => ({
            menu_item_id: line.itemId,
            qty: line.qty,
            option_ids: line.optionIds,
          })),
          batchId: mine.run?.id ?? "",
        }),
      });
      const got = (await answer.json()) as {
        error?: string;
        lines?: { name: string; said: string; qty: number; total: number }[];
        food?: number;
        fee?: number;
        total?: number;
      };

      if (got.error || !got.lines) {
        bot(got.error || "I could not work that out just now.", 450);
        setAsk({
          of: "buttons",
          buttons: [
            { said: "Change something", look: "alt", go: () => { me("Change something"); askOrder(true); } },
            { said: "Continue on WhatsApp", look: "green", href: waLink },
          ],
        });
        return;
      }

      bot("Here is your total.", 420);
      say(
        {
          kind: "card",
          card: {
            of: "bill",
            title: "Your bill",
            rows: [
              ...got.lines.map((line) => ({
                said: `${line.qty > 1 ? `${line.qty} × ` : ""}${line.name}`,
                under: line.said || undefined,
                amount: line.total,
              })),
              {
                said: "Delivery",
                under: `${mine.hostel} · run ${mine.run?.said ?? ""}`,
                amount: got.fee ?? 0,
              },
            ],
            total: { said: "Total", amount: got.total ?? 0 },
          },
        },
        600
      );
      setAsk({
        of: "buttons",
        buttons: [
          { said: "Confirm order", go: () => { me("Confirm order"); payNext(); } },
          { said: "Change something", look: "alt", go: () => { me("Change something"); askOrder(true); } },
        ],
        hint: "Nothing is charged until you transfer.",
      });
    } catch {
      bot("I could not reach the till just then. Try again?", 420);
      setAsk({
        of: "buttons",
        buttons: [{ said: "Try again", go: () => { me("Try again"); soon(); } }],
      });
    }
  }, [askOrder, bot, me, say, waLink]);

  /* The next piece, said plainly rather than pretended at. */
  const payNext = useCallback(() => {
    setAt(5);
    bot(
      "The transfer details, the watching for your payment and the receipt are " +
        "the next piece being built. For now a person will take it from here, " +
        "with everything you have told me already.",
      520
    );
    setAsk({
      of: "buttons",
      buttons: [{ said: "Continue on WhatsApp", look: "green", href: waLink }],
    });
  }, [bot, waLink]);

  const askKitchen = useCallback(() => {
    setAt(2);
    bot("Here is who is open. Tap one and I will show you what they have.");
    setAsk({
      of: "chips",
      chips: [
        ...(start?.kitchens ?? []).map((shop) => ({
          said: shop.name,
          go: () => {
            me(shop.name);
            held.current.kitchen = shop;
            setAsk({ of: "nothing" });
            fetch("/api/bot/find", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kitchen: shop.id, said: shop.name }),
            })
              .then((answer) => answer.json())
              .then((got: { instead: { id: string; name: string; shop: string }[]; hits: Hit[] }) => {
                const some = got.hits.length > 0 ? got.hits : [];
                if (some.length === 0) {
                  askOrder();
                  return;
                }
                bot(`Some of what ${shop.name} has today.`, 450);
                setAsk({
                  of: "chips",
                  chips: [
                    ...some.map((hit) => ({
                      said: hit.name,
                      go: () => {
                        me(hit.name);
                        walkRef.current?.(hit, 1);
                      },
                    })),
                    { said: "Let me just type it", go: () => { me("Let me just type it"); askOrder(); } },
                  ],
                });
              })
              .catch(() => askOrder());
          },
        })),
        { said: "Let me just type it", go: () => { me("Let me just type it"); askOrder(); } },
      ],
      hint: "Or tap the last one and say it in your own words.",
    });
  }, [askOrder, bot, me, start]);

  const askSlot = useCallback(() => {
    setAt(1);
    const runs = start?.runs ?? [];
    if (runs.length === 0) {
      bot("Nothing is open for orders this minute. A person can still sort you out.");
      setAsk({ of: "buttons", buttons: [{ said: "Message us on WhatsApp", look: "green", href: waLink }] });
      return;
    }
    const first = runs[0];
    bot(`Our next run to <b>${held.current.hostel}</b> is <b>${first.said}</b>.`, 480);
    say(
      {
        kind: "card",
        card: {
          of: "slot",
          dow: first.dow,
          dom: first.dom,
          title: `Run ${first.said}`,
          when: `Arrives ${first.window}`,
          note: `Orders close ${first.closes} · delivery from ${naira(start?.feeFrom ?? 0)}`,
        },
      },
      420
    );
    if (runs.length === 1) {
      setAsk({
        of: "buttons",
        buttons: [{ said: "That works", go: () => { me("That works"); held.current.run = first; askOrder(); } }],
        hint: "That is the soonest we can reach you.",
      });
      return;
    }
    setAsk({
      of: "slots",
      slots: runs.slice(0, 4).map((run) => ({
        dow: run.dow,
        dom: run.dom,
        title: `Run ${run.said}`,
        when: run.window,
        fee: start?.feeFrom ?? 0,
        rush: false,
      })),
      onPick: (which) => {
        const run = runs[which];
        held.current.run = run;
        me(`Run ${run.said}, ${run.window}`);
        askOrder();
      },
    });
  }, [askOrder, bot, me, say, start, waLink]);

  const askHostel = useCallback(() => {
    setAt(0);
    bot("Where am I bringing it? Tap your block.");
    setAsk({
      of: "chips",
      chips: (start?.hostels ?? []).map((hostel) => ({
        said: hostel,
        go: () => {
          me(hostel);
          held.current.hostel = hostel;
          /* The lead, the moment there is one. Somebody who stops here is
             a person with a number against a block, which is a WhatsApp
             tomorrow rather than nothing at all. */
          fetch("/api/app/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: held.current.phone,
              name: held.current.name,
              hostel,
              items: 1,
              value: 0,
              summary: "Started an order in the chat",
            }),
          }).catch(() => undefined);
          askSlot();
        },
      })),
    });
  }, [askSlot, bot, me, start]);

  const askPhone = useCallback(() => {
    setAt(0);
    bot(`Nice to meet you, <b>${held.current.name || "friend"}</b>. What number should the rider call?`);
    setAsk({
      of: "text",
      type: "tel",
      placeholder: "080…",
      onSay: (said) => {
        me(said);
        held.current.phone = said;
        askHostel();
      },
    });
  }, [askHostel, bot, me]);

  const begin = useCallback(() => {
    held.current = { ...EMPTY, lines: [] };
    setLines([]);
    setAt(0);
    bot("Hey, I’m <b>Sudu Bot</b>. I can take your order right here, no app needed.", 450);
    bot("What should I call you?");
    setAsk({
      of: "text",
      placeholder: "Your name",
      onSay: (said) => {
        me(said);
        held.current.name = said.split(" ")[0];
        askPhone();
      },
    });
  }, [askPhone, bot, me]);

  useEffect(() => {
    if (open && start && lines.length === 0) begin();
  }, [begin, lines.length, open, start]);

  function close() {
    clear();
    setOpen(false);
  }

  return (
    <div className="sudubot">
      {!open && (
        <div className="sudubot-launcher">
          {teasing && (
            <div className="teaser">
              Hungry? Order in about a minute.
              <button
                type="button"
                className="x"
                aria-label="Dismiss"
                onClick={(event) => {
                  event.stopPropagation();
                  setTeasing(false);
                  try {
                    window.sessionStorage.setItem("sudubot-teased", "1");
                  } catch {
                    /* A browser that forbids it simply sees it again. */
                  }
                }}
              >
                ×
              </button>
            </div>
          )}
          <button
            type="button"
            className="fab"
            aria-label="Open Sudu Bot to order"
            onClick={() => {
              setTeasing(false);
              setOpen(true);
            }}
          >
            <span className="ring" aria-hidden />
            <span className="glyph" aria-hidden>
              <i style={{ width: 26 }} />
              <i style={{ width: 18 }} />
              <i style={{ width: 10 }} />
            </span>
            <span className="badge" aria-hidden>
              1
            </span>
          </button>
        </div>
      )}

      {open && (
        <div className="sudubot-panel" role="dialog" aria-label="Sudu Bot">
          <div className="phead">
            <span className="av" aria-hidden>
              <span className="avg">
                <i style={{ width: 16 }} />
                <i style={{ width: 11 }} />
                <i style={{ width: 6 }} />
              </span>
            </span>
            <span className="who">
              <b>Sudu Bot</b>
              <span>
                <span className="dot" /> Replies instantly
              </span>
            </span>
            <a
              className="hbtn wa"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Continue on WhatsApp instead"
              title="Continue on WhatsApp"
            >
              ✉
            </a>
            <button type="button" className="hbtn" aria-label="Close chat" onClick={close}>
              ×
            </button>
          </div>

          <Rail at={at} />

          <div className="log" ref={log} role="log" aria-live="polite">
            {lines.map((line, which) => (
              <Said key={which} line={line} />
            ))}
            {typing && <Typing />}
          </div>

          <Asking ask={ask} whatsapp={waLink} />
        </div>
      )}
    </div>
  );
}
