"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { naira } from "@/lib/money";
import { looksLikeAName, phoneIn } from "@/lib/bot-match";
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
  email: string;
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
  /** Once it is placed: what to poll, what to quote, and whether the shop
   *  is marking transfers paid by itself today. */
  orderId: string;
  ref: string;
  /** The page that follows this one order, for the line after it is paid. */
  link: string;
  watching: boolean;
};

/*
 * How long the chat watches for a transfer, and how often it looks.
 *
 * Three minutes, not one. A bank alert is forwarded through a mailbox
 * before it ever reaches us and nothing arrives in sixty seconds, so a
 * minute of watching was a minute of theatre: it was always going to end
 * in "not confirmed yet" whether the money had landed or not.
 *
 * Twelve looks over three minutes is twelve requests from one person who
 * is sitting there waiting, which is nothing, and it is the stretch where
 * somebody is still holding the phone.
 */
const WATCH_FOR = 12;
const LOOK_EVERY = 15000;
/** And the first look, soon enough to catch an alert that beat them back. */
const FIRST_LOOK = 8000;

/** After that, one quiet look a minute, for this long. */
const LISTEN_FOR = 30;

const EMPTY: Held = {
  name: "",
  phone: "",
  hostel: "",
  run: null,
  kitchen: null,
  lines: [],
  orderId: "",
  ref: "",
  link: "",
  watching: false,
};

