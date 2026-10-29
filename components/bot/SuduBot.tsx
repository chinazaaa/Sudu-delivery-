"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { naira } from "@/lib/money";
import { pickFaq } from "@/lib/faq-match";
import { dayAsked, sayWhen } from "@/lib/bot-days";
import { lagosToday } from "@/lib/time";
import { readBudget, toSpend, allIn, type Budget } from "@/lib/budget";
import {
  find,
  whyNotAName,
  nameIn,
  phoneIn,
  asksToSwap,
  asksForQty,
  lineLike,
  splitOrder,
  intentOf,
  insteadOf,
  kitchenAsked,
  looksLikeAQuestion,
  placeAsked,
  namedIn,
  without,
  type Swap,
  type Amount,
} from "@/lib/bot-match";
import { Asking, Rail, Said, Typing, useSaying, type Ask, type Line } from "./Chat";
import Rider from "./Rider";
import {
  looksLikeABasket,
  looksLikeAGift,
  orderPart,
  occasionBy,
  isGift,
  cardCalled,
  them,
} from "@/lib/occasions";
import { isCorrection } from "@/lib/bot-brain";
import { CAR_MUST_SAVE_HOURS } from "@/lib/pick-a-day";

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
  kitchens: { id: string; name: string; tags?: string }[];
  cars: Car[];
  carFrom: number;
  feeFrom: number;
  /** The places that cost more than that floor, by name, so a figure is
   *  never said as though it were the price everywhere. */
  farther?: string[];
  /** Whether there is a code anybody could type tonight. */
  codes: boolean;
  /** What the chat is allowed to answer on its own: the shop's own words,
   *  edited in admin. There is no model in here, so this is the whole of
   *  what it knows. */
  faqs: { id: string; question: string; answer: string; keywords: string }[];
  /** The handwritten card, as a real product. Null where the shop has none
   *  set or it is off the menu, and then it is never offered. */
  card: { id: string; name: string; price: number } | null;
  /** How many days ahead a customer may book. The shop's own rule, read
   *  rather than assumed, so changing it in Settings changes the chat. */
  horizonDays: number;
  /** The made-up boxes the shop is selling, which live on their own shelf
   *  and are on no food menu. */
  boxes: {
    slug: string;
    name: string;
    kind: string;
    /** The day it is for, where the shop has set one. A matriculation box
     *  is for matriculation day, not for tonight's run. */
    happensAt: string | null;
    closesAt: string | null;
  }[];
  /** The handful of dishes whose names sound like an occasion, so the gift
   *  rule can tell a tub of Birthday Cake ice cream from a birthday. */
  giftDishes: string[];
  whatsapp: string;
  email: string;
  /** Who is reading this, where the shop already knows them from the
   *  cookie that signs them in. Null for somebody new, which is the only
   *  case that still gets asked for a name. */
  you: { name: string; phone: string; hostel: string } | null;
};

