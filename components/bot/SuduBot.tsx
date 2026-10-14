"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { naira } from "@/lib/money";
import { pickFaq } from "@/lib/faq-match";
import {
  find,
  whyNotAName,
  nameIn,
  phoneIn,
  asksToSwap,
  lineLike,
  splitOrder,
  intentOf,
  namedIn,
  without,
  type Swap,
} from "@/lib/bot-match";
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
  cars: Car[];
  carFrom: number;
  feeFrom: number;
  /** Whether there is a code anybody could type tonight. */
  codes: boolean;
  /** What the chat is allowed to answer on its own: the shop's own words,
   *  edited in admin. There is no model in here, so this is the whole of
   *  what it knows. */
  faqs: { id: string; question: string; answer: string; keywords: string }[];
  whatsapp: string;
  email: string;
};

type Car = {
  at: string;
  label: string;
  phrase: string;
  day: "today" | "tomorrow" | "later";
  date: string;
  dow: string;
  dom: number;
};

type Run = {
  id: string;
  label: string;
  said: string;
  runDate: string;
  window: string;
  closes: string;
  /** When the car sets off, so "sooner" can mean sooner. */
  startsAt: string;
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
  /** How many of this one, read off the sentence and sanity-checked
   *  against the dish's own name. */
  qty: number;
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
  /** A car of its own instead of a run, where they asked for one. */
  car: Car | null;
  kitchen: { id: string; name: string } | null;
  /** What has been chosen, as the server will be told it. */
  /** A discount code, once one has been checked and found good. The
   *  figure is never worked out here: the checkout applies it again and
   *  its answer is the one on the receipt. */
  code?: { code: string; label: string; discount: number } | null;
  lines: {
    itemId: string;
    name: string;
    qty: number;
    optionIds: string[];
    chose: string[];
    /** Which counter it is from. Not sent anywhere: it is how somebody
     *  talks about the line afterwards ("the KFC one") and how the chat
     *  tells two identical dishes from two kitchens apart. */
    shop?: string;
  }[];
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

/**
 * After that, a quieter look, and for how many of them.
 *
 * Half a minute rather than a whole one. The alert is not what is being
 * waited for by then so much as somebody in admin, and a minute of
 * looking at a screen that already says paid is a minute too long: the
 * first test of this ended with somebody pressing "check again now"
 * because nothing had happened yet.
 */
const LISTEN_EVERY = 30000;
const LISTEN_FOR = 60;

const EMPTY: Held = {
  name: "",
  phone: "",
  hostel: "",
  run: null,
  car: null,
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
  /** The sheet itself, so the keyboard can move it without a re-render. */
  const panel = useRef<HTMLDivElement | null>(null);
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
  /*
   * How many times running it has failed to land on what somebody wants.
   *
   * Asking "which one did you mean" is a tap and is right the first time.
   * Asking it four times in a row is a loop, and somebody in a loop with a
   * bot is somebody who leaves. Three and a person takes over, with
   * everything already said carried across.
   */
  const misses = useRef(0);
  /** How many more of something somebody said they wanted and has not
   *  picked yet, so the chat asks rather than letting them forget. */
  const owed = useRef(0);
  const askOrderRef = useRef<((again?: boolean) => void) | null>(null);
  /** The search, held in a box because the change step runs it too. */
  const huntRef = useRef<((said: string, echo?: boolean) => void) | null>(null);
  /** The basket editor, held the same way: the step that adds a line
   *  offers it, and it offers the step that adds a line. */
  const changeRef = useRef<((asked?: Swap | null) => void) | null>(null);
  /** The bill, held in a box so a pasted list can end at it from
   *  anywhere, including from a line that was skipped. */
  const soonRef = useRef<(() => void) | null>(null);
  /** The question step, held in a box because the answers above it offer
   *  it as the way out when none of them fit. */
  const askAQuestionRef = useRef<((first?: string) => void) | null>(null);
  /** Said no to a discount code already. Asked once per version of the
   *  order: asking again on the same bill is nagging, and asking again
   *  after the order changed is the only honest thing to do, because what
   *  a code is worth changed with it. */
  const noCode = useRef(false);
  /* An order pasted in whole, waiting its turn. "5 jollof, 2 zinger, 1
     coke" is three searches, taken one at a time so the questions each
     one asks land in the right place. */
  const list = useRef<string[]>([]);
  /** How long that list was, so the end of it can be announced and the
   *  bill shown rather than asking somebody who has already said
   *  everything whether they want anything else. */
  const listing = useRef(0);
  const byeRef = useRef<(() => void) | null>(null);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);
  /*
   * Said once, and then never again.
   *
   * Pressing "check again now" while the quiet check was still running
   * left two watchers going, and when the money landed they both
   * announced it: two payment confirmations with a spinner between them,
   * on a loop. One flag ends every chain, and a chain that wakes up after
   * it is set goes quietly back to sleep.
   */
  const settled = useRef(false);

  /**
   * Whatever is being waited on, stopped, and the spinner taken down.
   *
   * A spinner is a thing happening now, not a thing that happened, so it
   * has no business staying in the log underneath the answer it was
   * waiting for. "Watching for your transfer…" sitting above "Payment
   * confirmed" reads as though it is still going.
   */
  const stopWatching = useCallback(() => {
    if (poll.current) clearTimeout(poll.current);
    poll.current = null;
    setLines((all) => all.filter((one) => !(one.kind === "status" && one.spinning)));
  }, []);
  const log = useRef<HTMLDivElement | null>(null);

  const push = useCallback((line: Line) => setLines((all) => [...all, line]), []);
  const { say, clear, typing } = useSaying(push, () => undefined);

  /*
   * The number as wa.me wants it.
   *
   * The shop keeps it the way it is dialled, "0903 217 5147", and wa.me
   * reads a leading zero as a username rather than a Nigerian number:
   * every way out of the chat opened WhatsApp saying "@09032175147 isn't
   * on WhatsApp", which is the one door that has to work.
   */
  const dialled = (start?.whatsapp || whatsapp || "").replace(/[^\d]/g, "");
  const wa = dialled.startsWith("0") ? `234${dialled.slice(1)}` : dialled;
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
  }, [lines, typing, ask]);

  /*
   * The sheet follows the keyboard without React in the way.
   *
   * iOS fires a stream of viewport events while the keyboard slides, and
   * re-rendering on each one is always a frame behind: the panel lagged,
   * then snapped. The height is written straight onto the element from
   * the handler instead, so it moves with the keyboard rather than after
   * it, and on a desk the inline sizes are cleared and the stylesheet
   * takes the panel back.
   */
  useEffect(() => {
    const view = window.visualViewport;
    if (!open) return undefined;

    const narrow = window.matchMedia("(max-width: 560px)");
    const fit = () => {
      const box = panel.current;
      if (!box) return;
      if (!narrow.matches || !view) {
        box.style.removeProperty("height");
        box.style.removeProperty("top");
        box.style.removeProperty("bottom");
        return;
      }
      box.style.height = `${Math.round(view.height)}px`;
      box.style.top = `${Math.round(view.offsetTop)}px`;
      box.style.bottom = "auto";
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    };

    fit();
    view?.addEventListener("resize", fit);
    view?.addEventListener("scroll", fit);
    narrow.addEventListener("change", fit);
    return () => {
      view?.removeEventListener("resize", fit);
      view?.removeEventListener("scroll", fit);
      narrow.removeEventListener("change", fit);
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
  /*
   * Somebody with a question rather than an order.
   *
   * "I have an enquiry" is not a dish and never will be, and pushing that
   * person round a menu they are not shopping from is how a chat loses
   * somebody who was ready to be helped. It goes to the same list as the
   * things nobody stocks, which is the list somebody reads and answers,
   * marked as a question so the answer is a sentence rather than a price.
   *
   * WhatsApp is on the screen the whole time underneath, so anybody who
   * would rather not wait does not have to.
   */
  /*
   * The shop's own answer to a question it has been asked before.
   *
   * There is no model in this chat, which is the whole point: it cannot
   * invent a delivery fee, a refund policy or an opening time, and it will
   * never tell somebody something this shop did not say. The cost of that
   * is it can only answer what it has been given, and what it has been
   * given is a list somebody edits in admin and adds to every time a
   * question comes up twice.
   *
   * Two floors. Above the higher one it answers, because being answered is
   * the point. Between them it offers the question it thinks was asked,
   * because an answer to a question nobody asked is worse than a question.
   * Below both it says nothing and lets the caller carry on, which ends at
   * a person either way.
   */
  const sayFaq = useCallback(
    (said: string): boolean => {
      const all = startRef.current?.faqs ?? [];
      if (all.length === 0) return false;

      const found = pickFaq(said, all);

      const answer = (hit: { id: string; answer: string }) => {
        bot(hit.answer, 520);
        /* Counted so the list in admin can be ordered by what people
           actually ask. Nothing waits on it. */
        void fetch("/api/bot/faq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: hit.id }),
        }).catch(() => {});

        bot("Does that answer it?", 460);
        setAsk({
          of: "buttons",
          buttons: [
            { said: "Yes, thanks", go: () => { me("Yes, thanks"); askOrderRef.current?.(true); } },
            {
              said: "Not quite, ask a person",
              look: "alt",
              go: () => { me("Not quite, ask a person"); askAQuestionRef.current?.(said); },
            },
          ],
          hint: "I can take your order right here too.",
        });
      };

      if (found.sure) {
        answer(found.sure);
        return true;
      }

      if (found.maybe.length > 0) {
        bot("I think I have been asked this before. Is it one of these?", 480);
        setAsk({
          of: "chips",
          chips: [
            ...found.maybe.map((hit, which) => ({
              said: hit.question,
              hot: which === 0,
              go: () => {
                me(hit.question);
                answer(hit);
              },
            })),
            {
              said: "None of those",
              go: () => { me("None of those"); askAQuestionRef.current?.(said); },
            },
          ],
        });
        return true;
      }

      return false;
    },
    [bot, me]
  );

  const askAQuestion = useCallback(
    (first = "") => {
      bot(
        "Of course. Type your question and I will send it over with your " +
          "number, and somebody will come back to you.",
        520
      );
      setAsk({
        of: "text",
        placeholder: first || "Your question",
        onSay: async (asked) => {
          me(asked);
          setAsk({ of: "nothing" });
          const mine = held.current;
          try {
            const answer = await working(
              "Sending that over…",
              fetch("/api/bot/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  wanted: asked,
                  name: mine.name,
                  phone: mine.phone,
                  hostel: mine.hostel,
                  kind: "question",
                }),
              })
            );
            const got = (await answer.json()) as { ok?: boolean; error?: string };
            if (!got.ok) {
              bot(got.error || "Could not send that just now.", 450);
              setAsk({
                of: "buttons",
                buttons: [
                  { said: "Try again", look: "alt", go: () => { me("Try again"); askAQuestion(asked); } },
                  { said: "Ask on WhatsApp", look: "green", href: handOver("I have a question.") },
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
                { said: "Order something", go: () => { me("Order something"); askOrderRef.current?.(true); } },
                { said: "Ask on WhatsApp too", look: "alt", href: handOver("I have a question.") },
                { said: "That's all for now", look: "alt", go: () => { me("That's all for now"); byeRef.current?.(); } },
              ],
            });
          } catch {
            bot("Could not send that just now.", 420);
            setAsk({
              of: "buttons",
              buttons: [
                { said: "Try again", go: () => { me("Try again"); askAQuestion(asked); } },
                { said: "Ask on WhatsApp", look: "green", href: handOver("I have a question.") },
              ],
            });
          }
        },
      });
    },
    [bot, handOver, me, say, working]
  );

  useEffect(() => {
    askAQuestionRef.current = askAQuestion;
  }, [askAQuestion]);

  const askUsFor = useCallback(
    (first: string) => {
      bot(
        "Tell me what you want and where it is from, and roughly what it costs if " +
          "you know. A person goes and buys it, and comes back to you with the real " +
          "price before any money moves.",
        560
      );
      setAsk({
        of: "text",
        placeholder: first || "e.g. a Caesar salad from Debonairs",
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

  /*
   * Looking for what somebody just said, and doing whatever that turns out
   * to need.
   *
   * Lifted out of the question that asks it, because it is now asked from
   * two places: the plain "what do you fancy", and a change to an order
   * already taken, where "change the KFC chicken to Chicken Republic" has
   * to run the same search on the second half of the sentence without
   * making anybody type it again.
   */
  const hunt = useCallback(
    async (said: string, echo = true) => {
      if (echo) me(said);
      setAsk({ of: "nothing" });

      /*
       * Said to change something already on the order.
       *
       * Only ever on a sentence somebody typed, and only with something on
       * the order to change: "change it to Chicken Republic" with an empty
       * basket is somebody ordering, not editing.
       */
      if (echo && held.current.lines.length > 0) {
        const swap = asksToSwap(said);
        if (swap) {
          changeRef.current?.(swap);
          return;
        }
      }

      /*
       * An answer about ordering rather than an order, and the person who
       * came with a question instead.
       *
       * Searched for, "I want to order" matches nothing on any menu and
       * the chat says it cannot find it anywhere on the shop, which reads
       * as broken to somebody who said the most reasonable sentence in the
       * world. Both get pointed at the right next question instead.
       */
      if (echo) {
        const meant = intentOf(said);

        /*
         * The shop's own words first, on anything that is not an order.
         *
         * Somebody asking what delivery costs would rather have the real
         * answer than a question about it, and the real answer is whatever
         * is written in admin. Only where there is one: with nothing
         * written, each of these still has a sensible next question.
         */
        if (meant !== "" && meant !== "vague-order" && sayFaq(said)) return;

        if (meant === "question") {
          askAQuestion();
          return;
        }

        /*
         * What delivery costs, from the same numbers the bill charges.
         *
         * Nothing here is typed out: the floor and the car's floor come
         * back from the server with everything else, so a change in admin
         * changes this sentence. And it says what it cannot say, because
         * the fee goes up with how much is in the car and any single
         * figure before anybody has ordered would be a guess dressed as a
         * price.
         */
        if (meant === "fees") {
          const start = startRef.current;
          const floor = start?.feeFrom ?? 0;
          const car = start?.carFrom ?? 0;
          bot(
            floor > 0
              ? `Delivery starts at <b>${naira(floor)}</b> on a shared run and goes ` +
                  "up with how much is in the car, so a bigger order pays a little more."
              : "Delivery depends on how much is in the car.",
            520
          );
          if (car > 0) {
            bot(
              `A car to yourself, at a time you pick, starts at <b>${naira(car)}</b>.`,
              460
            );
          }
          bot(
            "Either way you see the exact figure on the bill before you pay " +
              "anything. Shall we build your order and look?",
            500
          );
          setAsk({
            of: "buttons",
            buttons: [
              { said: "Yes, let's order", go: () => { me("Yes, let's order"); askOrderRef.current?.(true); } },
              {
                said: "I have another question",
                look: "alt",
                go: () => { me("I have another question"); askAQuestion(); },
              },
            ],
          });
          return;
        }

        /*
         * What there is.
         *
         * The honest answer is "a lot", and reading it out is a wall of
         * three hundred dishes in a chat window. The counters open today
         * are the useful answer, and the full menu is a page that already
         * exists and does this better.
         */
        if (meant === "menu") {
          const kitchens = startRef.current?.kitchens ?? [];
          bot(
            kitchens.length > 0
              ? `Open today: <b>${kitchens.map((one) => one.name).join("</b>, <b>")}</b>.`
              : "I can look across every counter we have open.",
            520
          );
          bot("Say what you fancy and I will find it, or pick a counter.", 460);
          setAsk({
            of: "chips",
            chips: [
              ...kitchens.slice(0, 8).map((one) => ({
                said: one.name,
                go: () => {
                  me(one.name);
                  queue.current = [one];
                  askOrderRef.current?.();
                },
              })),
              { said: "Just let me type it", go: () => { me("Just let me type it"); askOrderRef.current?.(true); } },
            ],
            hint: "The whole menu is on the site too, if you would rather browse.",
          });
          return;
        }

        /*
         * Help, which is two jobs until you ask which.
         *
         * Half the people who type it want a hand ordering, which is the
         * one thing this chat is for and can do in a minute. The other
         * half want something only a person can do. Guessing is wrong half
         * the time, so it asks, and the way to a person is on the screen
         * either way.
         */
        if (meant === "help") {
          bot("Of course. Is it the order, or something else?", 480);
          setAsk({
            of: "buttons",
            buttons: [
              { said: "Help me order", go: () => { me("Help me order"); askOrderRef.current?.(true); } },
              {
                said: "Something else",
                look: "alt",
                go: () => { me("Something else"); askAQuestion(); },
              },
              { said: "Talk to a person now", look: "green", href: handOver("I could use a hand.") },
            ],
          });
          return;
        }

        if (meant === "vague-order") {
          bot(
            "Of course. What would you like? Say the dish, or the kitchen, or " +
              "both, and a typo is fine.",
            480
          );
          setAsk({
            of: "text",
            placeholder: "e.g. 2 medium bbq pizza",
            onSay: (then) => huntRef.current?.(then),
          });
          return;
        }
      }

      /*
       * The order arriving written out, which is how it arrives whenever
       * it was agreed somewhere else first. Taken one at a time, because
       * each thing on it may have a question of its own.
       */
      if (echo && list.current.length === 0) {
        const parts = splitOrder(said);
        if (parts.length >= 2) {
          /*
           * A counter named once covers the whole list.
           *
           * "5 jollof, 2 zinger burger, 1 coke from Burger King" names the
           * kitchen at the end and means it about all three. Read part by
           * part, two of them would be searched across every counter in
           * the shop and the third would carry a stray "burger king" into
           * the dish name. So the counter is lifted out of the sentence,
           * every part is searched there, and its words come out of each
           * part.
           *
           * Only where exactly one is named. Two counters in one list is
           * somebody saying which is which, and each part already carries
           * its own.
           */
          const named = namedIn(said, startRef.current?.kitchens ?? []);
          const one = named.length === 1 ? named[0] : null;
          const cleaned = one ? parts.map((part) => without(part, named)) : parts;

          list.current = cleaned.slice(1);
          listing.current = cleaned.length;
          if (one) queue.current = [one];
          bot(
            `<b>${cleaned.length}</b> things` +
              (one ? ` from <b>${one.name}</b>` : "") +
              ". I will take them one at a time, and ask about any I cannot place.",
            460
          );
          huntRef.current?.(cleaned[0], false);
          return;
        }
      }
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
          shelf?: string;
        };
        /*
         * The same thing on four counters.
         *
         * Nearly everybody sells chicken, and where it comes from
         * changes the price, the menu and the questions after it. So it
         * is asked first, and then the search runs again at that one
         * counter with the same words.
         */
        if (got.how === "where" && (got.shops ?? []).length > 1) {
          misses.current = 0;
          const places = got.shops ?? [];
          const pick = (shop: { id: string; name: string }) => {
            me(shop.name);
            queue.current = [shop];
            setAsk({ of: "nothing" });
            fetch("/api/bot/find", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ said, kitchen: shop.id }),
            })
              .then((answer) => answer.json())
              .then((again: { hits: Hit[] }) => {
                queue.current = [];
                if (again.hits[0]) walk(again.hits[0], again.hits[0].qty ?? got.qty);
                else askOrder();
              })
              .catch(() => askOrder());
          };

          /*
           * Two or three places is a question with an answer on it.
           * Six is a list.
           *
           * "Small chops" is Uncle Stan's or Burger King, and naming
           * them both in the sentence and putting them on two buttons
           * is the whole exchange. "Chicken" is five counters, and five
           * buttons stacked down the screen is a wall; those go as
           * chips, which read as a row of names rather than as a
           * decision somebody has to work through.
           */
          if (places.length <= 3) {
            bot(
              `${places.map((one) => `<b>${one.name}</b>`).join(" or ")}?`,
              450
            );
            setAsk({
              of: "buttons",
              buttons: places.map((shop, which) => ({
                said: shop.name,
                look: which === 0 ? undefined : ("alt" as const),
                go: () => pick(shop),
              })),
              hint: "The price and the menu change with the counter.",
            });
            return;
          }

          bot("A few places do that. Where from?", 450);
          setAsk({
            of: "chips",
            chips: places.map((shop, which) => ({
              said: shop.name,
              hot: which === 0,
              go: () => pick(shop),
            })),
            hint: "The price and the menu change with the counter.",
          });
          return;
        }

        /*
         * A kind of thing rather than one thing. "2 medium pizza" is not
         * a dish on any menu; it is a question, and the answer is the
         * shelf it came from.
         */
        if (got.how === "shelf" && (got.instead ?? []).length > 0) {
          misses.current = 0;
          const kind = (got.shelf ?? "").replace(/s$/i, "");
          bot(`Which ${kind.toLowerCase() || "one"}?`, 450);
          setAsk({
            of: "chips",
            chips: [
              ...(got.instead ?? []).map((one) => ({
                said: one.name,
                go: () => {
                  me(one.name);
                  setAsk({ of: "nothing" });
                  fetch("/api/bot/find", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ said: one.name, kitchen: queue.current[0]?.id ?? "" }),
                  })
                    .then((answer) => answer.json())
                    .then((again: { hits: Hit[] }) => {
                      if (!again.hits[0]) {
                        askOrder();
                        return;
                      }
                      /*
                       * Two pizzas is not necessarily two of one pizza.
                       *
                       * Somebody who said "2 medium pizza" and then
                       * picked one has not said whether the second is
                       * the same. Asked once, it is a tap; assumed, it
                       * is two Margheritas when they wanted one of each.
                       */
                      if (got.qty > 1) {
                        const hit = again.hits[0];
                        bot(
                          `All <b>${got.qty}</b> the same, or a different one for the rest?`,
                          450
                        );
                        setAsk({
                          of: "buttons",
                          buttons: [
                            {
                              said: `${got.qty} × ${hit.name}`,
                              go: () => {
                                me(`${got.qty} × ${hit.name}`);
                                walk(hit, got.qty);
                              },
                            },
                            {
                              said: `One ${hit.name}, I will pick the rest`,
                              look: "alt",
                              go: () => {
                                me(`One ${hit.name}`);
                                // The rest are still owed, so the chat
                                // asks for them rather than leaving
                                // somebody to remember.
                                owed.current = got.qty - 1;
                                walk(hit, 1);
                              },
                            },
                          ],
                        });
                        return;
                      }
                      walk(again.hits[0], 1);
                    })
                    .catch(() => askOrder());
                },
              })),
              { said: "Something else", go: () => { me("Something else"); askOrder(true); } },
            ],
            hint: "Scroll for more if yours is not showing.",
          });
          return;
        }

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
          misses.current = 0;
          walk(got.hits[0], got.hits[0].qty ?? got.qty);
          return;
        }

        misses.current += 1;
        if (misses.current >= 3) {
          misses.current = 0;
          bot(
            "Apologies, I understand what you are asking for and I am just not " +
              "finding it. Rather than have you tap through this again, let me " +
              "pass you to a person with everything you have already told me.",
            540
          );
          setAsk({
            of: "buttons",
            buttons: [
              {
                said: "Continue on WhatsApp",
                look: "green",
                href: handOver("Could you help me finish it?"),
              },
              { said: "Ask us to get it", look: "alt", go: () => { me("Ask us to get it"); askUsFor(said); } },
              { said: "Let me try once more", look: "alt", go: () => { me("Let me try once more"); askOrder(); } },
            ],
          });
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
                  misses.current = 0;
                  walk(hit, hit.qty ?? got.qty);
                },
              })),
              { said: "None of these", go: () => { me("None of these"); askOrder(); } },
            ],
            hint: "Tap the right one, or say it another way.",
          });
          return;
        }
        /*
         * Nobody sells it.
         *
         * Not a failure of the chat, and not a dead end either: the shop
         * buys things nobody stocks every week. So it says plainly that
         * nothing on the menu is that, and puts the two real answers up
         * as the two buttons. Pick something else, which is the ordinary
         * route, or say where to get it, which is the custom order
         * route the site already has a list for.
         */
        /*
         * Nothing on any menu is that, so perhaps it was never a dish.
         *
         * "Do you deliver on Sundays", "is there a minimum order", "where
         * are you based": every one of those gets to here, and "I cannot
         * find that anywhere on the shop" is the chat calling a reasonable
         * question wrong. So the shop's own answers are read before the
         * apology.
         */
        if (echo && sayFaq(said)) return;

        /*
         * Not on the counter they named, but somewhere else in the shop.
         *
         * "5 jollof, 2 zinger burger, 1 coke from Burger King" is three
         * things from one kitchen right up until one of them is not on
         * that kitchen's menu. Saying "I cannot find a coke" is plainly
         * wrong when the shop sells four of them, so the search is run
         * again across everywhere and the answer is offered rather than
         * taken: a second counter is a second delivery to think about,
         * which is theirs to decide and not the chat's.
         */
        const only = queue.current[0] ?? null;
        if (only) {
          try {
            const wider = await fetch("/api/bot/find", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ said }),
            });
            const more = (await wider.json()) as { how: string; qty: number; hits: Hit[] };
            const hit = more.hits[0];
            if (hit && hit.shop.id !== only.id) {
              misses.current = 0;
              bot(
                `<b>${said}</b> is not on <b>${only.name}</b>, but ` +
                  `<b>${hit.shop.name}</b> has <b>${hit.name}</b>.`,
                480
              );
              setAsk({
                of: "buttons",
                buttons: [
                  {
                    said: `Add it from ${hit.shop.name}`,
                    go: () => {
                      me(`Add it from ${hit.shop.name}`);
                      walkRef.current?.(hit, hit.qty ?? more.qty ?? got.qty);
                    },
                  },
                  {
                    said: "Skip it",
                    look: "alt",
                    go: () => {
                      me("Skip it");
                      /* Carrying on where the list left off, because a
                         skipped line is still a line dealt with. */
                      if (list.current.length > 0) {
                        const then = list.current.shift() as string;
                        bot(`Next: <b>${then}</b>.`, 420);
                        huntRef.current?.(then, false);
                        return;
                      }
                      if (listing.current > 0) {
                        listing.current = 0;
                        bot("Here is the total for the rest.", 440);
                        soonRef.current?.();
                        return;
                      }
                      askOrderRef.current?.(true);
                    },
                  },
                ],
                hint: "A second kitchen is a second stop for the car.",
              });
              return;
            }
          } catch {
            // The wider search is a kindness, not the answer. If it does
            // not come back, the ordinary two ways round follow.
          }
        }

        misses.current += 1;
        /*
         * Third time round, a person takes it.
         *
         * Nothing on the menu is that, and the two usual ways round it
         * have already been offered twice. Offering them a third time is
         * the loop, so the apology goes first and WhatsApp goes on the
         * green button, with the custom-order route still there under it
         * for anyone who would rather stay.
         */
        if (misses.current >= 3) {
          misses.current = 0;
          bot(
            `Apologies, I cannot find <b>${said}</b> either, and I do not want ` +
              "to keep you going round in circles.",
            500
          );
          bot(
            "A person can take it from here with everything you have already " +
              "told me.",
            480
          );
          setAsk({
            of: "buttons",
            buttons: [
              {
                said: "Continue on WhatsApp",
                look: "green",
                href: handOver("Could you help me finish it?"),
              },
              { said: "Ask us to get it", look: "alt", go: () => { me("Ask us to get it"); askUsFor(said); } },
              { said: "Let me try once more", look: "alt", go: () => { me("Let me try once more"); askOrder(true); } },
            ],
          });
          return;
        }
        bot(`I cannot find <b>${said}</b> anywhere on the shop today.`, 500);
        bot(
          "Two ways round that. Pick something else, or tell me where to get it " +
            "and a person will go and buy it for you.",
          520
        );
        setAsk({
          of: "buttons",
          buttons: [
            { said: "Go and buy it for me", go: () => { me("Go and buy it for me"); askUsFor(said); } },
            {
              said: "I'll pick something else",
              look: "alt",
              go: () => { me("I'll pick something else"); askOrder(true); },
            },
            ...((got.instead ?? []).length > 0
              ? [
                  {
                    said: "Show me what is on",
                    look: "alt" as const,
                    go: () => {
                      me("Show me what is on");
                      bot("Some of what is on today.", 420);
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
                                .catch(() => askOrder());
                            },
                          })),
                          { said: "Let me type it", go: () => { me("Let me type it"); askOrder(true); } },
                        ],
                        hint: "Scroll for more.",
                      });
                    },
                  },
                ]
              : []),
          ],
        });
      } catch {
        bot("Something went wrong finding that. Try saying it again?");
        askOrder();
      }
    },
    [askAQuestion, bot, handOver, me, sayFaq, waLink, working]
  );

  useEffect(() => {
    huntRef.current = hunt;
  }, [hunt]);

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
      onSay: (said) => huntRef.current?.(said),
    });
  }, [bot, me, waLink]);

  /* Walking the choices a dish asks before it can be priced. */
  const walk = useCallback(
    (hit: Hit, qty: number) => {
      const chosen: string[] = [];
      const named: string[] = [];
      const wanted = hit.groups.filter((group) => group.required || group.dearest);

      /*
       * What happens once the order has one more thing on it, whether that
       * was a new line or one more of a line already there.
       *
       * Written once because both routes owe the same three things: the
       * running order kept for a person to read on WhatsApp, whatever was
       * promised and not yet picked, and the counters somebody named that
       * have not been asked about yet.
       */
      const after = () => {
        /* A code is worth what it is worth against one particular cart,
           so a cart that just changed has no code on it until it is
           checked again. Quietly, because the question comes round again
           with the new bill. */
        held.current.code = null;
        noCode.current = false;
        remember(
          held.current.lines
            .map((line) => `${line.qty > 1 ? `${line.qty} × ` : ""}${line.name}`)
            .join(", ")
        );

        if (owed.current > 0) {
          const left = owed.current;
          owed.current = 0;
          bot(
            left === 1 ? "And the other one?" : `And the other <b>${left}</b>?`,
            450
          );
          askOrder(true);
          return;
        }

        /* Still working down a list somebody pasted in. */
        if (list.current.length > 0) {
          const then = list.current.shift() as string;
          bot(`Next: <b>${then}</b>.`, 420);
          huntRef.current?.(then, false);
          return;
        }

        /*
         * And the end of one goes straight to the bill.
         *
         * Somebody who pasted the whole order in has already said
         * everything they want; asking "anything else?" at the end of
         * their own list is the chat not having listened. What they are
         * waiting for is the total.
         */
        if (listing.current > 0) {
          const many = listing.current;
          listing.current = 0;
          bot(`That is all <b>${many}</b> on. Here is the total.`, 440);
          soon();
          return;
        }

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
            { said: "Change something", look: "alt", go: () => { me("Change something"); changeRef.current?.(); } },
            { said: "That's everything", go: () => { me("That's everything"); soon(); } },
          ],
        });
      };

      const next = (which: number) => {
        if (which >= wanted.length) {
          /*
           * The same thing, asked for twice.
           *
           * Somebody who orders a Zinger, carries on, and then says
           * "zinger" again has either forgotten or wants two, and the chat
           * cannot know which. Added silently it is two lines on the bill
           * that read as a mistake; refused it is rude. So it is asked,
           * once, with the number it would become on the button.
           *
           * Same dish and the same choices on it: a half-and-half with
           * different halves is a different pizza and goes on as its own
           * line.
           */
          const already = held.current.lines.findIndex(
            (line) =>
              line.itemId === hit.id &&
              line.optionIds.length === chosen.length &&
              line.optionIds.every((id) => chosen.includes(id))
          );
          if (already >= 0) {
            const line = held.current.lines[already];
            bot(
              `You already have <b>${line.qty > 1 ? `${line.qty} × ` : ""}${line.name}</b>` +
                (named.length > 0 ? ` (${named.join(", ")})` : "") +
                " in your order.",
              460
            );
            setAsk({
              of: "buttons",
              buttons: [
                {
                  said: `Make it ${line.qty + qty}`,
                  go: () => {
                    me(`Make it ${line.qty + qty}`);
                    line.qty += qty;
                    bot(`Done, <b>${line.qty} × ${line.name}</b>.`, 420);
                    after();
                  },
                },
                {
                  said: `Leave it at ${line.qty}`,
                  look: "alt",
                  go: () => {
                    me(`Leave it at ${line.qty}`);
                    after();
                  },
                },
              ],
              hint: "Nothing is added twice by accident.",
            });
            return;
          }

          held.current.lines.push({
            itemId: hit.id,
            name: hit.name,
            qty,
            optionIds: chosen,
            chose: named,
            shop: hit.shop.name || undefined,
          });
          bot(
            `Added <b>${qty > 1 ? `${qty} × ` : ""}${hit.name}</b>` +
              (named.length > 0 ? ` (${named.join(", ")})` : "") +
              (hit.shop.name ? ` from <b>${hit.shop.name}</b>.` : "."),
            450
          );
          after();
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
        lines?: { name: string; said: string; qty: number; total: number; shop: string }[];
        food?: number;
        fee?: number;
        total?: number;
      };

      if (got.error || !got.lines) {
        bot(got.error || "I could not work that out just now.", 450);
        setAsk({
          of: "buttons",
          buttons: [
            { said: "Change something", look: "alt", go: () => { me("Change something"); changeRef.current?.(); } },
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
                /* Where it comes from, beside what was chosen on it. A bill
                   that does not say which counter each thing is from is a
                   bill nobody can check against what they asked for. */
                under: [line.shop, line.said].filter(Boolean).join(" · ") || undefined,
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
      const confirm = (hint = "Nothing is charged until you transfer.") => {
        setAsk({
          of: "buttons",
          buttons: [
            { said: "Confirm order", go: () => { me("Confirm order"); payNext(); } },
            { said: "Change something", look: "alt", go: () => { me("Change something"); changeRef.current?.(); } },
          ],
          hint,
        });
      };

      /*
       * The discount code, asked for only where there is one to type.
       *
       * A box for a code on a night the shop has no codes is a box that
       * can only ever say no, and it reads as something being withheld.
       * So the question appears on the nights there is a live code and
       * stays away on the nights there is not.
       *
       * Nothing is worked out in here. The code is checked against this
       * cart by the same door the website's checkout uses, and it is
       * handed to the checkout when the order is placed, where it is
       * checked again and counted as used.
       */
      const askCode = (first = true) => {
        bot(
          first
            ? "Do you have a discount code?"
            : "Another code to try, or shall we carry on?",
          440
        );
        setAsk({
          of: "buttons",
          buttons: [
            {
              said: first ? "Yes, I have one" : "Try another code",
              go: () => {
                me(first ? "Yes, I have one" : "Try another code");
                bot("Go on, type it in.", 400);
                setAsk({
                  of: "text",
                  placeholder: "Your code",
                  onSay: async (typed) => {
                    me(typed);
                    setAsk({ of: "nothing" });
                    try {
                      const checked = await working(
                        "Checking that code…",
                        fetch("/api/bot/code", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            code: typed,
                            batchId: mine.run?.id ?? "",
                            phone: mine.phone,
                            lines: mine.lines.map((line) => ({
                              menu_item_id: line.itemId,
                              qty: line.qty,
                              option_ids: line.optionIds,
                            })),
                          }),
                        })
                      );
                      const worth = (await checked.json()) as {
                        ok?: boolean;
                        error?: string;
                        code?: string;
                        label?: string;
                        discount?: number;
                      };

                      if (!worth.ok) {
                        /* Said plainly, with the reason the till gave, and
                           the order is never held up over it: a code that
                           does not work is not a reason to lose the sale. */
                        bot(
                          `<b>${typed.toUpperCase()}</b> is not working: ` +
                            (worth.error || "that code cannot be used on this order."),
                          480
                        );
                        setAsk({
                          of: "buttons",
                          buttons: [
                            { said: "Try another code", go: () => { me("Try another code"); askCode(false); } },
                            {
                              said: "Carry on without it",
                              look: "alt",
                              go: () => {
                                me("Carry on without it");
                                noCode.current = true;
                                confirm();
                              },
                            },
                          ],
                        });
                        return;
                      }

                      held.current.code = {
                        code: worth.code ?? typed.toUpperCase(),
                        label: worth.label ?? "",
                        discount: worth.discount ?? 0,
                      };
                      say(
                        {
                          kind: "status",
                          tone: "ok",
                          html:
                            `<span><b>${held.current.code.code}</b> applied · ` +
                            `${naira(held.current.code.discount)} off. ` +
                            `New total <b>${naira(
                              Math.max(0, (got.total ?? 0) - held.current.code.discount)
                            )}</b></span>`,
                        },
                        460
                      );
                      confirm("The code is applied at the till when you confirm.");
                    } catch {
                      bot("I could not check that code just then.", 420);
                      setAsk({
                        of: "buttons",
                        buttons: [
                          { said: "Try again", go: () => { me("Try again"); askCode(false); } },
                          {
                            said: "Carry on without it",
                            look: "alt",
                            go: () => {
                              me("Carry on without it");
                              noCode.current = true;
                              confirm();
                            },
                          },
                        ],
                      });
                    }
                  },
                });
              },
            },
            {
              said: first ? "No, carry on" : "Carry on",
              look: "alt",
              go: () => {
                me(first ? "No, carry on" : "Carry on");
                noCode.current = true;
                confirm();
              },
            },
          ],
          hint: first ? "If you do not have one, nothing changes." : undefined,
        });
      };

      if ((startRef.current?.codes ?? false) && !held.current.code && !noCode.current) {
        askCode();
        return;
      }
      confirm();
    } catch {
      bot("I could not reach the till just then. Try again?", 420);
      setAsk({
        of: "buttons",
        buttons: [{ said: "Try again", go: () => { me("Try again"); soon(); } }],
      });
    }
  }, [askOrder, bot, me, say, waLink]);

  /*
   * Changing an order already taken.
   *
   * "Change something" used to mean "what else would you like", which is
   * not what anybody means by it: they mean take the chicken off, or make
   * it three, or I want it from somewhere else. With nothing to answer
   * that, the only way out was to start the whole order again, and the
   * thing most often being changed is the bill somebody is looking at.
   *
   * It is also where a sentence lands. "I don't want chicken from KFC
   * anymore, change it to Chicken Republic" is read straight through: the
   * line it names comes off and the search runs on the other half, with
   * nothing to type twice. Where the sentence names a line the basket does
   * not have, it says so and shows the basket rather than guessing, because
   * guessing here removes somebody's food.
   */
  const change = useCallback(
    (asked: Swap | null = null) => {
      setAt(2);
      const lines = held.current.lines;

      if (lines.length === 0) {
        bot("There is nothing on your order yet.", 420);
        askOrder(true);
        return;
      }

      const said = (line: (typeof lines)[number]): string =>
        `${line.qty > 1 ? `${line.qty} × ` : ""}${line.name}`;

      const kept = () => {
        held.current.code = null;
        noCode.current = false;
        noCode.current = false;
        remember(lines.map((line) => said(line)).join(", "));
      };

      const basket = (lead = "Here is your order. Which one?") => {
        bot(lead, 440);
        setAsk({
          of: "chips",
          chips: [
            ...lines.map((line, which) => ({
              said: line.shop ? `${said(line)} · ${line.shop}` : said(line),
              go: () => {
                me(said(line));
                one(which);
              },
            })),
            { said: "Add something else", go: () => { me("Add something else"); askOrder(true); } },
            { said: "Nothing, carry on", go: () => { me("Nothing, carry on"); soon(); } },
          ],
          hint: "Tap a line to change it, or say what you want changed.",
          placeholder: "e.g. take the chicken off",
          onSay: (typed: string) => huntRef.current?.(typed),
        });
      };

      /* One line, and the three things anybody wants to do to it. */
      const one = (which: number) => {
        const line = lines[which];
        if (!line) {
          basket();
          return;
        }

        bot(`<b>${said(line)}</b>. What should I do with it?`, 430);
        setAsk({
          of: "buttons",
          buttons: [
            {
              said: "Take it off",
              go: () => {
                me("Take it off");
                lines.splice(which, 1);
                kept();
                bot(`Gone. <b>${line.name}</b> is off your order.`, 420);
                if (lines.length === 0) {
                  bot("That is everything off. What would you like instead?", 440);
                  askOrder(true);
                  return;
                }
                basket("Anything else to change?");
              },
            },
            {
              said: "One more",
              look: "alt",
              go: () => {
                me("One more");
                line.qty += 1;
                kept();
                bot(`Now <b>${line.qty} × ${line.name}</b>.`, 420);
                basket("Anything else to change?");
              },
            },
            ...(line.qty > 1
              ? [
                  {
                    said: "One fewer",
                    look: "alt" as const,
                    go: () => {
                      me("One fewer");
                      line.qty -= 1;
                      kept();
                      bot(`Now <b>${line.qty} × ${line.name}</b>.`, 420);
                      basket("Anything else to change?");
                    },
                  },
                ]
              : []),
            {
              said: "Swap it for something else",
              look: "alt",
              go: () => {
                me("Swap it for something else");
                lines.splice(which, 1);
                kept();
                /* The counter it came from is not kept: somebody swapping
                   a line is as likely to be changing where it comes from
                   as what it is, which is the whole of "change the KFC
                   chicken to Chicken Republic". */
                queue.current = [];
                bot(`Right, <b>${line.name}</b> is off. What instead?`, 440);
                askOrder(true);
              },
            },
            { said: "Leave it", look: "alt", go: () => { me("Leave it"); basket("Anything else to change?"); } },
          ],
        });
      };

      /* A sentence that already said what to change. */
      if (asked) {
        const which =
          asked.drop !== ""
            ? lineLike(asked.drop, lines)
            : // "Change it to X" with one thing on the order can only mean
              // that thing. With four, it is a question.
              lines.length === 1
              ? 0
              : -1;

        if (which >= 0) {
          const line = lines[which];

          if (asked.want !== "") {
            lines.splice(which, 1);
            kept();
            queue.current = [];
            bot(
              `<b>${line.name}</b> off, and looking for <b>${asked.want}</b> instead.`,
              460
            );
            huntRef.current?.(asked.want, false);
            return;
          }

          /* Taking something off is asked before it is done. The matcher
             is good, not certain, and the cost of it being wrong is
             somebody's food missing from a bill they already read. */
          bot(`Take <b>${said(line)}</b> off your order?`, 440);
          setAsk({
            of: "buttons",
            buttons: [
              {
                said: "Yes, take it off",
                go: () => {
                  me("Yes, take it off");
                  lines.splice(which, 1);
                  kept();
                  bot(`Gone. <b>${line.name}</b> is off your order.`, 420);
                  if (lines.length === 0) {
                    bot("That is everything off. What would you like instead?", 440);
                    askOrder(true);
                    return;
                  }
                  basket("Anything else to change?");
                },
              },
              { said: "No, leave it", look: "alt", go: () => { me("No, leave it"); basket(); } },
            ],
          });
          return;
        }

        basket(
          asked.drop !== ""
            ? `I am not sure which one you mean by <b>${asked.drop}</b>. Which of these?`
            : "Which one did you mean?"
        );
        return;
      }

      basket();
    },
    [askOrder, bot, me, remember, soon]
  );

  useEffect(() => {
    changeRef.current = change;
  }, [change]);

  useEffect(() => {
    soonRef.current = soon;
  }, [soon]);

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
            /* Checked once to show what it was worth, and handed over
               here to be checked again and counted as used. The
               checkout's figure is the one on the receipt. */
            code: mine.code?.code ?? "",
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
      if (settled.current) return;
      settled.current = true;
      stopWatching();
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
      // Whoever is driving that day. "He" was wrong the first time somebody
      // read it, and a shop that guesses at a person's gender in writing is
      // a shop that got it wrong in front of them.
      bot(`We call <b>${mine.phone}</b> when we are outside ${mine.hostel}.`, 500);
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
    [bot, bye, me, say, stopWatching]
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
    if (settled.current) return;
    stopWatching();
    const mine = held.current;

    let quiet = 0;
    const listen = async () => {
      quiet += 1;
      if (settled.current) return;
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
      if (!settled.current && quiet < LISTEN_FOR) poll.current = setTimeout(listen, LISTEN_EVERY);
    };
    if (mine.orderId !== "") poll.current = setTimeout(listen, LISTEN_EVERY);
    say(
      {
        kind: "status",
        tone: "warn",
        html: "<span><b>Not confirmed yet.</b> No alert has reached us.</span>",
      },
      380
    );
    bot(
      mine.watching
        ? "That is normal. Bank alerts are sometimes minutes and sometimes longer."
        : "That is normal. Somebody has to look at the account, and that is not always this minute.",
      500
    );
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
  }, [bot, handOver, me, paid, say, stopWatching]);

  /*
   * Watching for the money, honestly.
   *
   * It watches whoever marks it: a bank alert or a thumb in admin are the
   * same event from in here. What the setting changes is the wording, and
   * what this says is what is actually happening, which
   * is that somebody will message them.
   *
   * And it gives up out loud. A bank alert is minutes sometimes and an
   * hour others, and a chat that span for an hour would be a chat that
   * lied about what it was doing.
   */
  const watch = useCallback(() => {
    if (settled.current) return;
    // Whatever was already looking, stopped first. Two chains running is
    // two announcements of the same event.
    stopWatching();
    setAt(5);
    const mine = held.current;

    /*
     * It watches either way.
     *
     * The setting decides whether a bank alert can mark an order paid by
     * itself. It has nothing to do with whether this chat should notice
     * when one is: a person marking it from Orders is the same event as
     * far as somebody sitting here is concerned, and a chat that went
     * blind because of a setting in admin would be a chat that missed the
     * one thing it was waiting for.
     *
     * So the setting changes the wording and nothing else. On, we are
     * watching for the alert. Off, somebody is checking the account, and
     * either way this turns green the moment the order does.
     */
    bot(
      mine.watching
        ? "Watching for it now."
        : "Got it. Somebody checks every transfer against the account, so this can " +
          "take a few minutes. Leave this open and I will say so the moment it lands.",
      450
    );

    let tries = 0;
    const look = async () => {
      tries += 1;
      if (settled.current) return;
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
      if (settled.current) return;
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
            stopWatching();
            me("I’ll check back later");
            unconfirmed();
          },
        },
      ],
      hint: "We watch for about three minutes. After that we message you, so you do not have to sit here.",
    });
  }, [bot, handOver, me, paid, say, stopWatching, unconfirmed]);

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

  /*
   * When it comes, said the way the design says it.
   *
   * One card for the next run, and two buttons. Showing every run at once
   * was four near-identical rows with the same price on each, which
   * answers a question nobody asked: the next one is nearly always the
   * answer, and a car of its own belongs behind "I need it sooner", which
   * is the only thing on this screen worth paying more for.
   */
  const askSooner = useCallback(() => {
    setAt(1);
    const lists = startRef.current;
    const runs = lists?.runs ?? [];
    const cars = lists?.cars ?? [];
    const keep = runs[0];

    /*
     * Sooner means sooner.
     *
     * Asked for something before the next run, the screen offered the
     * next run and the four after it, which is the opposite of the
     * question. Only what actually lands earlier is shown, with the run
     * they already have at the bottom so there is a way back.
     */
    const by = keep ? new Date(keep.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const earlier = cars.filter((car) => {
      const at = new Date(car.at).getTime();
      return Number.isFinite(at) && at < by;
    });

    if (earlier.length === 0) {
      bot(`The <b>${keep?.said ?? "next"}</b> run is the soonest we can reach you.`, 480);
      setAsk({
        of: "buttons",
        buttons: [
          {
            said: `Keep the ${keep?.said ?? "next"} run`,
            go: () => {
              me(`Keep the ${keep?.said ?? "next"} run`);
              held.current.run = keep ?? null;
              askOrder();
            },
          },
        ],
      });
      return;
    }

    /*
     * One answer and two buttons, not a menu.
     *
     * Somebody who says they need it sooner has asked a yes or no
     * question: can you, and what does it cost. Six rows is that question
     * answered with homework. So the soonest is said as a sentence with
     * the two prices in it, and the other times are behind a third button
     * for the one person in ten who wants to pick an hour.
     */
    const soonest = earlier[0];
    const carFee = lists?.carFrom ?? 0;
    const runFee = lists?.feeFrom ?? 0;

    bot(
      `I can get it to you <b>${soonest.phrase || soonest.label}</b>, on a car of its own. ` +
        `That is <b>${naira(carFee)}</b> instead of ${naira(runFee)}, because it goes out just for you.`,
      560
    );

    const takeTheCar = (car: Car) => {
      held.current.car = car;
      held.current.run = null;
      me(`A car of its own, ${car.phrase || car.label}`);
      askOrder();
    };

    const keepTheRun = () => {
      held.current.car = null;
      held.current.run = keep ?? null;
      me(`Keep the ${keep?.said ?? "next"} run`);
      askOrder();
    };

    setAsk({
      of: "buttons",
      buttons: [
        { said: `Yes, send a car · ${naira(carFee)}`, go: () => takeTheCar(soonest) },
        {
          said: `Keep the ${keep?.said ?? "next"} run · ${naira(runFee)}`,
          look: "alt",
          go: keepTheRun,
        },
        ...(earlier.length > 1
          ? [
              {
                said: "Other times today",
                look: "alt" as const,
                go: () => {
                  me("Other times");
                  setAsk({
                    of: "slots",
                    slots: [
                      ...earlier.map((car) => ({
                        dow: car.dow,
                        dom: car.dom,
                        title: "Car of its own",
                        when: car.label,
                        fee: carFee,
                        rush: true,
                      })),
                      ...(keep
                        ? [
                            {
                              dow: keep.dow,
                              dom: keep.dom,
                              title: `Keep the ${keep.said} run`,
                              when: keep.window,
                              fee: runFee,
                              rush: false,
                            },
                          ]
                        : []),
                    ],
                    onPick: (which) =>
                      which < earlier.length ? takeTheCar(earlier[which]) : keepTheRun(),
                  });
                },
              },
            ]
          : []),
      ],
    });
  }, [askOrder, bot, me]);

  const askSlot = useCallback(() => {
    setAt(1);
    const lists = startRef.current;
    const runs = lists?.runs ?? [];
    if (runs.length === 0) {
      bot("Nothing is open for orders this minute. A person can still sort you out.");
      setAsk({
        of: "buttons",
        buttons: [{ said: "Message us on WhatsApp", look: "green", href: handOver() }],
      });
      return;
    }

    const first = runs[0];
    held.current.run = first;
    bot(`Our next run to <b>${held.current.hostel}</b> is <b>${first.said}</b>.`, 480);
    say(
      {
        kind: "card",
        card: {
          of: "slot",
          dow: first.dow,
          dom: first.dom,
          title: `Run ${first.said}`,
          // Lower case inside a sentence. "Arrives Between 5pm and 7pm" is
          // the tell that a label has been dropped into prose unread.
          when: `Arrives ${first.window.charAt(0).toLowerCase()}${first.window.slice(1)}`,
          note: `Orders close ${first.closes} · delivery from ${naira(lists?.feeFrom ?? 0)}`,
        },
      },
      420
    );

    // Only offer it where there is genuinely something earlier. Asking
    // "do you need it sooner" and then answering "no, you cannot" is a
    // question that should not have been put.
    const by = new Date(first.startsAt).getTime();
    const sooner = (lists?.cars ?? []).some((car) => {
      const at = new Date(car.at).getTime();
      return Number.isFinite(at) && at < by;
    });
    setAsk({
      of: "buttons",
      buttons: [
        { said: "That works", go: () => { me("That works"); askOrder(); } },
        ...(sooner
          ? [
              {
                said: "I need it sooner",
                look: "alt" as const,
                go: () => { me("I need it sooner"); askSooner(); },
              },
            ]
          : []),
      ],
      hint: sooner ? undefined : "That is already the soonest we can reach you.",
    });
  }, [askOrder, askSooner, bot, handOver, me, say]);

  const takeBlock = useCallback(
    (hostel: string) => {
      held.current.hostel = hostel;
      remember("gave their details, nothing chosen yet");
      askSlot();
    },
    [askSlot, remember]
  );

  const showBlocks = useCallback(
    (blocks: string[], said = "Here they all are.") => {
      bot(said, 420);
      setAsk({
        of: "chips",
        chips: [
          ...blocks.map((hostel) => ({
            said: hostel,
            go: () => {
              me(hostel);
              takeBlock(hostel);
            },
          })),
          /*
           * Somewhere the shop does not list.
           *
           * Not a thing to wave through. Where a car goes decides what
           * delivery costs and whether it can go at all, and an order
           * written against a block nobody recognises is a run sheet
           * sending somebody to an address the shop never agreed to.
           *
           * So it stops here and hands over, with the name and number
           * already said, and a person decides whether it can be done.
           */
          {
            said: "Mine is not on the list",
            go: () => {
              me("Mine is not on the list");
              bot(
                "Then I had better not guess. Where we deliver decides what it costs " +
                  "and whether we can get there at all, so a person will sort this one " +
                  "out with you. They have your name and number already.",
                560
              );
              setAsk({
                of: "buttons",
                buttons: [
                  {
                    said: "Tell us where you are",
                    look: "green",
                    href: handOver("My block is not on your list. Can you deliver to me?"),
                  },
                  {
                    said: "Actually, let me look again",
                    look: "alt",
                    go: () => { me("Let me look again"); showBlocks(blocks); },
                  },
                ],
              });
            },
          },
        ],
        hint: "Scroll for more if yours is not showing.",
      });
    },
    [bot, handOver, me, takeBlock]
  );

  const askHostel = useCallback(() => {
    setAt(0);
    const blocks = startRef.current?.hostels ?? [];
    if (blocks.length === 0) {
      setBusy("Just a second…");
      setAsk({ of: "nothing" });
      pending.current = () => {
        setBusy("");
        askHostel();
      };
      return;
    }

    bot("Which block are you in? Type it and I will find it.");
    setAsk({
      of: "text",
      placeholder: "e.g. Queen Mary",
      onSay: (said) => {
        me(said);
        const found = find(
          said,
          blocks.map((hostel) => ({ id: hostel, name: hostel }))
        );

        if (found.how === "sure" && found.hits[0]) {
          const hostel = found.hits[0].name;
          bot(`<b>${hostel}</b>, got it.`, 400);
          takeBlock(hostel);
          return;
        }

        if (found.hits.length > 0) {
          bot(
            found.hits.length === 1
              ? `Did you mean <b>${found.hits[0].name}</b>?`
              : "Which one of these?",
            450
          );
          setAsk({
            of: "chips",
            chips: [
              ...found.hits.map((hit, which) => ({
                said: hit.name,
                hot: which === 0,
                go: () => {
                  me(hit.name);
                  takeBlock(hit.name);
                },
              })),
              { said: "None of those", go: () => { me("None of those"); showBlocks(blocks); } },
            ],
          });
          return;
        }

        showBlocks(blocks, "I do not know that one. Here are all of them.");
      },
    });
  }, [bot, me, showBlocks, takeBlock]);

  const askPhone = useCallback(() => {
    setAt(0);
    bot(`Nice to meet you, <b>${held.current.name || "friend"}</b>. What number should we call on the day?`);
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
        /* A number nobody can ring is an order nobody can deliver,
           so this one is worth insisting on. Twice, and then a person
           takes over rather than somebody being stuck in a loop with a
           box that keeps saying no. */
        if (tries >= 3) {
          bot(
            "I am not reading that as a Nigerian mobile, and I would rather not " +
              "guess at the number we have to call on the day. A person can sort this out in a second.",
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
    settled.current = false;
    owed.current = 0;
    misses.current = 0;
    stopWatching();
    held.current = { ...EMPTY, lines: [] };
    list.current = [];
    listing.current = 0;
    noCode.current = false;
    setLines([]);
    setAt(0);
    bot("Hey, I’m <b>Sudu Bot</b>. I can take your order right here, no app needed.", 450);
    bot("What should I call you?");
    let tries = 0;
    const takeIt = (said: string) => {
      /* "My name is Chinaza" was being stored as "My", because the first
         word of the answer is the name right up until somebody is polite
         about it. */
      const given = nameIn(said) || said;
      held.current.name = given.split(" ")[0];
      askPhone();
    };
    setAsk({
      of: "text",
      placeholder: "Your name",
      onSay: (said) => {
        me(said);
        tries += 1;
        /*
         * Asked their name, a fair few people answer with something else:
         * what they want to eat, because that is what they came for, or
         * what they came to do, because every other chat box on the
         * internet opens by asking which department you want.
         *
         * Taken at face value, every message afterwards is addressed to a
         * pizza. So it is asked again, in words that match what they
         * actually typed, because being told you answered the wrong
         * question in the wrong words is the moment people decide the
         * thing is broken.
         *
         * Twice, and then whatever they said is their name. A name is not
         * a thing to argue about: somebody really called Ola Pizza exists,
         * the list of words this refuses is deliberately short, and a chat
         * that will not let you past your own name is a chat nobody
         * finishes.
         */
        const wrong = whyNotAName(said, startRef.current?.kitchens ?? []);
        if (wrong !== "" && tries <= 2) {
          const again = tries === 2 ? " Just a first name is plenty." : "";
          if (wrong === "food") {
            bot(
              "That sounds more like what you want to eat than what you are " +
                "called. We will get to the food in a second. What should I " +
                "call you?" +
                again,
              450
            );
          } else if (wrong === "errand") {
            bot(
              "That is what you are after rather than what you are called, and " +
                "we will get to it. Who am I talking to?" +
                again,
              450
            );
          } else if (wrong === "sentence") {
            bot("Sorry, which bit of that is your name?" + again, 430);
          } else {
            bot("I did not catch a name in that. What should I call you?" + again, 430);
          }
          return;
        }
        takeIt(said);
      },
    });
  }, [askPhone, bot, me, stopWatching]);

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
    stopWatching();
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
          {/*
            * The disc hops; the button does not.
            *
            * It used to be the button itself that hopped, and a button that
            * moves twenty pixels for a second out of every two and a half
            * is a button you have to tap three times. The browser hit-tests
            * where the box actually is at the moment of the touch, so a
            * finger aimed at the disc mid-hop lands on the page behind it.
            *
            * So the animation moved to the artwork inside, the button sits
            * still, and its hit area is padded upwards to cover the whole
            * height the disc travels through. Same hop, and the first tap
            * opens it.
            */}
          <button
            type="button"
            className="fab"
            aria-label="Open Sudu Bot to order"
            onClick={() => {
              setTeasing(false);
              setOpen(true);
            }}
          >
            <span className="hop" aria-hidden>
              <span className="ring" />
              <span className="glyph">
                <i style={{ width: 26 }} />
                <i style={{ width: 18 }} />
                <i style={{ width: 10 }} />
              </span>
              <span className="badge">1</span>
            </span>
          </button>
        </div>
      )}

      {open && (
        <div className="sudubot-panel" role="dialog" aria-label="Sudu Bot" ref={panel}>
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
            {/*
              * The WhatsApp mark, drawn rather than typed.
              *
              * This was an envelope character on a WhatsApp-green button,
              * which reads as "email us" in the one place the shop most
              * wants read as "a person, now". An emoji is whatever the
              * phone decides it is; a path is the same shape on every
              * phone there is.
              */}
            <a
              className="hbtn wa"
              href={handOver()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Continue on WhatsApp instead"
              title="Continue on WhatsApp"
            >
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="currentColor"
                aria-hidden
                focusable="false"
              >
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24Zm-2.6 4.1c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.03 2.59.12.16 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.15-1.18-.06-.1-.23-.16-.48-.29-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.76-1.85-.2-.48-.41-.42-.56-.43h-.48Z" />
              </svg>
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