export default function SuduBot({ whatsapp = "" }: { whatsapp?: string }) {
  const [open, setOpen] = useState(false);
  const [teasing, setTeasing] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [ask, setAsk] = useState<Ask>({ of: "nothing" });
  const [at, setAt] = useState(0);
  const [start, setStart] = useState<Start | null>(null);
  /*
   * The lists, reachable from inside a step.
   *
   * The steps are closures made when the one before them ran, so a step
   * written at the moment somebody typed their name still holds whatever
   * the lists were then, which is nothing. Reading them out of a box
   * instead means the hostel question asks with the hostels that have
   * arrived by the time it is asked rather than the ones that had.
   */
  const startRef = useRef<Start | null>(null);
  /*
   * The part of the screen the phone is actually showing.
   *
   * A sheet sized to the window is the right size until the keyboard
   * opens. iOS does not shrink the window for a keyboard, it covers it, so
   * the bottom of the panel, which is the box somebody is typing into,
   * ends up underneath it and the page behind starts scrolling instead.
   *
   * The visual viewport is the only thing that knows where the keyboard
   * is, so the sheet is sized and placed off that, and only on a phone,
   * where the panel is a sheet rather than a card in the corner.
   */
  const [seen, setSeen] = useState<{ high: number; from: number } | null>(null);
  const [sheet, setSheet] = useState(false);
  const held = useRef<Held>({ ...EMPTY });
  /* The option walk, held in a box so the steps above it can reach it.
     They are written in the order a person meets them, which puts the
     browsing list before the thing it hands off to. */
  const walkRef = useRef<((hit: Hit, qty: number) => void) | null>(null);
  /* Counters still to be asked about, where somebody named more than one.
     "Domino's and KFC" is two questions, taken in the order they said
     them, rather than one search that finds neither. */
  const queue = useRef<{ id: string; name: string }[]>([]);
  /* The watch, held in a box for the step that starts it. */
  const watchRef = useRef<(() => void) | null>(null);
  /** A step that asked before the lists had landed, run again when they do. */
  const pending = useRef<(() => void) | null>(null);
  const askOrderRef = useRef<((again?: boolean) => void) | null>(null);
  const byeRef = useRef<(() => void) | null>(null);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);
  const log = useRef<HTMLDivElement | null>(null);

  const push = useCallback((line: Line) => setLines((all) => [...all, line]), []);
  const { say, clear, typing } = useSaying(push, () => undefined);

  const wa = (start?.whatsapp || whatsapp || "").replace(/[^\d]/g, "");
  const email = start?.email ?? "";

  /*
   * Handing the conversation over, not just the number.
   *
   * The worst thing a chat can do to somebody is make them say it all
   * again to a person. So the message is written for them, with
   * everything they have already answered in it, and all that is left is
   * the bit that was missing. A shop that asks the same questions twice
   * is a shop that was not listening the first time.
   */
  const handOver = useCallback(
    (why = "") => {
      const mine = held.current;
      const lines: string[] = [];
      lines.push(
        mine.ref !== ""
          ? `Hi, I started an order on the site. It is ${mine.ref}.`
          : "Hi, I was ordering with the chat on your site."
      );
      if (why !== "") lines.push(why);
      const them = [
        mine.name && `Name: ${mine.name}`,
        mine.phone && `Number: ${mine.phone}`,
        mine.hostel && `Block: ${mine.hostel}`,
        mine.run?.said && `Run: ${mine.run.said}${mine.run.window ? `, ${mine.run.window}` : ""}`,
      ].filter(Boolean) as string[];
      if (them.length > 0) lines.push("", ...them);
      if (mine.lines.length > 0) {
        lines.push("", "What I picked so far:");
        for (const line of mine.lines) {
          lines.push(
            `· ${line.qty > 1 ? `${line.qty} × ` : ""}${line.name}` +
              (line.chose.length > 0 ? ` (${line.chose.join(", ")})` : "")
          );
        }
      }
      const said = encodeURIComponent(lines.join("\n"));
      return wa === "" ? `https://wa.me/?text=${said}` : `https://wa.me/${wa}?text=${said}`;
    },
    [wa]
  );

  /* Everything that is not a step's own button still carries whatever has
     been said so far, because the header and the help line are exactly
     where somebody gives up. */
  const waLink = handOver();

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
    // About two hops. Long enough not to pounce on somebody arriving,
    // short enough that anybody watching the button jump is still there.
    const when = setTimeout(() => setTeasing(true), 4200);
    return () => clearTimeout(when);
  }, [open]);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lines, typing, ask, seen]);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 560px)");
    const read = () => setSheet(narrow.matches);
    read();
    narrow.addEventListener("change", read);
    return () => narrow.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    const view = window.visualViewport;
    if (!open || !view) return undefined;
    const read = () => setSeen({ high: view.height, from: view.offsetTop });
    read();
    view.addEventListener("resize", read);
    view.addEventListener("scroll", read);
    return () => {
      view.removeEventListener("resize", read);
      view.removeEventListener("scroll", read);
    };
  }, [open]);

  /* And the page behind holds still. Otherwise a tap on the box scrolls
     the shop underneath the sheet and closing it leaves somebody halfway
     down a page they never meant to move. */
  useEffect(() => {
    if (!open) return undefined;
    const was = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = was;
    };
  }, [open]);

  /* Everything it needs to ask anything, read once when it is opened. */
  useEffect(() => {
    if (!open || start) return;
    let gone = false;
    fetch("/api/bot/start")
      .then((answer) => answer.json())
      .then((got: Start) => {
        if (gone) return;
        startRef.current = got;
        setStart(got);
        pending.current?.();
        pending.current = null;
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [open, start]);

  /*
   * A line that says what is happening, where the server takes a moment.
   *
   * Nothing is slower than a chat that has gone quiet: the dots stop, no
   * answer comes, and the person is left wondering whether it heard them.
   * So anything that waits on the server puts a word up after a third of
   * a second and takes it down when the answer arrives. Under that, it
   * stays silent, because a flash of "working on it" is worse than none.
   */
  const [busy, setBusy] = useState("");
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  const working = useCallback(
    async <T,>(said: string, doing: Promise<T>): Promise<T> => {
      waiting.current = setTimeout(() => setBusy(said), 350);
      try {
        return await doing;
      } finally {
        if (waiting.current) clearTimeout(waiting.current);
        waiting.current = null;
        setBusy("");
      }
    },
    []
  );

  /*
   * The lead, written the moment there is one and kept up to date.
   *
   * Somebody who gives a number and a block and then stops is a person to
   * ring tomorrow, which is worth more than the silence it used to be. It
   * goes in the same list as a basket somebody filled and walked away
   * from, because a person is a person whichever one they were holding,
   * and it is marked so the opening line can be the right one.
   */
  const remember = useCallback((summary: string, value = 0) => {
    const mine = held.current;
    if (mine.phone === "") return;
    fetch("/api/app/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: mine.phone,
        name: mine.name,
        hostel: mine.hostel,
        batchId: mine.run?.id ?? null,
        items: Math.max(1, mine.lines.reduce((all, line) => all + line.qty, 0)),
        value,
        summary: `Chat · ${summary}`.slice(0, 500),
      }),
    }).catch(() => undefined);
  }, []);

  const me = useCallback((said: string) => say({ kind: "me", said }, 0), [say]);
  const bot = useCallback(
    (html: string, pause?: number) => say({ kind: "bot", html }, pause),
    [say]
  );

  /* ---------------------------------------------------------------- steps */

  /*
   * We do not stock it, so we offer to go and get it.
   *
   * The shop buys things nobody stocks every week; the only reason that
   * does not happen more is that people have to find the page for it.
   * Here it is a button, and the name, number and block are already known,
   * so all that is asked is what they want.
   */
  const askUsFor = useCallback(
    (first: string) => {
      bot(
        "We do not carry that one yet. We can go and buy it for you though. " +
          "Tell me what you want and roughly what it costs, and a person will " +
          "come back to you with the real price before any money moves.",
        560
      );
      setAsk({
        of: "text",
        placeholder: first || "e.g. a large Debonairs meatlovers",
        onSay: async (wanted) => {
          me(wanted);
          setAsk({ of: "nothing" });
          const mine = held.current;
          try {
            const answer = await working(
              "Sending that over…",
              fetch("/api/bot/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  wanted,
                  name: mine.name,
                  phone: mine.phone,
                  hostel: mine.hostel,
                }),
              })
            );
            const got = (await answer.json()) as { ok?: boolean; error?: string };
            if (!got.ok) {
              bot(got.error || "Could not send that just now.", 450);
              setAsk({
                of: "buttons",
                buttons: [
                  { said: "Try again", look: "alt", go: () => { me("Try again"); askUsFor(wanted); } },
                  { said: "Continue on WhatsApp", look: "green", href: handOver("I am after something you do not stock.") },
                ],
              });
              return;
            }
            say(
              {
                kind: "status",
                tone: "ok",
                html: "<span><b>Sent.</b> Somebody will come back to you on your number.</span>",
              },
              420
            );
            bot("Anything else while you are here?", 450);
            setAsk({
              of: "buttons",
              buttons: [
                { said: "Order something else", go: () => { me("Order something else"); askOrderRef.current?.(true); } },
                { said: "That's all for now", look: "alt", go: () => { me("That's all for now"); byeRef.current?.(); } },
              ],
            });
          } catch {
            bot("Could not send that just now.", 420);
            setAsk({
              of: "buttons",
              buttons: [{ said: "Try again", go: () => { me("Try again"); askUsFor(wanted); } }],
            });
          }
        },
      });
    },
    [bot, handOver, me, say, working]
  );

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
          const answer = await working(
            "Looking through the menus…",
            fetch("/api/bot/find", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ said, kitchen: queue.current[0]?.id ?? "" }),
            })
          );
          const got = (await answer.json()) as {
            how: string;
            qty: number;
            hits: Hit[];
            instead: { id: string; name: string; shop: string }[];
            shops?: { id: string; name: string }[];
          };
          /* Nearly a counter. A tap settles it, and saying nothing would
             send somebody to WhatsApp over a spelling. */
          if (got.how === "maybe-kitchens" && (got.shops ?? []).length > 0) {
            const nearly = got.shops ?? [];
            bot(
              nearly.length === 1
                ? `Did you mean <b>${nearly[0].name}</b>?`
                : "Did you mean one of these?",
              450
            );
            setAsk({
              of: "chips",
              chips: [
                ...nearly.map((shop, which) => ({
                  said: shop.name,
                  hot: which === 0,
                  go: () => {
                    me(shop.name);
                    queue.current = [shop];
                    askOrder();
                  },
                })),
                { said: "None of those", go: () => { me("None of those"); askOrder(); } },
              ],
            });
            return;
          }
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
                { said: "Continue on WhatsApp", look: "green", href: handOver("Could you help me finish it?") },
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
          /*
           * Nothing close at all.
           *
           * Three doors, in the order they are worth offering. What is on
           * today, because most of the time it is a word away. Then asking
           * us to go and get it, because somebody who types Debonairs is
           * not a dead end, they are a sale we have not made yet and the
           * shop already has a list for exactly that. A person last.
           */
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
              { said: "Ask us to get it", hot: true, go: () => { me("Ask us to get it"); askUsFor(said); } },
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
          remember(
            held.current.lines
              .map((line) => `${line.qty > 1 ? `${line.qty} × ` : ""}${line.name}`)
              .join(", ")
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
    [askOrder, bot, me, remember]
  );

  useEffect(() => {
    walkRef.current = walk;
  }, [walk]);

  useEffect(() => {
    askOrderRef.current = askOrder;
  }, [askOrder]);

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
      const answer = await working(
        "Working out your total…",
        fetch("/api/bot/price", {
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
        })
      );
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
            { said: "Continue on WhatsApp", look: "green", href: handOver("Could you help me finish it?") },
          ],
        });
        return;
      }

      remember(
        got.lines.map((line) => `${line.qty > 1 ? `${line.qty} × ` : ""}${line.name}`).join(", "),
        got.total ?? 0
      );
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

  /*
   * Placing it, and saying how to pay.
   *
   * Through the same front door as the website's own checkout, so the run
   * sheet, the counter list, the PIN and the receipt all know about it.
   * The narration is the part that matters: without it a payment alert is
   * an amount and a stranger's name, and somebody has to guess.
   */
  const payNext = useCallback(async () => {
    setAt(5);
    setAsk({ of: "nothing" });
    const mine = held.current;
    try {
      const answer = await working(
        "Placing your order…",
        fetch("/api/bot/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId: mine.run?.id ?? "",
            name: mine.name,
            phone: mine.phone,
            hostel: mine.hostel,
            lines: mine.lines.map((line) => ({
              menu_item_id: line.itemId,
              qty: line.qty,
              option_ids: line.optionIds,
            })),
          }),
        })
      );
      const got = (await answer.json()) as {
        error?: string;
        id?: string;
        ref?: string;
        narration?: string;
        total?: number;
        link?: string;
        account?: { bank: string; name: string; number: string } | null;
        watching?: boolean;
      };

      if (got.error || !got.id) {
        bot(got.error || "I could not place that just now.", 450);
        setAsk({
          of: "buttons",
          buttons: [
            { said: "Try again", go: () => { me("Try again"); payNext(); } },
            { said: "Continue on WhatsApp", look: "green", href: handOver("Could you help me finish it?") },
          ],
        });
        return;
      }

      held.current.orderId = got.id;
      held.current.ref = got.ref ?? "";
      held.current.link = got.link ?? "";
      held.current.watching = got.watching === true;

      bot(
        `Order <b class="mono">${got.ref}</b> is in. Transfer <b>${naira(got.total ?? 0)}</b> to:`,
        450
      );
      if (got.account) {
        say(
          {
            kind: "card",
            card: {
              of: "pay",
              title: "Transfer to",
              rows: [
                { k: "Bank", d: got.account.bank },
                { k: "Account name", d: got.account.name },
                { k: "Account number", d: got.account.number },
              ],
            },
          },
          520
        );
      }
      bot("Send it, then tap below.", 420);
      setAsk({
        of: "buttons",
        buttons: [
          { said: "I’ve sent the transfer", go: () => { me("I’ve sent the transfer"); watchRef.current?.(); } },
        ],
        hint: got.narration
          ? `Put <b>${got.narration}</b> as the transfer narration.`
          : undefined,
      });
    } catch {
      bot("I could not reach the shop just then.", 420);
      setAsk({
        of: "buttons",
        buttons: [
          { said: "Try again", go: () => { me("Try again"); payNext(); } },
          { said: "Continue on WhatsApp", look: "green", href: handOver("Could you help me finish it?") },
        ],
      });
    }
  }, [bot, handOver, me, say, working]);

  const bye = useCallback(() => {
    setAt(6);
    const mine = held.current;
    bot(
      `All set, ${mine.name || "friend"}. Anything at all before the ${mine.run?.said ?? "next"} run, reach us here.`,
      480
    );
    setAsk({
      of: "buttons",
      buttons: [
        { said: "Message us on WhatsApp", look: "green", href: handOver() },
        ...(email ? [{ said: `Write to ${email}`, look: "alt" as const, href: `mailto:${email}` }] : []),
      ],
      hint: `Your order is <b>${mine.ref}</b>. Keep that and we can find it in a second.`,
    });
  }, [bot, email, handOver]);

  /* The money landed. */
  const paid = useCallback(
    (receipt: string) => {
      if (poll.current) clearTimeout(poll.current);
      setAt(6);
      const mine = held.current;
      say(
        {
          kind: "status",
          tone: "ok",
          html: `<span><b>Payment confirmed.</b> Order <b class="mono">${mine.ref}</b> is on the ${mine.run?.said ?? "next"} run.</span>`,
        },
        380
      );
      bot(`The rider calls <b>${mine.phone}</b> when he is outside ${mine.hostel}.`, 500);
      /*
       * Where to watch it from here, and how to find everything else.
       *
       * The PIN is never said in the chat. It is said on WhatsApp, to the
       * number it belongs to, because anybody can type anybody's number
       * into a box and a PIN read off a screen is a PIN given away.
       */
      bot(
        `You can follow this one on its own page, and everything you have ever ordered ` +
          `lives under <b>${mine.phone}</b> on the orders page. We send your PIN to that ` +
          `number on WhatsApp, so it is never written here.`,
        560
      );
      setAsk({
        of: "buttons",
        buttons: [
          ...(mine.link ? [{ said: "Track this order", href: mine.link }] : []),
          ...(receipt ? [{ said: "Open my receipt", look: "alt" as const, href: receipt }] : []),
          { said: "See all my orders", look: "alt" as const, href: "/orders" },
          { said: "That's all, thanks", look: "alt" as const, go: () => { me("That's all, thanks"); bye(); } },
        ],
        hint: receipt ? "The receipt saves as a PDF, or forwards as a link." : undefined,
      });
    },
    [bot, bye, me, say]
  );

  /*
   * No alert yet, which is ordinary and is said as ordinary.
   *
   * The fast watching stops here, because three minutes is as long as
   * anybody should be asked to sit looking at a spinner, and an alert is
   * sometimes an hour. But the chat does not go deaf: it keeps one quiet
   * check a
   * minute going in the background, so if the money lands while the panel
   * is still open it still says so, in the same conversation. One request
   * a minute for half an hour, then it stops asking for good, because a
   * page left open overnight should not be knocking on the door until
   * morning.
   */
  const unconfirmed = useCallback(() => {
    if (poll.current) clearTimeout(poll.current);
    const mine = held.current;

    let quiet = 0;
    const listen = async () => {
      quiet += 1;
      try {
        const answer = await fetch(`/api/bot/order/${mine.orderId}`);
        const got = (await answer.json()) as { how: string; receipt?: string };
        if (got.how === "paid") {
          paid(got.receipt ?? "");
          return;
        }
      } catch {
        /* A check that failed is a check, not an answer. */
      }
      if (quiet < LISTEN_FOR) poll.current = setTimeout(listen, 60000);
    };
    if (mine.watching && mine.orderId !== "") poll.current = setTimeout(listen, 60000);
    say(
      {
        kind: "status",
        tone: "warn",
        html: "<span><b>Not confirmed yet.</b> No alert has reached us.</span>",
      },
      380
    );
    bot("That is normal. Bank alerts are sometimes minutes and sometimes longer.", 500);
    bot(
      "You do not have to sit here. Leave this open and I will say so the moment it lands, " +
        "or close it and we will message you.",
      520
    );
    bot(
      `Your order <b class="mono">${mine.ref}</b> is saved against the <b>${mine.run?.said ?? "next"}</b> run. ` +
        `We will message you on WhatsApp at <b>${mine.phone}</b> the moment it lands.`,
      520
    );
    setAsk({
      of: "buttons",
      buttons: [
        { said: "Message us on WhatsApp", look: "green", href: handOver() },
        { said: "Check again now", look: "alt", go: () => { me("Check again now"); watchRef.current?.(); } },
      ],
      hint: `Quote <b>${mine.ref}</b> if you message us.`,
    });
  }, [bot, handOver, me, paid, say]);

  /*
   * Watching for the money, honestly.
   *
   * Only where the shop marks transfers paid by itself. Where it does not,
   * there is nothing to watch for, and a spinner that was never going to
   * stop is the worst of both. So it says what will actually happen, which
   * is that somebody will message them.
   *
   * And it gives up out loud. A bank alert is minutes sometimes and an
   * hour others, and a chat that span for an hour would be a chat that
   * lied about what it was doing.
   */
  const watch = useCallback(() => {
    setAt(5);
    const mine = held.current;

    if (!mine.watching) {
      say(
        {
          kind: "status",
          tone: "",
          html: "<span><b>Got it.</b> We check every transfer against the account by hand.</span>",
        },
        420
      );
      bot(
        `Your order <b class="mono">${mine.ref}</b> is saved against the <b>${mine.run?.said ?? "next"}</b> run. ` +
          `We will message you on WhatsApp at <b>${mine.phone}</b> the moment it lands.`,
        520
      );
      setAsk({
        of: "buttons",
        buttons: [{ said: "Message us on WhatsApp", look: "green", href: handOver() }],
        hint: `Quote <b>${mine.ref}</b> if you message us.`,
      });
      return;
    }

    let tries = 0;
    const look = async () => {
      tries += 1;
      try {
        const answer = await fetch(`/api/bot/order/${mine.orderId}`);
        const got = (await answer.json()) as { how: string; receipt?: string };
        if (got.how === "paid") {
          paid(got.receipt ?? "");
          return;
        }
      } catch {
        /* A check that failed is a check, not an answer. */
      }
      if (tries >= WATCH_FOR) {
        unconfirmed();
        return;
      }
      poll.current = setTimeout(look, LOOK_EVERY);
    };

    say({ kind: "status", tone: "", spinning: true, html: "Watching for your transfer…" }, 420);
    poll.current = setTimeout(look, FIRST_LOOK);

    setAsk({
      of: "buttons",
      buttons: [
        {
          said: "I’ll check back later",
          look: "alt",
          go: () => {
            if (poll.current) clearTimeout(poll.current);
            me("I’ll check back later");
            unconfirmed();
          },
        },
      ],
      hint: "We watch for about three minutes. After that we message you, so you do not have to sit here.",
    });
  }, [bot, handOver, me, paid, say, unconfirmed]);

  useEffect(() => {
    watchRef.current = watch;
  }, [watch]);

  useEffect(() => {
    byeRef.current = bye;
  }, [bye]);

  const askKitchen = useCallback(() => {
    setAt(2);
    bot("Here is who is open. Tap one and I will show you what they have.");
    setAsk({
      of: "chips",
      chips: [
        ...(startRef.current?.kitchens ?? []).map((shop) => ({
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
  }, [askOrder, bot, me]);

  const askSlot = useCallback(() => {
    setAt(1);
    const runs = startRef.current?.runs ?? [];
    if (runs.length === 0) {
      bot("Nothing is open for orders this minute. A person can still sort you out.");
      setAsk({ of: "buttons", buttons: [{ said: "Message us on WhatsApp", look: "green", href: handOver() }] });
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
          note: `Orders close ${first.closes} · delivery from ${naira(startRef.current?.feeFrom ?? 0)}`,
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
        fee: startRef.current?.feeFrom ?? 0,
        rush: false,
      })),
      onPick: (which) => {
        const run = runs[which];
        held.current.run = run;
        me(`Run ${run.said}, ${run.window}`);
        askOrder();
      },
    });
  }, [askOrder, bot, me, say, waLink]);

  const askHostel = useCallback(() => {
    setAt(0);
    const blocks = startRef.current?.hostels ?? [];
    if (blocks.length === 0) {
      // The lists are still on their way. Said rather than shown as an
      // empty row of nothing.
      setBusy("Just a second…");
      setAsk({ of: "nothing" });
      pending.current = () => {
        setBusy("");
        askHostel();
      };
      return;
    }
    bot("Where am I bringing it? Tap your block.");
    setAsk({
      of: "chips",
      chips: blocks.map((hostel) => ({
        said: hostel,
        go: () => {
          me(hostel);
          held.current.hostel = hostel;
          remember("gave their details, nothing chosen yet");
          askSlot();
        },
      })),
    });
  }, [askSlot, bot, me, remember]);

  const askPhone = useCallback(() => {
    setAt(0);
    bot(`Nice to meet you, <b>${held.current.name || "friend"}</b>. What number should the rider call?`);
    let tries = 0;
    setAsk({
      of: "text",
      type: "tel",
      placeholder: "080…",
      onSay: (said) => {
        me(said);
        const number = phoneIn(said);
        if (number) {
          held.current.phone = number;
          askHostel();
          return;
        }
        tries += 1;
        /* A number the rider cannot ring is an order nobody can deliver,
           so this one is worth insisting on. Twice, and then a person
           takes over rather than somebody being stuck in a loop with a
           box that keeps saying no. */
        if (tries >= 3) {
          bot(
            "I am not reading that as a Nigerian mobile, and I would rather not " +
              "guess at the number the rider has to call. A person can sort this out in a second.",
            520
          );
          setAsk({
            of: "buttons",
            buttons: [
              {
                said: "Continue on WhatsApp",
                look: "green",
                href: handOver("The chat could not read my number. Here it is in full."),
              },
              { said: "Let me try once more", look: "alt", go: () => { me("Let me try once more"); askPhone(); } },
            ],
          });
          return;
        }
        bot(
          tries === 1
            ? "That does not look like a phone number. Something like <b>0803 123 4567</b>."
            : "Still not quite. Eleven digits starting 070, 080, 081, 090 or 091.",
          450
        );
      },
    });
  }, [askHostel, bot, handOver, me]);

  const begin = useCallback(() => {
    held.current = { ...EMPTY, lines: [] };
    setLines([]);
    setAt(0);
    bot("Hey, I’m <b>Sudu Bot</b>. I can take your order right here, no app needed.", 450);
    bot("What should I call you?");
    let tries = 0;
    const takeIt = (said: string) => {
      held.current.name = said.split(" ")[0];
      askPhone();
    };
    setAsk({
      of: "text",
      placeholder: "Your name",
      onSay: (said) => {
        me(said);
        tries += 1;
        /* Asked their name, a fair few people answer with what they want
           to eat, because that is what they came for. Taken at face value
           it addresses every message afterwards to a pizza shop. Asked
           once, then taken at their word: a name is not a thing to argue
           about, and somebody really called Ola Pizza exists. */
        if (tries === 1 && !looksLikeAName(said, startRef.current?.kitchens ?? [])) {
          bot(
            "That sounds more like what you want to eat than what you are called. " +
              "We will get to the food in a second. What should I call you?",
            450
          );
          return;
        }
        takeIt(said);
      },
    });
  }, [askPhone, bot, me]);

  /*
   * Said once.
   *
   * This used to wait for the lists and then check whether anything had
   * been said yet, which is a question that answers "no" for the half
   * second the first line spends in the queue. So it greeted, re-rendered,
   * saw an empty log and greeted again, for ever, in front of somebody
   * trying to type their name.
   *
   * A flag, flipped before anything is queued. And it no longer waits for
   * the lists: a name is not a thing the server has to be asked about, and
   * ten seconds of silence after somebody taps is the one cost this cannot
   * carry.
   */
  const greeted = useRef(false);
  useEffect(() => {
    if (!open || greeted.current) return;
    greeted.current = true;
    begin();
  }, [begin, open]);

  function close() {
    greeted.current = false;
    clear();
    if (poll.current) clearTimeout(poll.current);
    poll.current = null;
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
        <div
          className="sudubot-panel"
          role="dialog"
          aria-label="Sudu Bot"
          style={
            sheet && seen
              ? { height: `${seen.high}px`, top: `${seen.from}px`, bottom: "auto" }
              : undefined
          }
        >
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
              href={handOver()}
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
            {busy !== "" && (
              <div className="status">
                <span className="spin" />
                <span>{busy}</span>
              </div>
            )}
          </div>

          <Asking ask={ask} whatsapp={handOver()} email={email} />
        </div>
      )}
    </div>
  );
}