type Car = {
  at: string;
  label: string;
  phrase: string;
  day: "today" | "tomorrow" | "later";
  date: string;
  dow: string;
  dom: number;
  /** Leaving within the hour, which the same day ladder charges for. The
   *  chat never works it out: it hands it back to the till. */
  urgent: boolean;
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
  /** They said to use the block already on file for their number. It is
   *  deliberately not fetched: the chat never learns where somebody
   *  lives from their phone number, and the order's own route fills it in
   *  from the record when it is placed. */
  sameBlock?: boolean;
  /** What the order is for. Everything the chat does differently for a
   *  gift follows from this one tap. */
  occasion: string;
  /** Who it is going to, where that is not the person ordering. */
  forName: string;
  /** The day it has to land on, where the occasion has one. Empty means
   *  the soonest is fine, which is every ordinary order. */
  wantDay: string;
  /** What they said they had to spend, where they said anything. Never a
   *  cap the chat enforces: it is a thing to be told about going over. */
  budget: Budget | null;
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
  sameBlock: false,
  occasion: "me",
  forName: "",
  wantDay: "",
  budget: null,
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
  /* Whether the reading layer answered at all. Set once, when it says it
     has no key, so the chat stops asking something that will not answer. */
  const readingOff = useRef(false);
  /* The very first thing somebody types, which is the one the chat invited
     them to put everything into. Read however short it is: "Naza Queen" is
     two words and is a name and a block, and the rules can only read it as
     a search for cake. */
  const firstSay = useRef(true);
  /* Blocks a half-named one could have meant. "Queen" is Queen Mary and
     Cooperative Queens, so it is not guessed; it is offered. */
  const blockGuess = useRef<string[]>([]);
  /*
   * The search already run for this sentence, kept so it is only run once.
   *
   * A question that names something we sell is answered first by the
   * thing, and that has to be known before the shop's written answers get
   * their turn. Looking twice for one sentence would be a visible pause on
   * the one path where somebody is already waiting.
   */
  const probed = useRef<{ said: string; got: unknown } | null>(null);
  /** The basket editor, held the same way: the step that adds a line
   *  offers it, and it offers the step that adds a line. */
  const changeRef = useRef<((asked?: Swap | null, count?: Amount | null) => void) | null>(null);
  /** The bill, held in a box so a pasted list can end at it from
   *  anywhere, including from a line that was skipped. */
  const soonRef = useRef<(() => void) | null>(null);
  /** The question step, held in a box because the answers above it offer
   *  it as the way out when none of them fit. */
  const askAQuestionRef = useRef<((first?: string) => void) | null>(null);
  /** Sending a question that has already been typed, held in a box because
   *  the number and the name are collected between typing it and sending
   *  it, and each of those has to come back to the sending rather than to
   *  the asking: asking again would want the question typed twice. */
  const sendQuestionRef = useRef<((asked: string) => void) | null>(null);
  /** The block question, held in a box so an answer given at it can hand
   *  the conversation back to it. */
  const askHostelRef = useRef<((then?: () => void) => void) | null>(null);
  /** The slot step, held in a box because the day question comes before
   *  it and is written above it. */
  const askSlotRef = useRef<((then?: () => void) => void) | null>(null);
  /** The number question, held in a box because the bill asks for it now:
   *  details are collected at the till rather than at the door. */
  const askPhoneRef = useRef<((then?: () => void) => void) | null>(null);
  /** The day question, held in a box so the basket can send somebody back
   *  to it without the two steps having to know about each other. */
  const askDayRef = useRef<((then?: () => void) => void) | null>(null);
  /** The budget step, held in a box because it offers itself again when a
   *  figure does not come through. */
  const askBudgetRef = useRef<(() => void) | null>(null);
  /** The custom-order step, held in a box because the box question offers
   *  it as one of its two answers. */
  const askUsForRef = useRef<((first: string, place?: string) => void) | null>(null);
  /** Said no to a discount code already. Asked once per version of the
   *  order: asking again on the same bill is nagging, and asking again
   *  after the order changed is the only honest thing to do, because what
   *  a code is worth changed with it. */
  const noCode = useRef(false);
  /** The card has been offered once on this order. Asked again only when
   *  the order changes, like the discount code. */
  const cardAsked = useRef(false);
  /** What goes on it, in their words. */
  const cardMsg = useRef("");
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
  /*
   * One of the shop's own box shelves, named in a sentence.
   *
   * Matched against the live list rather than against words written here,
   * so a shelf added in admin is understood without a deploy. A box word
   * has to be there as well, unless the shelf's own name carries one:
   * "Birthday" is a shelf and also the commonest word in this whole chat,
   * and sending somebody to a hamper because they mentioned a birthday
   * would be worse than not matching at all.
   */
  const namedShelf = useCallback(
    (said: string): { slug: string; name: string; happensAt: string | null } | null => {
      const shelves = startRef.current?.boxes ?? [];
      if (shelves.length === 0) return null;

      const boxy = /\b(box|boxes|pack|packs|package|packages|hamper|hampers|bundle|set)\b/i;

      /*
       * A shelf is matched on what is distinctive about it.
       *
       * "Food boxes" carries the word box, so matching the whole name sent
       * "box of chicken" to the gift shelf: the one word they had in
       * common was the one word that means nothing. Stripped, the shelf is
       * "food", which a box of chicken does not name, and a care package
       * still finds "care".
       */
      const bare = (name: string) => name.replace(boxy, " ").replace(/\s+/g, " ").trim();
      const hit = namedIn(
        said,
        shelves.map((one) => ({ id: one.slug, name: bare(one.name) || one.name }))
      )[0];
      if (!hit) return null;

      const shelf = shelves.find((one) => one.slug === hit.id);
      if (!shelf) return null;
      /* A box word has to be somewhere: in the shelf's own name, which
         makes it a box shelf whatever they typed, or in the sentence.
         "Birthday" is a shelf and also the commonest word in this chat. */
      if (boxy.test(shelf.name) || boxy.test(said)) {
        return { slug: shelf.slug, name: shelf.name, happensAt: shelf.happensAt };
      }
      return null;
    },
    []
  );

  /**
   * "Where is my order?"
   *
   * The most asked thing after what delivery costs, and until now the chat
   * answered it with directions: open this other page, sign in there, come
   * back. The chat knows.
   *
   * Two ways in and no third. This device, when placing an order has
   * already proved whose it is, which covers most people because most
   * people check on the phone they ordered on. Otherwise the number and
   * the PIN, the same two things the orders page asks for.
   *
   * Nothing is ever sent to anybody to make this work. There is no way to
   * text a PIN, so a chat offering to would be promising somebody's
   * evening work as though it were automatic. Without a PIN it hands over
   * to a person, which is what actually happens today.
   *
   * It never answers on a number alone. This box sits on a public page and
   * anybody can type anybody's number into it; the answer names a hostel
   * and an hour, which is where a particular student will be standing and
   * when. The same reason `known` answers yes or no and nothing else.
   */
  /**
   * "When is the next run?" "Are you delivering today?" "Can you do Tuesday?"
   *
   * Asked constantly, and answered until now out of the written list,
   * which can only say how the shop works in general. The chat is handed
   * tonight's real runs and real car windows when it opens, so it says the
   * true thing: this day, this window, closing at this time.
   *
   * Tried before the written answers for exactly that reason. A written
   * answer about the runs is stale the moment a run moves; this cannot be.
   */
  const sayWhichDays = useCallback(
    (said: string): boolean => {
      const asked = dayAsked(said);
      if (asked === null) return false;

      const answer = sayWhen({
        asked,
        runs: startRef.current?.runs ?? [],
        cars: startRef.current?.cars ?? [],
        today: lagosToday(),
        // Floors, read off the shop's own ladders when the chat opened, so
        // a band changed in admin changes what is said here.
        feeFrom: startRef.current?.feeFrom ?? 0,
        carFrom: startRef.current?.carFrom ?? 0,
        farther: startRef.current?.farther ?? [],
        money: naira,
      });
      if (answer === "") return false;

      bot(answer, 520);
      return true;
    },
    [bot]
  );

  const whereIsMine = useCallback(
    async (phone?: string, pin?: string, ref?: string): Promise<void> => {
      const got = await working(
        "Looking it up\u2026",
        fetch("/api/bot/mine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone ?? "",
            pin: pin ?? "",
            ref: ref ?? "",
          }),
        })
          .then((one) => one.json())
          .catch(() => null)
      );

      if (!got || got.error === "lookup failed") {
        bot("I could not reach the orders just now. A person can, though.", 460);
        setAsk({
          of: "buttons",
          buttons: [
            { said: "Ask on WhatsApp", look: "green", href: handOver("Where is my order?") },
          ],
        });
        return;
      }

      if (got.need === "phone") {
        bot("Of course. What number did you order on?", 460);
        setAsk({
          of: "text",
          placeholder: "e.g. 0803 123 4567",
          type: "tel",
          onSay: (then) => {
            me(then);
            void whereIsMine(then);
          },
        });
        return;
      }

      // The order number was wrong, or the number is locked after too many
      // tries. Asked again rather than started again.
      if (got.need === "ref") {
        bot(got.error || "That order number is not on this number.", 440);
        setAsk({
          of: "text",
          placeholder: "e.g. 1061",
          onSay: (then) => {
            me(then);
            void whereIsMine(phone, undefined, then);
          },
          lead: {
            said: "Ask a person instead",
            go: () => {
              window.location.href = handOver("I cannot get into my order.");
            },
          },
        });
        return;
      }

      if (got.need === "pin") {
        if (got.error) bot(got.error, 420);
        else {
          bot(
            "And your four digit PIN. It came on WhatsApp with your first order.",
            460
          );
        }
        setAsk({
          of: "text",
          placeholder: "4 digits",
          onSay: (then) => {
            me(then);
            void whereIsMine(phone, then);
          },
          /*
           * Nobody is sent anywhere for a forgotten PIN.
           *
           * Nothing here can text one, so "we will send it" would be a
           * person's evening dressed up as automatic. The order number is
           * on their receipt and is a question they can answer now.
           */
          lead: {
            said: "I do not know my PIN",
            go: () => {
              me("I do not know my PIN");
              bot(
                "No trouble. What is the order number? It is on the order, like 1061.",
                460
              );
              setAsk({
                of: "text",
                placeholder: "e.g. 1061",
                onSay: (then) => {
                  me(then);
                  void whereIsMine(phone, undefined, then);
                },
              });
            },
          },
        });
        return;
      }

      const orders = (got.orders ?? []) as {
        ref: string;
        href: string;
        total: number;
        paid: boolean;
        stage: string;
        when: string;
        runDate: string;
        hostel: string;
        live: boolean;
      }[];

      if (orders.length === 0) {
        bot("Nothing on that number yet. Shall we fix that?", 460);
        askOrderRef.current?.(true);
        return;
      }

      for (const order of orders) {
        const money = `${order.ref}, ${naira(order.total)}`;
        const where = order.paid
          ? `${order.stage || "Paid"}. ${order.when}${
              order.hostel ? `, to ${order.hostel}` : ""
            }.`
          : "Not paid for yet, so it is not on the car. The order page has the account to pay into.";
        bot(`${money}. ${where}`, 480);
      }

      setAsk({
        of: "buttons",
        buttons: [
          { said: "Open my order", href: orders[0].href },
          {
            said: "Something is wrong with it",
            look: "green",
            href: handOver(`Something is wrong with ${orders[0].ref}.`),
          },
        ],
      });
    },
    [bot, me, working, handOver]
  );

  const sayFaq = useCallback(
    /**
     * @param after where to go once the answer has been given. The order
     *   question by default, because that is where nearly every question
     *   is asked from; the block question when it was asked from there,
     *   since the block is still needed either way.
     */
    (
      said: string,
      after?: () => void,
      /*
       * Whether a near miss counts.
       *
       * "What restaurants do you deliver from" had no written answer, so
       * the near miss offered "Where do you deliver?" -- a different
       * question, about PAU -- and the chat then answered it. Somebody who
       * asked which kitchens we buy from was told where we drive to.
       *
       * Where the chat already holds the real answer, a guess at a written
       * one is worse than no guess: the counters open tonight are read
       * live and cannot go stale, and a written answer about them would.
       * So the written answers still win when one of them is plainly the
       * question, and never on a maybe.
       */
      sureOnly = false
    ): boolean => {
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
            {
              said: "Yes, thanks",
              go: () => {
                me("Yes, thanks");
                if (after) after();
                else askOrderRef.current?.(true);
              },
            },
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

      if (found.maybe.length > 0 && !sureOnly) {
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

          /*
           * A number to come back on, asked for here if it is not known.
           *
           * The chat used to take a name and a number before anybody said
           * a word, so by the time somebody asked for a person it always
           * had both. Details are collected at the till now, and a
           * question asked before any food is chosen reaches this with
           * neither, so it promised to send the question over with their
           * number, sent nothing, and answered "Please enter your name."
           *
           * Number first and then the name, the same order as the bill:
           * the number is what the shop files people under, so somebody
           * who has ordered before is greeted rather than interviewed.
           */
          if (mine.phone === "") {
            bot("What number should we come back to you on?", 430);
            askPhoneRef.current?.(() => sendQuestionRef.current?.(asked));
            return;
          }
          if (mine.name === "") {
            bot("And what should I call you?", 420);
            setAsk({
              of: "text",
              placeholder: "Your name",
              onSay: (who) => {
                me(who);
                mine.name = (nameIn(who) || who).split(" ")[0];
                sendQuestionRef.current?.(asked);
              },
            });
            return;
          }

          sendQuestionRef.current?.(asked);
        },
      });
    },
    [bot, me]
  );

  /*
   * Sending a question that is already typed.
   *
   * Split from asking for it, because the number and the name are now
   * collected in between and each of those has to come back to the
   * sending. Coming back to the asking is what a first attempt at this
   * did, and it put somebody in a loop being asked to type their question
   * again after every answer.
   */
  const sendQuestion = useCallback(
    async (asked: string) => {
      setAsk({ of: "nothing" });
      const mine = held.current;

      /* The same guard again, because the number step comes straight back
         here: a number the shop has never seen leaves the name empty, and
         sending without one is the error this was built to stop. */
      if (mine.name === "") {
        bot("And what should I call you?", 420);
        setAsk({
          of: "text",
          placeholder: "Your name",
          onSay: (who) => {
            me(who);
            mine.name = (nameIn(who) || who).split(" ")[0];
            sendQuestionRef.current?.(asked);
          },
        });
        return;
      }
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
                { said: "Try again", look: "alt", go: () => { me("Try again"); sendQuestionRef.current?.(asked); } },
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
              { said: "Try again", go: () => { me("Try again"); sendQuestionRef.current?.(asked); } },
              { said: "Ask on WhatsApp", look: "green", href: handOver("I have a question.") },
            ],
          });
        }
    },
    [bot, handOver, me, say, working]
  );

  useEffect(() => {
    sendQuestionRef.current = sendQuestion;
  }, [sendQuestion]);

  useEffect(() => {
    askAQuestionRef.current = askAQuestion;
  }, [askAQuestion]);

  const askUsFor = useCallback(
    /**
     * @param place where they already said it is from, where they did.
     *   Asking "and where is it from" straight after somebody typed Pizza
     *   Hut is the chat admitting it was not listening.
     */
    (first: string, place = "") => {
      bot(
        place !== ""
          ? `What would you like from <b>${place}</b>?`
          : "Tell me what you want and where it is from.",
        520
      );
      /*
       * What actually happens, which is not what this used to say.
       *
       * It said a person goes and buys it and comes back with the real
       * price. Nobody buys anything before it is paid for: the price is
       * not known, which is the whole reason this is not an ordinary
       * order. Somebody checks what it costs, says so, and only then does
       * any money or any buying happen.
       */
      bot(
        "Someone will check what it costs and message you on WhatsApp. You pay, " +
          "then we buy it and bring it over with your order.",
        520
      );
      setAsk({
        of: "text",
        placeholder:
          place !== ""
            ? "e.g. a large pepperoni"
            : first || "e.g. a Caesar salad from Debonairs",
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
                  /* Where they said it was from, carried through. Asked
                     "what would you like from Pizza Hut", somebody
                     answers "a large pepperoni", and the list in admin
                     would otherwise hold a pepperoni from nowhere. */
                  wanted:
                    place !== "" && !wanted.toLowerCase().includes(place.toLowerCase())
                      ? `${wanted} from ${place}`
                      : wanted,
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

  useEffect(() => {
    askUsForRef.current = askUsFor;
  }, [askUsFor]);

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
        /*
         * How many, before what.
         *
         * "Change the BBQ chicken to 1" reads exactly like a swap: the
         * thing wanted instead is "1". Taken that way it would have taken
         * the pizza off the order and gone looking through the menu for a
         * dish called one. A number on its own is never a dish, so a
         * count is looked for first.
         */
        const count = asksForQty(said);
        if (count) {
          changeRef.current?.(null, count);
          return;
        }
        const swap = asksToSwap(said);
        if (swap) {
          changeRef.current?.(swap);
          return;
        }
      }

      /*
       * A question, wherever it turns up.
       *
       * "Can I change my order" put a packet of hangers in somebody's
       * basket: every word of it but one is noise, the search ran on
       * "change" alone, and "change" looks enough like "hangers" to the
       * bigrams to be called certain. The matcher no longer trusts a lone
       * near-miss, but the deeper mistake was searching a menu for a
       * sentence that was never about food. A menu is all the search has,
       * so a menu is what it finds.
       */
      if (echo && looksLikeAQuestion(said)) {
        /* Asked mid-order, "can I change my order" is not a question about
           what the shop allows. It is somebody asking to edit the thing
           they are looking at, so they are handed it. */
        if (
          held.current.lines.length > 0 &&
          /\b(chang|edit|amend|remov|delet|swap|cancel|add)/i.test(said)
        ) {
          changeRef.current?.();
          return;
        }
        /*
         * The thing before the paragraph.
         *
         * "Do you have panadol" is question shaped, so the shop's written
         * answers used to take it and reply with the paragraph about the
         * pharmacy shelf. True, and not what was asked: they named a
         * product, and the answer that finishes the conversation in one
         * message is the product, its price and the way to it.
         *
         * So anything that looks like a question is searched first, and
         * only a search that turns up nothing worth showing hands over to
         * the written answers. The result is kept, because looking twice
         * for one sentence is a pause on the one path where somebody is
         * already waiting.
         */
        /* The same courtesy on the question path, which also goes quiet
           for a round trip before anybody hears a word back. */
        const peek = await working(
          "Having a look\u2026",
          fetch("/api/bot/find", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ said, kitchen: queue.current[0]?.id ?? "" }),
          })
            .then((one) => one.json())
            .catch(() => null)
        );

        const named =
          peek &&
          (peek.how === "counter" || peek.how === "sure" || peek.how === "shelf");
        if (named) probed.current = { said, got: peek };
        // A near miss never beats a question the chat can answer off what
        // is open tonight. "What restaurants do you deliver from" came
        // back with "Where do you deliver?", which is a different
        // question, about PAU, and the chat then answered it: somebody who
        // asked which kitchens we buy from was told where we drive to.
        // Which days the shop goes, answered off tonight's real runs
        // rather than out of the written list, which can only say how the
        // shop works in general and is stale the moment a run moves.
        else if (sayWhichDays(said)) return;
        else if (sayFaq(said, undefined, intentOf(said) === "menu")) return;
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
        /*
         * "Can I order from Domino's?"
         *
         * Yes, and then the next question. It used to be answered with a
         * yes and a full stop, or worse, with a written line about the
         * menu in general, and somebody who had just told the chat
         * exactly what they wanted had to start again. Whoever asks this
         * is asking because they want to order from them.
         */
        const askedAbout = kitchenAsked(said, startRef.current?.kitchens ?? []);
        if (askedAbout) {
          const kitchen = (startRef.current?.kitchens ?? []).find(
            (one) => one.id === askedAbout.id
          );
          if (kitchen) {
            /* The question that follows names them, so this does not:
               the name twice in two lines reads as a machine. */
            bot("Yes, of course.", 420);
            queue.current = [kitchen];
            askOrderRef.current?.();
            return;
          }
        }

        /*
         * A place we do not buy from, named back rather than searched.
         *
         * "Can I order from Pizza Hut" is a reasonable question, and
         * running the whole sentence through the menu ends in "I cannot
         * find can i order from pizza hut anywhere on the shop", which
         * reads as a chat that was not listening. The shop buys things
         * nobody stocks every week, so the answer is not no: it is tell
         * me what you want from there.
         *
         * After the kitchens above, so anything we really do carry has
         * already been answered with a yes, misspelling and all.
         */
        const elsewhere = placeAsked(said);
        if (elsewhere !== "") {
          /*
           * What we do buy from, about the same food where we can tell.
           *
           * Somebody asking for Pizza Hut wants pizza, and Domino's, Dodo
           * and Panarottis are all on the menu. Naming the first four
           * counters instead would put a doughnut shop at the top of an
           * answer about pizza, which is the chat answering a different
           * question.
           *
           * After the offer rather than instead of it, which is the whole
           * difference between an answer and a brush off.
           */
          const few = insteadOf(elsewhere, startRef.current?.kitchens ?? []).map(
            (one) => one.name
          );
          const also =
            few.length === 0
              ? ""
              : ` We do buy from <b>${few.join("</b>, <b>")}</b>` +
                ", if one of those would do.";

          bot(
            `We do not buy from <b>${elsewhere}</b> at the moment, but we can go ` +
              `and get it for you.${also}`,
            520
          );
          askUsForRef.current?.("", elsewhere);
          return;
        }

        // Before the written answers, for the same reason as above.
        if (sayWhichDays(said)) return;

        if (
          meant !== "" &&
          meant !== "vague-order" &&
          // A near miss never beats the counters. The chat holds that list
          // live, and a written answer guessed at from the wrong question
          // is how "which restaurants" got answered with "Ibeju-Lekki".
          sayFaq(said, undefined, meant === "menu")
        ) {
          return;
        }

        /*
         * Their own order, which the chat can simply answer.
         *
         * Before the question case, because "where is my order" is a
         * question and used to be handed to a person along with every
         * other one. It is the most asked thing after what delivery
         * costs, and the chat knows the answer.
         */
        if (meant === "mine") {
          void whereIsMine();
          return;
        }

        if (meant === "question") {
          askAQuestion();
          return;
        }

        /*
         * A box, which is two different requests wearing one word.
         *
         * "Curate a gift box" is said by somebody who already knows what
         * goes in it, and by somebody who wants help deciding, and those
         * are opposite answers. The shop can hand the second one a shelf
         * of made-up boxes in a second; the first needs a person, because
         * a box somebody invented cannot be priced automatically and the
         * shop has always said so before taking any money for one.
         *
         * So it asks. One question, and both answers are real.
         */
        if (meant === "box" || namedShelf(said) !== null) {
          const shelves = startRef.current?.boxes ?? [];

          /*
           * They named one of ours.
           *
           * "Matriculation box" is a shelf this shop is selling, and the
           * word matriculation is in no pattern anybody could write by
           * hand. So the shelves themselves are matched against what was
           * typed, which means a shelf added in admin tomorrow is found
           * tomorrow without anybody touching this file.
           */
          const asked = namedShelf(said);
          if (asked) {
            /*
             * The day it is for, where the shop has set one.
             *
             * A matriculation box is for matriculation day. Said against
             * tonight's run it is the chat selling the wrong thing, and
             * said with its own date it is the chat being useful about
             * something nobody has to ask twice.
             */
            const dayOf = asked.happensAt
              ? new Intl.DateTimeFormat("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "Africa/Lagos",
                }).format(new Date(asked.happensAt))
              : "";
            bot(
              dayOf === ""
                ? `<b>${asked.name}</b>, yes, that is one of ours.`
                : `<b>${asked.name}</b>, yes. That one goes out on <b>${dayOf}</b>, ` +
                    "so it is ordered ahead rather than on tonight's run.",
              460
            );
            say(
              {
                kind: "status",
                tone: "",
                html:
                  `<span>Open <a href="/collections/${asked.slug}" target="_blank" ` +
                  `rel="noopener"><b>${asked.name}</b></a> to see what is in it. ` +
                  "You can swap bits of it about on the page.</span>",
              },
              460
            );
            bot("Want me to take a food order too while you are here?", 460);
            setAsk({
              of: "buttons",
              buttons: [
                { said: "Yes, let's order", go: () => { me("Yes, let's order"); askOrderRef.current?.(true); } },
                {
                  said: "I want it put together differently",
                  look: "alt",
                  go: () => {
                    me("Put together differently");
                    bot(
                      "Tell me what goes in it and we will find the items and come " +
                        "back with the price before any money moves.",
                      520
                    );
                    askUsForRef.current?.("");
                  },
                },
                { said: "That's all for now", look: "alt", go: () => { me("That's all for now"); byeRef.current?.(); } },
              ],
            });
            return;
          }

          bot("We do boxes two ways.", 440);
          setAsk({
            of: "buttons",
            buttons: [
              ...(shelves.length > 0
                ? [
                    {
                      said: "Show me the ready-made ones",
                      go: () => {
                        me("Show me the ready-made ones");
                        bot(
                          "These are made up and priced already. Open one and you " +
                            "can swap bits of it about.",
                          500
                        );
                        setAsk({
                          of: "chips",
                          chips: [
                            ...shelves.map((shelf, which) => ({
                              said: shelf.name,
                              hot: which === 0,
                              go: () => {
                                me(shelf.name);
                                say(
                                  {
                                    kind: "status",
                                    tone: "",
                                    html:
                                      `<span>Open <a href="/collections/${shelf.slug}" ` +
                                      `target="_blank" rel="noopener"><b>${shelf.name}</b></a> ` +
                                      "in a new tab, and come back here if you would rather " +
                                      "I took the order.</span>",
                                  },
                                  460
                                );
                                bot("Anything else while you are here?", 440);
                                setAsk({
                                  of: "buttons",
                                  buttons: [
                                    {
                                      said: "Order some food too",
                                      go: () => { me("Order some food too"); askOrderRef.current?.(true); },
                                    },
                                    {
                                      said: "That's all for now",
                                      look: "alt",
                                      go: () => { me("That's all for now"); byeRef.current?.(); },
                                    },
                                  ],
                                });
                              },
                            })),
                          ],
                          hint: "Each one opens on its own page, with photographs.",
                        });
                      },
                    } as const,
                  ]
                : []),
              {
                said: "I know what I want in it",
                look: shelves.length > 0 ? ("alt" as const) : undefined,
                go: () => {
                  me("I know what I want in it");
                  bot(
                    "Perfect. List what goes in it and we will go and find the " +
                      "items, then come back to you with the price before any money " +
                      "moves.",
                    540
                  );
                  askUsForRef.current?.("");
                },
              },
            ],
          });
          return;
        }

        /* They have said they cannot answer the question, so the chat
           stops asking it and asks the one that can be answered. */
        if (meant === "unsure") {
          bot("No bother. Easiest way in is the money.", 430);
          askBudgetRef.current?.();
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
      /*
       * A gift, noticed rather than asked about.
       *
       * The opening question that used to buy this fact is gone, because
       * everybody paid a message for it and nine in ten answered the same
       * way. So every typed sentence is checked instead, and only the
       * ones that sound like a gift cost anybody a question.
       *
       * A plain rule, not the reading layer, because this one is not
       * allowed to be absent: a birthday surprise sent to the buyer's own
       * block is not a thing to get wrong on the evening somebody forgot
       * to top up an API key.
       *
       * Asked once. Having answered who it is for, the order carries it,
       * and the sentence goes on to be searched exactly as it would have
       * been.
       */
      if (
        echo &&
        held.current.occasion === "me" &&
        held.current.forName === "" &&
        /*
         * Not on a basket somebody has pasted.
         *
         * A list with quantities on it is an order, whatever words are in
         * the dish names. Somebody pasted a cart holding a Birthday Cake
         * Remix and a Krispy Kreme half dozen and was asked whose birthday
         * it was, then handed a box for the recipient's first name, on an
         * order they were placing for themselves.
         */
        !looksLikeABasket(said) &&
        // And with the shop's own occasion-sounding dishes taken out of
        // the sentence first, so the name of a thing we sell is read as
        // the thing rather than as the occasion.
        looksLikeAGift(said, startRef.current?.giftDishes ?? [])
      ) {
        held.current.occasion = "gift";
        bot("That sounds like it is for somebody else. Who is it going to?", 440);
        setAsk({
          of: "text",
          placeholder: "Their first name",
          onSay: (who) => {
            me(who);
            const forName = (nameIn(who) || who).split(" ")[0];
            held.current.forName = forName;
            /*
             * Back to what they actually said, with the gift phrasing
             * taken off it.
             *
             * "Need to order for my son" went back to the menu as written
             * and came out as three jars of Sonia tinned tomato, because
             * "son" sits inside "Sonia". Somebody who had just told us
             * their child's name was asked which purée they meant.
             *
             * Stripped, that sentence is nothing at all, which is the
             * truth of it: they have said who it is for and not yet said
             * what it is. So the bot asks, rather than searching the menu
             * for a word out of a sentence about a person.
             */
            const rest = orderPart(said);
            if (rest === "") {
              bot(`Lovely. What would you like me to send ${forName}?`, 440);
              setAsk({
                of: "text",
                placeholder: "e.g. 2 medium bbq pizza",
                onSay: (then) => huntRef.current?.(then),
              });
              return;
            }
            huntRef.current?.(rest, false);
          },
        });
        return;
      }

      /*
       * The sentence read rather than pattern matched.
       *
       * Only where the rules have already failed to split it, and only on
       * something long enough to be worth reading: "2 chicken pie, 1 coke"
       * is split by the rule below in no time and without a round trip,
       * and the layer has nothing to add to it.
       *
       * What it adds is the sentence that is not a list. "Can I get two
       * of those chicken pies and a shawarma for John Doe, 0800 000 0000,
       * Trezadel" has no comma pattern the rules can trust, and taken by
       * them it becomes one long search for a dish that does not exist.
       * Read, it is three answers and an order.
       *
       * Everything it finds goes through the machinery that was already
       * here: the items are handed to the same queue the comma rule
       * fills, and each one is searched against the real menu exactly as
       * before. The reading chooses the words, never the food, never the
       * price, and never whether any of it is in stock.
       */
      if (
        echo &&
        list.current.length === 0 &&
        !readingOff.current &&
        /*
         * Read first, every time, and let the reading say what it was.
         *
         * This was gated on the comma rule having already failed, which
         * is the right order for a message that is a list of food and
         * exactly the wrong one for everything else. "Naza, qUEEN" became
         * a search for cod liver oil. "sorry, naza, trezadel", somebody
         * correcting their block, became three things to buy.
         *
         * The gate was trying to decide what a message was in order to
         * choose who should read it, which is the job of the thing it was
         * gating. So the reading goes first and says: this is an order of
         * two, or one thing, or a name and a block, or a correction. The
         * comma rule still does the work whenever the reading comes back
         * with a list, and still does all of it when there is no key.
         */
        true
      ) {
        firstSay.current = false;
        /*
           Something on the screen while it reads.

           The reading takes most of a second and is allowed six before it
           gives up, and for all of that the chat sat there saying nothing
           at all. A box that answers instantly for a year and then goes
           quiet reads as broken, and somebody types the message again,
           which is a second order's worth of nothing happening.
        */
        const got = await working(
          "Reading that\u2026",
          fetch("/api/bot/understand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            said,
            shop: {
              shopName: "Sudu",
              counters: (startRef.current?.kitchens ?? []).map((one) => one.name),
              hostels: startRef.current?.hostels ?? [],
              nextRun: startRef.current?.runs?.[0]?.said ?? "",
              cutOff: startRef.current?.runs?.[0]?.closes ?? "",
              /*
               * A car of its own counts as open.
               *
               * This read runs alone, so on a day with no run the model
               * was told "nothing is open for ordering right now" while
               * the checkout was perfectly happy to sell a car. The week
               * has no Monday or Tuesday run, so that is two days in
               * seven of the chat turning people away from a shop that
               * was open.
               */
              open:
                (startRef.current?.runs ?? []).length > 0 ||
                (startRef.current?.cars ?? []).length > 0,
            },
          }),
        })
            .then((one) => one.json())
            .catch(() => null)
        );

        /* No key, no credit, no answer: remembered, so this is the last
           time it is asked this session, and the rules carry on. */
        if (got?.off) readingOff.current = true;

        const reading = got?.ok ? got.reading : null;
        if (reading) {
          /* Details they happened to mention. Only ever filling a blank:
             a sentence must not quietly move an order somebody has
             already given a block for. */
          const mine = held.current;
          /* Somebody putting right what the chat got wrong is allowed to
             overwrite it. Any other sentence may only fill a blank, or a
             stray word relocates a dinner somebody already placed. */
          const fixing = isCorrection(said);
          if ((mine.name === "" || fixing) && reading.name !== "") {
            mine.name = String(reading.name).split(" ")[0];
          }
          if ((mine.phone === "" || fixing) && reading.phone !== "") {
            mine.phone = reading.phone;
            /*
             * A number given in the opening message is still a number the
             * shop may already know, and somebody who typed everything at
             * once should not be the one person who gets asked for a name
             * they have given before.
             *
             * The block comes back as a yes or no and never as a place,
             * exactly as it does when the number is typed on its own.
             */
            const seen = await fetch("/api/bot/known", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: reading.phone }),
            })
              .then((one) => one.json())
              .catch(() => null);

            if (seen?.name && mine.name === "") {
              mine.name = String(seen.name).split(" ")[0];
            }
            if (seen?.hasBlock && mine.hostel === "") mine.sameBlock = true;
          }
          if ((mine.hostel === "" || fixing) && reading.hostel !== "") {
            const blocks = startRef.current?.hostels ?? [];
            /* Named exactly, or near enough that only one block could be
               meant. "queen mary" and "Queen Mary Hall" are the same
               place; two blocks that both match are not a block. */
            const want = String(reading.hostel).toLowerCase().trim();
            const exact = blocks.find((one) => one.toLowerCase() === want);
            const near = blocks.filter(
              (one) =>
                one.toLowerCase().includes(want) || want.includes(one.toLowerCase())
            );
            const match = exact ?? (near.length === 1 ? near[0] : undefined);
            /* Said something block shaped that fits more than one. Not
               guessed, because guessing here delivers to the wrong
               building, and not thrown away either: the two it could be
               are worth a tap rather than a retype. */
            if (!match && near.length > 1) blockGuess.current = near;
            /* Only a block the shop actually has. A reading is a reading,
               and a hostel nobody has heard of is not a delivery address. */
            if (match) mine.hostel = match;
          }

          const wanted: { what: string; qty: number }[] = reading.wanted ?? [];
          if (wanted.length >= 2) {
            const parts = wanted.map((one) => `${one.qty} ${one.what}`);
            list.current = parts.slice(1);
            listing.current = parts.length;
            bot(
              `<b>${parts.length}</b> things. I will take them one at a time, ` +
                "and ask about any I cannot place.",
              460
            );
            huntRef.current?.(parts[0], false);
            return;
          }
          /*
           * Details and no food, which is most of what the first message
           * turns out to be.
           *
           * "Naza Queen" is a name and a block. Handed to the menu search
           * it became a hunt for cake, because a menu is all the search
           * has and so a menu is what it finds. Now the two facts are
           * kept and the one missing thing is asked for, which is the
           * conversation anybody would have had.
           */
          if (
            wanted.length === 0 &&
            (mine.name !== "" || mine.hostel !== "" || mine.phone !== "")
          ) {
            const got: string[] = [];
            if (mine.name !== "") got.push(`<b>${mine.name}</b>`);
            if (mine.hostel !== "") got.push(mine.hostel);
            bot(
              got.length > 0
                ? `Got it${got.length > 0 ? `, ${got.join(", ")}` : ""}. What would you like?`
                : "What would you like?",
              430
            );
            setAsk({
              of: "text",
              placeholder: "e.g. 2 chicken pie and a shawarma",
              onSay: (next) => huntRef.current?.(next),
            });
            return;
          }

          if (wanted.length === 1) {
            /* One thing, said in a sentence. Searched for as the thing
               rather than as the sentence, which is the whole difference
               between finding it and apologising. */
            const only = `${wanted[0].qty} ${wanted[0].what}`;
            if (only.toLowerCase() !== said.trim().toLowerCase()) {
              huntRef.current?.(only, false);
              return;
            }
          }
        }
      }

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
        const already =
          probed.current && probed.current.said === said ? probed.current.got : null;
        probed.current = null;
        const got = (already ??
          (await (
            await working(
              "Looking through the menus…",
              fetch("/api/bot/find", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ said, kitchen: queue.current[0]?.id ?? "" }),
              })
            )
          ).json())) as {
          how: string;
          qty: number;
          hits: Hit[];
          instead: { id: string; name: string; shop: string; price?: number }[];
          shops?: { id: string; name: string }[];
          shelf?: string;
          counter?: string;
          href?: string;
          lead?: string;
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
                if (again.hits[0]) {
                  /* Found it there, so the counter has done its job and
                     the next question is not about it. */
                  queue.current = [];
                  walk(again.hits[0], again.hits[0].qty ?? got.qty);
                  return;
                }
                /*
                 * Not found there, so the counter is kept.
                 *
                 * Somebody who has just tapped Domino's has told us where
                 * they are shopping, and clearing that because one search
                 * came back empty threw the answer away: the next question
                 * said "what do you fancy?" instead of "what from
                 * Domino's?", and the suggestions after it came from every
                 * kitchen in the shop.
                 */
                askOrder();
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
              buttons: [
                ...places.map((shop, which) => ({
                  said: shop.name,
                  look: which === 0 ? undefined : ("alt" as const),
                  go: () => pick(shop),
                })),
                /* A way out, which this question never had. Asked which
                   restaurant does their printing, somebody could only
                   choose a restaurant: every other question in the chat
                   can be refused and this one could not. */
                {
                  said: "None of these",
                  look: "alt" as const,
                  go: () => {
                    me("None of these");
                    queue.current = [];
                    askOrder();
                  },
                },
              ],
              hint: "The price and the menu change with the counter.",
            });
            return;
          }

          bot("A few places do that. Where from?", 450);
          setAsk({
            of: "chips",
            chips: [
              ...places.map((shop, which) => ({
                said: shop.name,
                hot: which === 0,
                go: () => pick(shop),
              })),
              {
                said: "None of these",
                go: () => {
                  me("None of these");
                  queue.current = [];
                  askOrder();
                },
              },
            ],
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
        /*
         * Not food and not a product: it is one of the things we do.
         *
         * Laundry, printing, a tailor, a repair. The chat used to search
         * the menu for these, find nothing, and offer to source them,
         * which is the shop forgetting half of what it does while
         * somebody is standing there asking for it.
         */
        if (got.how === "errand" && got.href) {
          misses.current = 0;
          bot(`That is one of ours. ${got.lead ?? ""}`.trim(), 500);
          setAsk({
            of: "buttons",
            buttons: [
              { said: `Open ${(got.counter ?? "the page").toLowerCase()}`, look: "green", href: got.href },
              {
                said: "Carry on with food",
                look: "alt",
                go: () => { me("Carry on with food"); askOrder(true); },
              },
            ],
          });
          return;
        }

        /*
         * Not food, but we do sell it: it lives on a counter.
         *
         * The shelves are kept off the food menu on purpose, and the chat
         * searched the menu and said "I cannot find that anywhere on the
         * shop today" over two thousand cleansers. Now it says where the
         * thing actually is and opens the shelf.
         *
         * A link rather than a line in the basket. A counter is its own
         * order on its own car, so adding it here would be quietly
         * starting a second order inside the first; and on the pharmacy
         * shelf it is also where the plain words about what we are and are
         * not get read, which is not something to tap past.
         */
        if (got.how === "counter" && (got.instead ?? []).length > 0) {
          misses.current = 0;
          const shelf = got.counter ?? "another";
          const first = got.instead[0];
          bot(
            `That is not on the food menu, but we do carry it: it is on our ` +
              `<b>${shelf.toLowerCase()}</b> shelf.`,
            500
          );
          bot(
            got.instead.length === 1
              ? `<b>${first.name}</b>${first.price ? `, ${naira(first.price)}` : ""}.`
              : `We have <b>${first.name}</b>${first.price ? `, ${naira(first.price)}` : ""}` +
                ` and ${got.instead.length - 1} other${got.instead.length > 2 ? "s" : ""}` +
                " like it.",
            460
          );
          bot(
            `It is its own order on its own car, so it does not travel with ` +
              `food. Have a look and it is a few taps.`,
            440
          );
          setAsk({
            of: "buttons",
            buttons: [
              {
                said: `Open the ${shelf.toLowerCase()} shelf`,
                look: "green",
                href: got.href ?? "/",
              },
              {
                said: "Carry on with food",
                look: "alt",
                go: () => { me("Carry on with food"); askOrder(true); },
              },
            ],
          });
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

  /*
   * "I do not know what to order."
   *
   * The commonest thing anybody says to a person behind a counter, and
   * until now the chat had no answer to it but a blank box. What it can
   * honestly do is read the menu the shop is selling today and show what
   * the money will buy, dearest first: somebody with ten thousand wants
   * the best ten thousand will buy, not the cheapest thing on the shelf.
   *
   * Every price shown is the menu's own, which is the price the till
   * charges. Nothing here is a sample list and nothing is invented.
   */
  const askBudget = useCallback(() => {
    setAt(2);
    const lists = startRef.current;
    const fee = lists?.feeFrom ?? 0;

    /* What the money buys, once the question of delivery is settled. */
    const show = async (budget: Budget) => {
      held.current.budget = budget;
      const spend = toSpend(budget, fee);
      if (spend <= 0) {
        bot(
          `Delivery alone starts at <b>${naira(fee)}</b>, so there would be nothing ` +
            "left for food out of that. Shall we look at a bigger figure?",
          520
        );
        askBudgetRef.current?.();
        return;
      }

      try {
        const answer = await working(
          "Seeing what that will buy…",
          fetch("/api/bot/within", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spend, kitchen: queue.current[0]?.id ?? "" }),
          })
        );
        const got = (await answer.json()) as {
          items: { id: string; name: string; price: number; shop: string }[];
        };

        if (got.items.length === 0) {
          bot(
            `I cannot find much at <b>${naira(spend)}</b> on what is open today. ` +
              "Say what you fancy and I will look properly.",
            500
          );
          askOrderRef.current?.(true);
          return;
        }

        /*
         * Said as a budget to build up to, not as one thing to buy.
         *
         * Forty-five thousand is not one dish, it is enough for the room,
         * and a list that reads as "pick one of these" has misunderstood
         * the question. So the sentence invites more than one, and every
         * pick afterwards says what is left.
         */
        bot(
          budget.kind === "all"
            ? `With <b>${naira(budget.amount)}</b> all in, that is about ` +
                `<b>${naira(spend)}</b> of food once delivery is paid. Pick as many ` +
                "as you like and I will keep count."
            : `Here is what <b>${naira(spend)}</b> of food buys. Pick as many as you ` +
                `like and I will keep count. Delivery is on top, from ${naira(fee)}.`,
          540
        );
        setAsk({
          of: "chips",
          chips: [
            ...got.items.map((one, which) => ({
              said: `${one.name} · ${naira(one.price)}`,
              hot: which === 0,
              go: () => {
                me(one.name);
                /* Looked up properly rather than added from this list, so
                   it arrives with its own questions: a pizza still asks
                   which size, and the price still comes off the till. */
                huntRef.current?.(one.name, false);
              },
            })),
            {
              said: "None of these, let me say it",
              go: () => {
                me("Let me say it");
                askOrderRef.current?.(true);
              },
            },
          ],
          hint: "Prices are the menu's own. The bill is worked out at the end.",
        });
      } catch {
        bot("I could not look that up just then. Say what you fancy instead?", 440);
        askOrderRef.current?.(true);
      }
    };

    /* Which kind of figure it is. Asked, never assumed: "fifteen k" with
       delivery inside it and outside it are two different orders, and
       picking one for somebody is quoting them a price they never gave. */
    const settle = (budget: Budget) => {
      if (budget.kind !== "") {
        void show(budget);
        return;
      }
      bot(
        `Is <b>${naira(budget.amount)}</b> for the food, or everything including ` +
          "delivery?",
        480
      );
      setAsk({
        of: "buttons",
        buttons: [
          {
            said: "That is for the food",
            go: () => {
              me("For the food");
              void show({ ...budget, kind: "food" });
            },
          },
          {
            said: "Everything, delivery included",
            look: "alt",
            go: () => {
              me("Everything in");
              void show({ ...budget, kind: "all" });
            },
          },
        ],
      });
    };

    bot("What were you thinking of spending?", 440);
    setAsk({
      of: "text",
      placeholder: "e.g. 15k, or 20,000 all in",
      onSay: (said) => {
        me(said);
        const budget = readBudget(said, true);
        if (!budget) {
          bot("I did not catch a figure in that. A number is plenty: 10k, say.", 440);
          askBudgetRef.current?.();
          return;
        }
        settle(budget);
      },
    });
  }, [bot, me, working]);

  useEffect(() => {
    askBudgetRef.current = askBudget;
  }, [askBudget]);

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
    /*
     * The other shops, said out loud, beside a box that still takes
     * anything.
     *
     * The chat was a blank box, which is right when the shop is a food
     * shop and wrong now it is four. A box cannot advertise: somebody
     * ill at nine at night does not type "do you have a pharmacy" into a
     * thing that said "what do you fancy", they close it. And every time
     * the chat has to guess which shop a sentence meant it has had a
     * chance to guess wrong, which it has, twice.
     *
     * Chips rather than a question with buttons on it, because chips
     * keep the box underneath them: nobody ordering food has to answer
     * "which department" first, which is the tax a menu would put on the
     * nine orders in ten that are dinner.
     *
     * They hand over rather than take the order. A counter is its own
     * basket on its own car and an errand has no basket at all, so the
     * honest end of each of these is the page that does it.
     */
    const elsewhere = (
      title: string,
      href: string,
      said: string
    ): { said: string; go: () => void } => ({
      said: title,
      go: () => {
        me(title);
        bot(said, 460);
        setAsk({
          of: "buttons",
          buttons: [
            { said: `Open ${title.toLowerCase()}`, look: "green", href },
            {
              said: "Actually, food",
              look: "alt",
              go: () => { me("Actually, food"); askOrderRef.current?.(true); },
            },
          ],
        });
      },
    });

    setAsk({
      of: "chips",
      placeholder: only ? `Something from ${only.name}` : "e.g. 2 medium bbq pizza",
      onSay: (said) => huntRef.current?.(said),
      chips: only
        ? [
            {
              said: "Something else",
              go: () => { me("Something else"); queue.current = []; askOrderRef.current?.(true); },
            },
          ]
        : [
            /* The commonest thing anybody says to a person behind a
               counter, and until now the chat had no answer to it but a
               blank box. It stays first. */
            ...(again
              ? []
              : [
                  {
                    said: "I do not know what to order",
                    hot: true,
                    go: () => {
                      me("I do not know what to order");
                      askBudgetRef.current?.();
                    },
                  },
                ]),
            elsewhere(
              "Pharmacy",
              "/pharmacy",
              "Medicine and the rest of it is on its own shelf: its own order on its own car, so it does not travel with food. We fetch and carry, and we are not a pharmacy, so we cannot tell you what to take."
            ),
            elsewhere(
              "Skincare",
              "/skincare",
              "The skincare shelf is its own order on its own car, bought from authorised Lagos retailers."
            ),
            elsewhere(
              "Laundry",
              "/pau-laundry",
              "We collect from your block on Mondays and Thursdays and bring it back folded within 48 hours, priced per item."
            ),
            elsewhere(
              "Printing",
              "/pau-project-printing",
              "Assignments, projects and theses printed and bound, and a good deal besides. Every one of them is quoted rather than priced."
            ),
            {
              said: "Something else we do",
              go: () => {
                me("Something else we do");
                bot("We also do these. Which one?", 440);
                setAsk({
                  of: "chips",
                  chips: [
                    elsewhere("Tailoring", "/pau-tailoring", "Made to measure, or something you own made to fit. We find the tailor and handle the back and forth."),
                    elsewhere("Hair and barbing", "/pau-hair-and-barbing", "Tell us the style and the day and we find somebody good and arrange it."),
                    elsewhere("Phone or laptop repair", "/pau-phone-and-laptop-repair", "Collected from your block, quoted before any work starts, brought back."),
                    elsewhere("Buying a laptop", "/pau-buy-a-laptop", "Tell us what it is for and what you can spend. We find it, photograph it and price it before you pay."),
                    elsewhere("Anything else", "/custom-order", "If it is not on the menu, tell us what you want and we go and find it."),
                    {
                      said: "Back",
                      go: () => { me("Back"); askOrderRef.current?.(true); },
                    },
                  ],
                  hint: "None of these have a price until we know the job.",
                });
              },
            },
          ],
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
        /*
         * No running total here, deliberately.
         *
         * It is the obvious thing to add after a budget: say what is left
         * as each thing goes on. But the chat does not know what anything
         * costs. A line's price depends on the size and the halves chosen
         * on it, and the only thing allowed to add this order up is the
         * till. Working it out here would mean either inventing prices or
         * asking the server between every tap, and a figure the chat made
         * up is exactly the kind of figure this whole thing refuses to
         * quote. The bill says the total, and says once if it went over.
         */

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

    /*
     * Whatever is still missing, asked at the till.
     *
     * The name, the number and the block used to be the price of
     * entering the conversation. They are now the price of leaving with
     * food, which is where every shop in the world puts them, and which
     * means somebody who typed the lot in one message is asked for none
     * of them.
     *
     * In this order on purpose: the name is one word and the cheapest
     * thing to be asked for, and the number is the one the whole order is
     * filed under. Each step comes back here, so the bill is worked out
     * once and only when it can actually be delivered.
     */
    if (mine.phone === "") {
      askPhoneRef.current?.(() => soonRef.current?.());
      return;
    }
    /* After the number, never before it. The number is what the shop
       files people under, so asking for it first means a returning
       customer is greeted by name instead of being asked for one they
       have given before. */
    if (mine.name === "") {
      bot("Nearly there. What should I call you?", 430);
      setAsk({
        of: "text",
        placeholder: "Your name",
        onSay: (said) => {
          me(said);
          mine.name = (nameIn(said) || said).split(" ")[0];
          soonRef.current?.();
        },
      });
      return;
    }
    if (mine.hostel === "" && mine.sameBlock !== true) {
      askHostelRef.current?.(() => soonRef.current?.());
      return;
    }

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
          /*
           * A car of its own is priced off its own ladder, not the run's.
           *
           * The chat knew which car somebody had chosen and told nobody:
           * the bill was worked out as though it were going on a run, and
           * then the order itself was refused for having no run on it.
           */
          sameDay: mine.car ? { urgent: mine.car.urgent } : null,
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
      /*
       * When it lands, said before the money.
       *
       * It was already on the bill, in small type under Delivery, which
       * is where somebody looks last and sometimes not at all. The run is
       * the thing most likely to be wrong for them: a total they are
       * happy with for a night they cannot be in is a cancelled order and
       * a wasted conversation. So it is a sentence of its own, in front
       * of the figure, where a question about it is still cheap to ask.
       */
      const when = mine.car?.label ?? mine.run?.said ?? "";
      bot(
        when !== ""
          ? `That goes out <b>${when}</b>. Here is your total.`
          : "Here is your total.",
        420
      );
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
                /* The block they are on, or the one already saved
                   against their number, which the chat deliberately does
                   not know. Said as "your usual block" rather than left
                   blank, because a bill with a gap where the address goes
                   is a bill nobody trusts. */
                under: [
                  mine.hostel !== ""
                    ? mine.hostel
                    : mine.sameBlock
                      ? "your usual block"
                      : "",
                  when !== "" ? `run ${when}` : "",
                ]
                  .filter(Boolean)
                  .join(" · "),
                amount: got.fee ?? 0,
              },
            ],
            total: { said: "Total", amount: got.total ?? 0 },
          },
        },
        600
      );
      /*
       * Over what they said they had, said once.
       *
       * Never enforced. A budget is a thing somebody mentioned, not a cap
       * the shop gets to impose, and plenty of people go over on purpose.
       * But going over without being told is how somebody ends up paying
       * eight thousand more than they planned and blaming the chat for
       * it, so it is said plainly with the amount, and then left alone.
       */
      if (mine.budget) {
        const meant = allIn(mine.budget, got.fee ?? 0);
        const over = (got.total ?? 0) - meant;
        if (over > 0) {
          say(
            {
              kind: "status",
              tone: "warn",
              html:
                `<span>That is <b>${naira(over)}</b> over the ` +
                `${naira(mine.budget.amount)} you mentioned. Still yours to decide.</span>`,
            },
            460
          );
        }
      }

      const confirm = (
        hint = "Nothing is charged until you transfer. Change something covers the food, the block and the run."
      ) => {
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
      /*
       * Asked once, then straight to the box.
       *
       * A code that did not work already offered "Try another code" and
       * "Carry on without it". Tapping the first one asked the same
       * question again, with the same two buttons, before showing
       * anywhere to type: somebody who has just pressed Try another code
       * has answered that question as clearly as it can be answered.
       *
       * So the question is only ever asked the first time. Every try
       * after that goes straight to the box, and the way out is still on
       * the failure itself, where somebody deciding to give up is
       * actually looking.
       */
      const askCode = (first = true) => {
        if (!first) {
          typeCode();
          return;
        }
        bot("Do you have a discount code?", 440);
        setAsk({
          of: "buttons",
          buttons: [
            {
              said: "Yes, I have one",
              go: () => {
                me("Yes, I have one");
                typeCode();
              },
            },
            {
              said: "No, carry on",
              look: "alt",
              go: () => {
                me("No, carry on");
                noCode.current = true;
                confirm();
              },
            },
          ],
          hint: "If you do not have one, nothing changes.",
        });
      };

      function typeCode() {
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
                            /* A code is worth what it is worth on the
                               delivery actually being charged, and on a
                               car of its own there is no run to read. */
                            deliverAt: mine.car?.at ?? "",
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
      }

      /*
       * The card, offered against a total rather than before one.
       *
       * It is an upsell, and an upsell reads very differently once
       * somebody can see what they are already spending. Only on a gift:
       * a handwritten card with your own lunch is a strange thing to be
       * asked about.
       */
      const card = startRef.current?.card ?? null;
      if (card && isGift(mine.occasion) && !cardAsked.current) {
        cardAsked.current = true;
        const called = cardCalled(mine.occasion);
        bot(
          `Want a <b>${called}</b> with it? We write it by hand on the day and ` +
            `put it in the box, <b>${naira(card.price)}</b>.`,
          520
        );
        setAsk({
          of: "buttons",
          buttons: [
            {
              said: `Yes, add a ${called}`,
              go: () => {
                me(`Add a ${called}`);
                bot("What should it say?", 430);
                setAsk({
                  of: "text",
                  placeholder:
                    mine.occasion === "birthday"
                      ? `e.g. Happy birthday ${them(mine.occasion, mine.forName)}, enjoy!`
                      : "e.g. Thinking of you",
                  onSay: (wrote) => {
                    me(wrote);
                    cardMsg.current = wrote;
                    held.current.lines.push({
                      itemId: card.id,
                      name: card.name,
                      qty: 1,
                      optionIds: [],
                      chose: [],
                      shop: undefined,
                    });
                    bot("Lovely. That goes on the card, in the box.", 440);
                    /* The bill is worked out again rather than adjusted
                       here, because the till is the only thing allowed to
                       add up this order. */
                    soonRef.current?.();
                  },
                });
              },
            },
            {
              said: "No card, thanks",
              look: "alt",
              go: () => {
                me("No card");
                if ((startRef.current?.codes ?? false) && !held.current.code && !noCode.current) {
                  askCode();
                  return;
                }
                confirm();
              },
            },
          ],
          hint: "Handwritten on the day, not printed.",
        });
        return;
      }

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
    (asked: Swap | null = null, count: Amount | null = null) => {
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
          /*
           * The order's own options first, then its lines.
           *
           * The chip box is a hundred and fifty pixels and scrolls, which
           * is fine for four lines and not for ten: with a full order the
           * day, the block and the way out were all below the fold, and
           * the only things anybody could see were the dishes. Whatever
           * is true of the whole order goes at the top, where the length
           * of the order cannot bury it, and the lines scroll underneath.
           */
          chips: [
            { said: "Add something else", go: () => { me("Add something else"); askOrder(true); } },
            /*
             * The order is more than its lines.
             *
             * "Change something" opened the basket and nothing else, so
             * somebody who wanted it on Friday instead, or at a different
             * block, had no way to say so: the only things on the screen
             * were the dishes. Both go back to the step that asked them
             * and come straight back here afterwards, with the bill worked
             * out again, because changing the day changes the fee.
             */
            /*
             * Offered only where there is something to change it to.
             *
             * On a shop with one run open, this led to a screen showing
             * that one run, a That works button and a line saying it is
             * already the soonest we can reach you. A choice of one is
             * not a choice, and a question that can only be answered the
             * way it was already answered is a step.
             */
            ...((startRef.current?.runs ?? []).length +
              (startRef.current?.cars ?? []).length >
            1
              ? [
                  {
                    said: "Change the day or run",
                    go: () => {
                      me("Change the day or run");
                      const back = () => soon();
                      if (isGift(held.current.occasion)) askDayRef.current?.(back);
                      else askSlotRef.current?.(back);
                    },
                  },
                ]
              : []),
            {
              said: "Change the block",
              go: () => {
                me("Change the block");
                askHostelRef.current?.(() => soon());
              },
            },
            { said: "Nothing, carry on", go: () => { me("Nothing, carry on"); soon(); } },
            ...lines.map((line, which) => ({
              said: line.shop ? `${said(line)} · ${line.shop}` : said(line),
              go: () => {
                me(said(line));
                one(which);
              },
            })),
          ],
          hint:
            lines.length > 3
              ? `Your ${lines.length} lines are under those. Tap one to change it, or say what you want changed.`
              : "Tap a line to change it, or say what you want changed.",
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

      /*
       * How many of something, said in words.
       *
       * "Make the BBQ chicken one" is the commonest edit anybody makes,
       * and tapping One fewer twice is the long way round it. Changed
       * straight away rather than confirmed: unlike taking a line off,
       * nothing is lost if the chat has misread it, and the new figure is
       * said back so a wrong one is obvious.
       */
      if (count) {
        const which =
          count.which !== ""
            ? lineLike(count.which, lines)
            : lines.length === 1
              ? 0
              : -1;

        if (which >= 0) {
          const line = lines[which];
          if (count.qty === line.qty) {
            bot(`You already have <b>${said(line)}</b>.`, 420);
            basket("Anything else to change?");
            return;
          }
          line.qty = count.qty;
          kept();
          bot(`Done, <b>${said(line)}</b>.`, 420);
          basket("Anything else to change?");
          return;
        }

        basket(
          count.which !== ""
            ? `I am not sure which one you mean by <b>${count.which}</b>. Which of these?`
            : "Which one should that be?"
        );
        return;
      }

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
            /* A car of its own instead of a run. The checkout makes the
               car when it takes the order, so this is the moment it has
               to be told, and an order that said nothing was turned away
               for having no run on it. */
            deliverAt: mine.car?.at ?? "",
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
            /*
             * What the person packing the box needs to know, in the
             * buyer's own words. A gift is two people, and an order that
             * does not say so is a rider ringing the wrong one.
             */
            note: [
              isGift(mine.occasion)
                ? `Gift for ${them(mine.occasion, mine.forName)}. Ring ${mine.name || "the buyer"} on ${mine.phone}, not them.`
                : "",
              cardMsg.current ? `Card: "${cardMsg.current}"` : "",
            ]
              .filter(Boolean)
              .join(" "),
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
  const askSooner = useCallback((then?: () => void) => {
    setAt(1);
    /* Where to go once the car or the run is settled. Ordering, the first
       time through; back to the bill when somebody came here from it to
       change the day, because they have already said what they want, and
       being asked again loses the order they had just built. */
    const onward = then ?? (() => askOrder());
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
    /*
     * And properly sooner, not sooner by an hour.
     *
     * A car costs more and the only thing it buys is time, so an hour
     * earlier than the run they already have is the bot talking somebody
     * into the dearer trip for nothing. The same two hours the checkout
     * and the front page use, so all three agree about what counts as a
     * reason to pay for a car.
     *
     * Only on a day with a run on it. A day with no run is a car or
     * nothing, and that is a different question answered elsewhere.
     */
    const by = keep ? new Date(keep.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const saving = CAR_MUST_SAVE_HOURS * 60 * 60 * 1000;
    const earlier = cars.filter((car) => {
      const at = new Date(car.at).getTime();
      return Number.isFinite(at) && at <= by - saving;
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
              held.current.car = null;
              onward();
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
      onward();
    };

    const keepTheRun = () => {
      held.current.car = null;
      held.current.run = keep ?? null;
      me(`Keep the ${keep?.said ?? "next"} run`);
      onward();
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

  /*
   * The day it has to land on.
   *
   * Only for a gift, and only because a gift has a day. A birthday is on
   * the day it is on, and "our next run is Thursday" is no use to somebody
   * whose sister turns twenty on Tuesday.
   *
   * It is no more than picking a day. Once a day is picked the shop's own
   * machinery answers it: a scheduled run that lands that day is offered at
   * the run's fee, a car on that day is offered at the car's, and where
   * there is no run that day the car is the only answer, which is exactly
   * what it is. Nothing here works out a price.
   */
  const askDay = useCallback((then?: () => void) => {
    setAt(1);
    const onward = then;
    const lists = startRef.current;
    const mine = held.current;

    /*
     * As many days as the shop actually takes orders for, with the date
     * on each one.
     *
     * The number is the shop's own rule rather than a guess at it, so a
     * horizon widened in Settings widens this list on the next load. And
     * every chip carries its date: "Tuesday" is two Tuesdays as soon as
     * the list is longer than a week, and a birthday booked on the wrong
     * one is not a mistake anybody notices until the day.
     */
    const reach = Math.max(1, lists?.horizonDays ?? 7);
    const days: { said: string; date: string }[] = [];
    const start = new Date();
    for (let i = 0; i <= reach; i += 1) {
      const at = new Date(start);
      at.setDate(at.getDate() + i);
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(at);
      const dayAndDate = new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Africa/Lagos",
      }).format(at);
      days.push({
        said: i === 0 ? `Today · ${dayAndDate}` : i === 1 ? `Tomorrow · ${dayAndDate}` : dayAndDate,
        date,
      });
    }

    bot(
      `When is it? I will try to land it on the day for <b>${them(mine.occasion, mine.forName)}</b>.`,
      480
    );
    setAsk({
      of: "chips",
      chips: [
        ...days.map((one, which) => ({
          said: one.said,
          hot: which === 0,
          go: () => {
            me(one.said);
            held.current.wantDay = one.date;
            askSlotRef.current?.(onward);
          },
        })),
        {
          said: "Any day is fine",
          go: () => {
            me("Any day is fine");
            held.current.wantDay = "";
            askSlotRef.current?.(onward);
          },
        },
        {
          /*
           * Further off than the shop can see.
           *
           * Runs are planned about a week ahead, so a birthday three weeks
           * away is not a day this chat can offer: it could take the order
           * but it could not promise the car, and a promise the shop has
           * not made yet is the one thing it must not sell.
           *
           * A person can take that booking, so a person does. Said with
           * the reason, because "talk to us" with no reason reads as the
           * chat giving up.
           */
          said: "It is further off",
          go: () => {
            me("It is further off");
            bot(
              `We take orders up to <b>${reach} days</b> ahead, so I cannot promise ` +
                "a car further out than that yet. Food is not bought that far in " +
                "advance, and a price I quote today would have moved by then.",
              540
            );
            bot(
              "Somebody can pencil it in for you though, with everything you have " +
                "already told me.",
              460
            );
            setAsk({
              of: "buttons",
              buttons: [
                {
                  said: "Book it with a person",
                  look: "green",
                  href: handOver(
                    `It is for ${them(mine.occasion, mine.forName)}, further off than a week.`
                  ),
                },
                {
                  said: "Order for the soonest instead",
                  look: "alt",
                  go: () => {
                    me("The soonest is fine");
                    held.current.wantDay = "";
                    askSlotRef.current?.(onward);
                  },
                },
              ],
            });
          },
        },
      ],
      hint: "If there is no run that day, a car can go out just for it.",
    });
  }, [bot, handOver, me]);

  const askSlot = useCallback((then?: () => void) => {
    setAt(1);
    /* Where to go once a slot is settled. Ordering, the first time
       through; back to the bill when somebody has come from it to change
       the day, because they have already said what they want. */
    const onward = then ?? (() => askOrder());
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

    /*
     * The day they asked for, where they asked for one.
     *
     * A run that lands on the day is the cheap answer and goes first. No
     * run that day and a car is the only answer, which the chat says
     * plainly rather than quietly showing a run three days late.
     */
    const wanted = held.current.wantDay;
    const onTheDay = wanted === "" ? [] : runs.filter((run) => run.runDate === wanted);
    const carsThatDay =
      wanted === ""
        ? []
        : (lists?.cars ?? []).filter((car) => car.date === wanted);

    if (wanted !== "" && onTheDay.length === 0) {
      if (carsThatDay.length === 0) {
        /* Nothing can reach them on the day. Said straight, with the
           nearest run offered rather than nothing at all. */
        bot(
          "There is no run that day, and no car I can send either. " +
            "The nearest I can do is below.",
          520
        );
      } else {
        bot(
          `No run goes out that day, so it would be a car of its own, ` +
            `one trip, just for this.`,
          520
        );
        setAsk({
          of: "slots",
          slots: carsThatDay.slice(0, 3).map((car) => ({
            title: "A car of its own",
            when: car.phrase,
            dow: car.dow,
            dom: car.dom,
            fee: lists?.carFrom ?? 0,
            rush: true,
          })),
          onPick: (which: number) => {
            const car = carsThatDay[which];
            me(`A car of its own, ${car.phrase}`);
            held.current.car = car;
            held.current.run = null;
            onward();
          },
        });
        return;
      }
    }

    const first = onTheDay[0] ?? runs[0];
    held.current.run = first;
    held.current.car = null;
    /* The block is named only where the chat knows it. Somebody using the
       block saved against their number has not told it one, and "Our next
       run to  is Friday" is a sentence with a hole in it. */
    const to = held.current.hostel !== "" ? ` to <b>${held.current.hostel}</b>` : "";
    bot(
      wanted !== "" && first.runDate === wanted
        ? `There is a run${to} that very day, <b>${first.said}</b>.`
        : `Our next run${to} is <b>${first.said}</b>.`,
      480
    );
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
        { said: "That works", go: () => { me("That works"); onward(); } },
        ...(sooner
          ? [
              {
                said: "I need it sooner",
                look: "alt" as const,
                go: () => { me("I need it sooner"); askSooner(onward); },
              },
            ]
          : []),
      ],
      hint: sooner ? undefined : "That is already the soonest we can reach you.",
    });
  }, [askOrder, askSooner, bot, handOver, me, say]);

  useEffect(() => {
    askSlotRef.current = askSlot;
  }, [askSlot]);

  useEffect(() => {
    askDayRef.current = askDay;
  }, [askDay]);

  const takeBlock = useCallback(
    (hostel: string, then?: () => void) => {
      held.current.hostel = hostel;
      /* Naming a block outranks the one saved against the number, so the
         order's route stops filling that in and the bill stops calling it
         "your usual block". */
      held.current.sameBlock = false;
      /*
       * Where to go next.
       *
       * The first time through, on to the day and the slot. Changing the
       * block part way through an order, straight back to where they came
       * from: they have already picked a run, and asking them to pick it
       * again because they corrected their block is the chat punishing a
       * correction. The fee can move with the block, so the bill is
       * worked out again at the other end either way.
       */
      if (then) {
        then();
        return;
      }
      remember("gave their details, nothing chosen yet");
      /* A gift has a day; an ordinary order has only a soonest. So the
         day is asked for first where there is one to ask about, and the
         slot step then answers it. */
      if (isGift(held.current.occasion)) askDay();
      else askSlot();
    },
    [askDay, askSlot, remember]
  );

  const showBlocks = useCallback(
    (blocks: string[], said = "Here they all are.", then?: () => void) => {
      bot(said, 420);
      setAsk({
        of: "chips",
        chips: [
          ...blocks.map((hostel) => ({
            said: hostel,
            go: () => {
              me(hostel);
              takeBlock(hostel, then);
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
                    go: () => { me("Let me look again"); showBlocks(blocks, undefined, then); },
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

  const askHostel = useCallback((then?: () => void) => {
    setAt(0);
    const blocks = startRef.current?.hostels ?? [];
    if (blocks.length === 0) {
      setBusy("Just a second…");
      setAsk({ of: "nothing" });
      pending.current = () => {
        setBusy("");
        askHostel(then);
      };
      return;
    }

    /*
     * Whose block, not just which block.
     *
     * For a gift this is the single question that was wrong before: the
     * food goes where the person receiving it sleeps, and the person
     * typing has no reason to be there at all.
     */
    const mine = held.current;

    /*
     * The blocks a half-named one could have meant, offered first.
     *
     * Somebody who typed "Naza Queen" has said their block; it is just
     * that the shop has two with Queen in them. Asking "which block are
     * you in?" after they have told you is the chat not having listened,
     * so the two it could be are the question instead.
     */
    if (blockGuess.current.length > 1) {
      const could = blockGuess.current;
      blockGuess.current = [];
      bot(`Which one did you mean?`, 420);
      setAsk({
        of: "chips",
        chips: [
          ...could.map((one, which) => ({
            said: one,
            hot: which === 0,
            go: () => {
              me(one);
              takeBlock(one, then);
            },
          })),
          {
            said: "Neither",
            go: () => {
              me("Neither");
              showBlocks(startRef.current?.hostels ?? [], undefined, then);
            },
          },
        ],
        hint: "",
      });
      return;
    }

    bot(
      isGift(mine.occasion)
        ? `Which block is <b>${them(mine.occasion, mine.forName)}</b> in? That is where it goes.`
        : "Which block are you in? Type it and I will find it."
    );
    setAsk({
      of: "text",
      placeholder: "e.g. Queen Mary",
      onSay: (said) => {
        me(said);

        /*
         * Not every sentence typed here is a block.
         *
         * Somebody who types "can I change my order" at this question is
         * asking the shop something, and matching it against a list of
         * hostels can only ever answer with a hostel. The question is
         * answered if the shop has an answer, and the block is asked for
         * again either way, because it is still needed.
         */
        if (looksLikeAQuestion(said) && sayFaq(said, () => askHostelRef.current?.())) {
          return;
        }

        const found = find(
          said,
          blocks.map((hostel) => ({ id: hostel, name: hostel }))
        );

        if (found.how === "sure" && found.hits[0]) {
          const hostel = found.hits[0].name;
          bot(`<b>${hostel}</b>, got it.`, 400);
          takeBlock(hostel, then);
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
                  takeBlock(hit.name, then);
                },
              })),
              {
                said: "None of those",
                go: () => { me("None of those"); showBlocks(blocks, undefined, then); },
              },
            ],
          });
          return;
        }

        showBlocks(blocks, "I do not know that one. Here are all of them.", then);
      },
    });
  }, [bot, me, showBlocks, takeBlock]);

  const askPhone = useCallback((then?: () => void) => {
    setAt(0);
    bot(
      `Nice to meet you, <b>${held.current.name || "friend"}</b>. What number should we call on the day?`
    );
    /*
     * The rider rings the buyer, never the recipient.
     *
     * Said out loud rather than merely done, because it is the thing
     * somebody buying a surprise is worried about, and a shop that does
     * not say it is a shop they have to guess about. A rider phoning the
     * person being surprised is the whole gift spent.
     */
    if (isGift(held.current.occasion)) {
      bot(
        `Yours, not <b>${them(held.current.occasion, held.current.forName)}</b>’s. ` +
          "We ring you when the car is at the block, so the surprise holds.",
        480
      );
    }
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
          /*
           * A block the shop already has, offered rather than asked for.
           *
           * Somebody who ordered last week has a block on file and being
           * asked again is the shop admitting it keeps no records. One
           * message saved on every returning customer, which is most of
           * them.
           *
           * The block is never printed. The number is typed into a public
           * chat by whoever is holding the phone, and answering with a
           * name and a hostel would make this box a way of finding out
           * where somebody sleeps, one number at a time, with no sign-in.
           * So it is used and not shown: whoever it belongs to knows
           * where they live, and nobody else learns it.
           */
          void (async () => {
            const seen = await fetch("/api/bot/known", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: number }),
            })
              .then((one) => one.json())
              .catch(() => null);

            /* Known, so they are greeted rather than interviewed. The
               name is filled in here, which is why the number is asked
               for before the name and not after it. */
            if (seen?.name && held.current.name === "") {
              held.current.name = String(seen.name).split(" ")[0];
              bot(`Welcome back, <b>${held.current.name}</b>.`, 400);
            }

            if (!seen?.hasBlock) {
              askHostel(then);
              return;
            }

            /*
             * The block they used last time, taken rather than asked
             * about.
             *
             * This used to ask "same one?", which is a whole message
             * spent on a question almost nobody answers no to, and the
             * answer is on the total a moment later anyway where it can
             * be changed along with everything else. A confirmation step
             * that duplicates a confirmation step is just a step.
             *
             * Never printed here. The chat does not know what the block
             * is, and does not need to: the order's own route reads it
             * from the record, so a number typed into a public box never
             * comes back with somewhere to find that person.
             */
            held.current.sameBlock = true;
            if (then) then();
            else askSlotRef.current?.();
          })();
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

  useEffect(() => {
    askHostelRef.current = askHostel;
  }, [askHostel]);

  useEffect(() => {
    askPhoneRef.current = askPhone;
  }, [askPhone]);

  const begin = useCallback(() => {
    settled.current = false;
    owed.current = 0;
    misses.current = 0;
    stopWatching();
    held.current = { ...EMPTY, lines: [] };
    list.current = [];
    listing.current = 0;
    noCode.current = false;
    firstSay.current = true;
    cardAsked.current = false;
    cardMsg.current = "";
    setLines([]);
    setAt(0);
    bot("Hey, I’m <b>Sudu Bot</b>. I can take your order right here, no app needed.", 450);

    /*
     * Straight to it.
     *
     * This used to open by asking what the order was for: four chips, one
     * tap, and it bought the one fact everything afterwards depends on,
     * which is whether there is a second person in it. A gift goes to the
     * block where the person receiving it sleeps, and the buyer has no
     * reason to be there at all.
     *
     * It also cost a message at the top of every single conversation,
     * including the nine in ten that are somebody buying their own
     * dinner, and the whole point of this chat is that it is quicker than
     * WhatsApp. A question everybody answers the same way is not a
     * question, it is a toll.
     *
     * So it is noticed instead. Every sentence from here is checked for
     * sounding like a gift, by a plain rule that needs no key, and only
     * those orders are asked who they are going to. Ordinary orders are
     * never asked at all.
     */
    held.current.occasion = "me";

    let tries = 0;

    /*
     * Hello again, and straight to the food.
     *
     * Three questions skipped for somebody who has ordered before: their
     * name, their number and their block are all already known, and asking
     * again is the shop losing somebody at the only moment it has their
     * attention.
     *
     * Said out loud rather than assumed, with the block in it, because the
     * one thing worse than asking a returning customer where she lives is
     * sending her dinner to where she lived last term. And Not me beside
     * it, because phones get lent and laptops get shared, and a chat that
     * cannot be told it has the wrong person is a chat that will one day
     * deliver to the wrong person.
     */
    const greetKnown = (known: { name: string; phone: string; hostel: string }) => {
      const first = known.name.split(" ")[0];
      bot(
        known.hostel !== ""
          ? `Welcome back, ${first}. Still ${known.hostel}?`
          : `Welcome back, ${first}.`,
        420
      );
      setAsk({
        of: "chips",
        chips: [
          {
            said: known.hostel !== "" ? "Yes, what have you got?" : "What have you got?",
            hot: true,
            go: () => {
              me(known.hostel !== "" ? "Yes, what have you got?" : "What have you got?");
              remember("came back, details already known");
              askSlotRef.current?.();
            },
          },
          {
            said: "Different block",
            go: () => {
              me("Different block");
              askHostelRef.current?.();
            },
          },
          {
            said: "Not me",
            go: () => {
              me("Not me");
              /* Everything the cookie said, dropped. Somebody on a
                 borrowed phone starts where a stranger starts. */
              held.current.name = "";
              held.current.phone = "";
              held.current.hostel = "";
              bot("No problem. What should I call you?", 400);
              askTheName();
            },
          },
        ],
        hint: "",
      });
    };

    /* Asked again after something else was dealt with. The greeting is not
       repeated: somebody who has just been answered does not need to be
       told who they are talking to a second time. */
    const nameAgain = () => {
      bot("So, what should I call you?", 420);
      askTheName();
    };
    const takeIt = (said: string) => {
      /* "My name is Chinaza" was being stored as "My", because the first
         word of the answer is the name right up until somebody is polite
         about it. */
      const given = nameIn(said) || said;
      held.current.name = given.split(" ")[0];

      /* Whose it is, where it is not theirs. Asked straight after their
         own name, because every sentence from here on has to name one of
         the two people and the chat cannot guess which. */
      const one = occasionBy(held.current.occasion);
      if (one.gift) {
        bot(one.asks, 440);
        setAsk({
          of: "text",
          placeholder: "Their first name",
          onSay: (who) => {
            me(who);
            held.current.forName = (nameIn(who) || who).split(" ")[0];
            askFood();
          },
        });
        return;
      }
      askFood();
    };

    /*
     * Food second, details last.
     *
     * The chat used to take a name, a number and a block before anybody
     * had said a word about dinner. Three questions, none of them about
     * food, asked of somebody who has not yet been given a single reason
     * to believe this is quicker than sending a WhatsApp message. Most
     * people who leave, leave there, and they leave having told us
     * nothing we could have sold them.
     *
     * So the order comes next, and the number and the block are asked for
     * at the till, where every shop asks for them and where somebody has
     * already decided they want the food. Nothing else moves: the same
     * questions, the same answers, in the order a person expects them.
     */
    const askFood = () => {
      bot("How can I help you today?", 430);
      setAsk({
        of: "text",
        placeholder: "e.g. 2 chicken pie and a shawarma",
        onSay: (said) => huntRef.current?.(said),
      });
    };
    const askTheName = () =>
      setAsk({
      of: "text",
      placeholder: "Your name",
      onSay: (said) => {
        me(said);
        tries += 1;

        /*
         * A question asked before they have even said who they are.
         *
         * "Can I change my order" typed at "what should I call you?" is
         * somebody with a question, not somebody whose name is a sentence,
         * and "which bit of that is your name?" is the chat refusing to
         * hear it. The shop's own answer comes first, and then the name is
         * asked for again, because it is still needed.
         */
        if (looksLikeAQuestion(said) && sayFaq(said, nameAgain)) return;
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

    /*
     * The name question is not asked here.
     *
     * It used to open the conversation, and the call that started it was
     * left behind when the occasion chips were put in front of it. So the
     * chips were set and then overwritten by the name box half a frame
     * later: "What is this one for?" with nowhere to answer it but a text
     * field, which somebody then answered with their name.
     *
     * The chips are gone now, so the first question is the name, and it
     * is asked here, after the things that answer it have been defined.
     */
    const you = startRef.current?.you ?? null;
    if (you && you.name !== "") {
      held.current.name = you.name.split(" ")[0];
      held.current.phone = you.phone;
      held.current.hostel = you.hostel;
      greetKnown(you);
      return;
    }

    /*
     * One box, and say everything or say one thing.
     *
     * The chat used to open with a name, then a number, then a block:
     * three questions and three round trips before anybody had said a
     * word about food, asked of somebody who has not yet been given one
     * reason to believe this beats sending a WhatsApp message.
     *
     * A person who already knows what they want can now type the lot in
     * one message, which is how they would have written it to a human
     * anyway, and the reading layer pulls the name, the number and the
     * block out of it. A person who does not is asked the ordinary
     * questions, one at a time, in the ordinary order, and never has to
     * know the other way existed.
     *
     * Whatever is still missing by the time there is a bill is asked for
     * then, at the till, where every shop asks for it and where somebody
     * has already decided they want the food.
     */
    /* Open rather than narrow, because not everybody who opens this is
       buying: some are asking what time the run is, or whether the shop
       has something. "What are you after" is a question only an order
       answers, and the ones with a question then have to work out that
       they are allowed to ask it. */
    bot(
      "How can I help you today? If it is an order you can say the whole " +
        "thing at once: the food, your name, your number and your block.",
      450
    );
    setAsk({
      of: "text",
      placeholder: "e.g. John Doe, 0800 000 0000, Queen Mary, 2 chicken pie",
      onSay: (said) => huntRef.current?.(said),
    });
  }, [askPhone, bot, me, sayFaq, stopWatching]);

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

  /*
   * Stay above whatever bar the page has, however tall it is.
   *
   * The launcher cleared a fixed hundred and fifty pixels, which is the
   * checkout's bar on a good day. Add the line that says the food is not
   * coming today and the bar grows, and the disc sat on top of the one
   * sentence somebody has to read before they pay. A number in a
   * stylesheet cannot know how tall a sentence is, so it is measured.
   */
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const bar = document.querySelector("[data-actionbar]");
      const tall = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
      root.style.setProperty("--actionbar-h", `${tall}px`);
    };

    read();
    const watching = new ResizeObserver(read);
    const bar = document.querySelector("[data-actionbar]");
    if (bar) watching.observe(bar);
    window.addEventListener("resize", read);

    return () => {
      watching.disconnect();
      window.removeEventListener("resize", read);
      root.style.removeProperty("--actionbar-h");
    };
  });

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
              <Rider />
              <span className="badge">1</span>
            </span>
          </button>
        </div>
      )}

      {open && (
        <div className="sudubot-panel" role="dialog" aria-label="Sudu Bot" ref={panel}>
          <div className="phead">
            <span className="av" aria-hidden>
              <Rider />
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
