"use client";

import GroupLink, { PARTY_CHANGED, readGroup } from "./GroupLink";
import Sheet from "./Sheet";
import { useRouter } from "next/navigation";
import type { Slot } from "@/lib/same-day";
import { nextArrival, type ArrivalRun } from "@/lib/arrival";
import {
  areasIn,
  canGoSameDay,
  carGoesOn,
  dearestArea,
  mixedExtra,
  runCovers,
  withExtra,
  type Area,
  type AreaPair,
} from "@/lib/areas";
import { runCarries } from "@/lib/run-places";
import { dayAfter } from "@/lib/pick-a-day";
import { runDateLabel } from "@/lib/time";
import { ladderFor, pricesByStep, pricesByValue, stepsFor } from "@/lib/areas-shared";
import { feeRidingAlong, type StepFee } from "@/lib/step-fee";
import { feeAcross, type ValueBand } from "@/lib/value-bands";

import Link from "next/link";
import Empty from "@/components/Empty";
import { shelfCount, useShelf } from "@/lib/skincare-cart";
import { useEffect, useRef, useState } from "react";
import Thumb from "./Thumb";
import {
  addPerson,
  clearPeople,
  cartSubtotal,
  countItems,
  toServerLines,
  groupNames,
  removePerson,
  setForName,
  setQty,
  useCart,
  usePeople,
} from "@/lib/cart";
import { bandIndex, feeFor, sameDayFee, type Band } from "@/lib/fees";
import { pairsInCart, type PairDeal } from "@/lib/deals";
import { nearMiss, pickOffer, type LiveOffer } from "@/lib/offers";
import { DAY_NAMES, nextOpenDay, opensOn, weekdayOf } from "@/lib/open-days";
import { naira } from "@/lib/money";
import PayChoice from "./PayChoice";

/** Review and fix the order. Nothing is asked for here except the food. */
export default function CartView({
  runs = [],
  slots = [],
  today = "",
  hostels = [],
  bands = [],
  sameDayBands = [],
  urgentExtra = 0,
  areas = [],
  areaOf = {},
  areaPairs = [],
  valueBandsOf = {},
  stepFeeOf = {},
  openDaysOf = {},
  offers = [],
  pairDeals = [],
  nextRunId = "",
  startGroup = false,
  iceItemId = "",
}: {
  /** The bag of ice block, which the shop puts in and takes out itself.
   *  Empty where the shop has not said which item it is. */
  iceItemId?: string;
  /** What a group could be put on, worked out on the server so the clock and
   *  the prices are the shop's. */
  runs?: ArrivalRun[];
  slots?: Slot[];
  /** Today in Lagos, from the shop's clock, so the group can be put on
   *  whatever is going soonest without asking anybody. */
  today?: string;
  /** The days each restaurant opens, for the few that do not open every
   *  day. Missing means all seven. */
  openDaysOf?: Record<string, string>;
  /** The blocks admin delivers to. Empty means anything typed is allowed. */
  hostels?: string[];
  /** The delivery price list in force, so the saving shown is the real one.
   *  It is what Sangotedo costs; anywhere further adds to every band. */
  bands?: Band[];
  /** The other price list, for a car of its own. Which one applies is not a
   *  choice made here: it is whichever way the food is actually going. */
  sameDayBands?: Band[];
  urgentExtra?: number;
  /** The areas the shop delivers from, and which one each kitchen is in. */
  areas?: Area[];
  areaOf?: Record<string, string>;
  /** What a second stop adds, by the two areas it is between. A cart from
   *  Ajah and Lekki is two shops to park at, and the checkout charges for
   *  it, so the cart has to quote it too. */
  areaPairs?: AreaPair[];
  /** The kitchens that price by what the shopping comes to. */
  valueBandsOf?: Record<string, ValueBand[]>;
  /** The kitchens priced by the cool box, so the cart quotes the
   *  same number the checkout and the till do. */
  stepFeeOf?: Record<string, StepFee>;
  /** The offers on today, so the cart can say when it is one thing away from
   *  one rather than leaving somebody to wonder why it is not free. */
  offers?: LiveOffer[];
  /** Buy one get one free, as the counters are running it today. */
  pairDeals?: PairDeal[];
  /** The run a cart prices against until they pick one at the checkout. */
  nextRunId?: string;
  /** They came here to start a group, so the form is already open. */
  startGroup?: boolean;
}) {
  // In somebody's group already, ordering for friends as well is two group
  // ideas at once and nobody untangles them. The bar at the top says which
  // one is happening.
  const [inParty, setInParty] = useState(false);
  useEffect(() => {
    // A group can start or end from the page somebody is standing on, so this
    // listens rather than reading once and believing it for ever.
    const read = () => setInParty(readGroup() !== "");
    read();
    window.addEventListener(PARTY_CHANGED, read);
    return () => window.removeEventListener(PARTY_CHANGED, read);
  }, []);

  const cart = useCart();
  // Theirs too, and waiting, even though each checks out on its own run.
  // Every counter, not only skincare: the bag counts them all, so a page
  // that knows about one of them is the same wrong badge as before.
  const waitingSkincare = shelfCount(useShelf("skincare"));
  const waitingPharmacy = shelfCount(useShelf("pharmacy"));
  const { people } = usePeople();
  const [newPerson, setNewPerson] = useState("");
  /*
   * Nothing is empty until the browser has looked.
   *
   * The cart lives in this browser, and the page is drawn on the server
   * where there is no such thing: the first paint of every cart and every
   * checkout is an empty one, and it stays on the screen until the
   * JavaScript lands and hydration finishes. On a phone on campus wifi
   * that is a second or two of "your cart is empty" over a cart with food
   * in it, in front of somebody who has just tapped Checkout.
   *
   * So the empty answer waits for the browser to have read its own
   * storage. Until then the page says nothing rather than something
   * false.
   */
  const [looked, setLooked] = useState(false);
  useEffect(() => setLooked(true), []);

  const router = useRouter();
  const [group, setGroup] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState("");
  // Finishing asks everything at once. Saying you are done and then being
  // sent to a waiting room that wants a phone number is the same question
  // asked twice.
  const [asking, setAsking] = useState(false);
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [note, setNote] = useState("");
  // A group order never passes a checkout screen, so this is the only place
  // it gets asked. Without it everybody in a car was put down as a transfer.
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  // Everybody else's food, so this page shows the whole car rather than only
  // the part of it this person is holding.
  const [eachNow, setEachNow] = useState(0);
  // Where this person stands: not finished, finished, or finished and then
  // changed their mind. The button has to say which.
  const [mine, setMine] = useState<{ finalised: boolean; changed: boolean } | null>(null);
  // What the cart looked like when they finalised, kept here so a change is
  // visible the instant they make it. The server learns a second or two
  // later and polls a while after that, which is far too slow for a button
  // sitting under somebody's thumb.
  const [finalisedAs, setFinalisedAs] = useState("");

  useEffect(() => {
    if (group === "") return;
    try {
      setFinalisedAs(localStorage.getItem(`sudu_final_${group}`) ?? "");
    } catch {
      /* Without storage the server's answer still arrives, just later. */
    }
  }, [group]);
  const [others, setOthers] = useState<
    {
      isMine?: boolean;
      finalised?: boolean;
      changed?: boolean;
      name: string;
      items: number;
      food: number;
      summary: string;
      ready: boolean;
      lines: {
        name: string;
        restaurant: string;
        imageUrl: string;
        choices: string[];
        unitPrice: number;
        qty: number;
      }[];
    }[]
  >([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "null");
      if (saved?.phone) setPhone((current) => current || saved.phone);
      if (saved?.hostel) setHostel((current) => current || saved.hostel);
      // How they paid last time, so updating their food does not quietly put
      // somebody who asked for a card link back on a bank transfer.
      if (saved?.method === "card" || saved?.method === "transfer") setMethod(saved.method);
    } catch {
      /* Nothing saved, or storage is blocked. They type it. */
    }
  }, []);

  useEffect(() => {
    const read = () => setGroup(readGroup());
    read();
    window.addEventListener(PARTY_CHANGED, read);
    return () => window.removeEventListener(PARTY_CHANGED, read);
  }, []);

  /*
   * Taking something out should not leave you standing in the footer.
   *
   * The page gets shorter by the height of the thing removed, and the
   * browser keeps the scroll where it was, which on a cart of two is the
   * bottom of the page: the last thing somebody saw after tapping Remove
   * was our phone number and the list of services. The cart is above them
   * and they have to scroll up to find out what they have left.
   *
   * Only when the page can no longer show where they were, which is what
   * being at the very bottom after a removal means. Somebody taking one
   * line out of a long cart keeps their place, because their place is
   * still there.
   */
  const was = useRef(cart.length);
  useEffect(() => {
    const before = was.current;
    was.current = cart.length;
    if (cart.length >= before) return;
    const id = window.requestAnimationFrame(() => {
      const bottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 140;
      if (!bottom && cart.length > 0) return;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [cart.length]);

  useEffect(() => {
    if (group === "") {
      setOthers([]);
      return;
    }
    let alive = true;
    const look = () =>
      fetch(`/api/party/${group}`)
        .then((response) => response.json())
        .then(
          (data: {
            members?: typeof others;
            eachNow?: number;
            mine?: {
              phone?: string;
              hostel?: string;
              note?: string;
              paymentMethod?: string;
            } | null;
          }) => {
          if (alive) setEachNow(data.eachNow ?? 0);
          // What the seat already holds wins over what this browser
          // remembers, because it is what the others are waiting on and what
          // the close will use. Reopening the sheet then shows the answers
          // they gave rather than asking again.
          if (alive && data.mine) {
            if (data.mine.phone) setPhone(data.mine.phone);
            if (data.mine.hostel) setHostel(data.mine.hostel);
            if (data.mine.note) setNote(data.mine.note);
            if (data.mine.paymentMethod === "card" || data.mine.paymentMethod === "transfer")
              setMethod(data.mine.paymentMethod);
          }
          const me = (data.members ?? []).find((one) => one.isMine);
          if (alive) setMine(me ? { finalised: !!me.finalised, changed: !!me.changed } : null);
          // Everybody but the reader. Their own food is the section above,
          // where they can change it; listing it twice, once unchangeable,
          // reads as somebody else having ordered the same thing.
          if (alive) setOthers((data.members ?? []).filter((one) => !one.isMine));
          }
        )
        .catch(() => {
          /* Offline. Their own cart still works, which is the point of it. */
        });
    look();
    const timer = setInterval(look, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [group]);

  // In a group there is no checkout. The food is settled here and priced when
  // the group closes, because until then nobody knows what delivery costs.
  const finalise = async () => {
    setProblem("");
    setSending(true);
    try {
      const response = await fetch(`/api/party/${group}/finalise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: toServerLines(cart),
          phone,
          hostel,
          note,
          paymentMethod: method,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setProblem(data.error ?? "Could not save that.");
        return;
      }
      // What was agreed to, so a later change shows up at once.
      try {
        localStorage.setItem(`sudu_final_${group}`, JSON.stringify(toServerLines(cart)));
        setFinalisedAs(JSON.stringify(toServerLines(cart)));
      } catch {
        /* The server still works it out from the timestamps. */
      }
      setMine({ finalised: true, changed: false });

      // Worth remembering: the same number and block are wanted next time.
      try {
        const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "{}");
        localStorage.setItem(
          "sudu_me_v1",
          JSON.stringify({ ...saved, phone, hostel, method })
        );
      } catch {
        /* Not worth failing on. */
      }
      // The cart stays. Putting food in a group is not the end of ordering:
      // the group is open for another quarter of an hour and adding a drink
      // means opening this cart again and finalising again, which cannot be
      // done from an empty one. It empties when the group closes and the
      // order is real.
      router.push(`/g/${group}`);
    } catch {
      setProblem("Could not save that.");
    } finally {
      setSending(false);
    }
  };

  // The rest of the car. Needed in two places: under somebody's own
  // food, and instead of it when they have none, because an empty cart
  // in a group is still a seat in a car full of other people's dinner.
  const theCar = (
    <>
      {group !== "" &&
        others.map((one) => (
          <section key={one.name} className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="ticket text-muted">
                {one.name}
              </h2>
              <span
                className={`text-xs font-semibold ${
                  one.ready ? "text-mint" : "text-muted"
                }`}
              >
                {one.ready ? "Ready" : "Still choosing"}
              </span>
            </div>

            {one.lines.length === 0 ? (
              <p className="card text-sm text-muted">Nothing yet.</p>
            ) : (
              one.lines.map((line, index) => (
                // The same card as their own food, because it is the same
                // kind of thing. No controls and no links: it is theirs, and
                // a minus button on somebody else's dinner is not a feature.
                <div key={`${one.name}-${index}`} className="card flex gap-3">
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl">
                    <Thumb src={line.imageUrl} name={line.name} rounded="rounded-none" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {line.qty > 1 && <span className="text-brand">{line.qty}× </span>}
                      {line.name}
                    </p>
                    <p className="text-sm text-muted">
                      {line.restaurant}
                      {line.choices.length > 0 && ` · ${line.choices.join(", ")}`}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-extrabold">
                        {naira(line.unitPrice * line.qty)}
                      </span>
                      {/* The same control, switched off. Leaving it out made
                          the two sections read as different kinds of thing;
                          greyed, it says plainly that this is somebody else's
                          to change and yours is above. */}
                      <span
                        aria-hidden="true"
                        className="flex items-center gap-1 rounded-full border border-black/10 p-1 opacity-40"
                      >
                        <span className="grid size-8 place-items-center rounded-full text-lg leading-none">
                          −
                        </span>
                        <span className="w-5 text-center font-bold">{line.qty}</span>
                        <span className="grid size-8 place-items-center rounded-full text-lg leading-none">
                          +
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        ))}

      {group !== "" && others.length > 0 && (
        <div className="rounded-2xl bg-brand-tint px-4 py-3">
          {eachNow > 0 && (
            <p className="text-sm font-extrabold text-brand-dark">
              Delivery right now: about {naira(eachNow)} each
            </p>
          )}
          <p className="mt-0.5 text-xs text-ink/70">
            Everybody pays for their own food. The delivery is one fee for the whole
            car, split evenly when the group closes, so it moves as people add food
            and as more of you join.
          </p>
        </div>
      )}

    </>
  );

  if (cart.length === 0 && !looked) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 py-10" aria-busy>
        <div className="h-24 animate-pulse rounded-2xl bg-black/[0.05]" />
        <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04]" />
      </div>
    );
  }

  if (cart.length === 0) {
    // In a group this cart is yours alone: everybody picks their own food and
    // pays for their own. Saying so here is the difference between an empty
    // cart that makes sense and one that looks like the group lost something.
    if (group !== "") {
      return (
        <div className="mx-auto max-w-3xl space-y-5 pb-10">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-display text-[min(16vw,5.5rem)] font-black uppercase leading-[0.88] sm:text-[clamp(3.5rem,7vw,5.5rem)]">
              Your cart
            </h1>
            <Link href={`/g/${group}`} className="text-sm font-bold text-brand">
              See the group
            </Link>
          </div>

          <Empty icon="cart" title="Nothing in yours yet" href="/" action="Browse the menu">
            Everybody in the group picks their own food and pays for their own. This
            is yours, and it goes in the same car as theirs.
          </Empty>

          {/* Everybody else's food stays on screen. Emptying a cart does not
              take somebody out of the group, and a page that forgets the car
              the moment their own part of it is empty reads as having lost
              the group. */}
          {theCar}
        </div>
      );
    }

    /*
     * Empty of food is not empty.
     *
     * Skincare is its own order on its own run, so it is kept out of this
     * cart on purpose. But the bag counts both, and a page flatly saying
     * "your cart is empty" over a badge reading 1 reads as the shop having
     * lost something somebody picked. It is still their stuff and it is
     * still waiting; it just checks out somewhere else.
     */
    const waiting =
      waitingSkincare > 0
        ? { count: waitingSkincare, what: "skincare", href: "/skincare/checkout" }
        : waitingPharmacy > 0
          ? { count: waitingPharmacy, what: "pharmacy", href: "/pharmacy/checkout" }
          : null;

    if (waiting) {
      return (
        <Empty
          icon="cart"
          title="Nothing from the kitchens yet"
          href={waiting.href}
          action={`Check out the ${waiting.what}`}
        >
          {waiting.count === 1
            ? `You have one ${waiting.what} item waiting. It is its own order on its own day, so it does not travel with food, and it is still here when you come back for some.`
            : `You have ${waiting.count} ${waiting.what} items waiting. They are their own order on their own run, so they do not travel with food, and they are still here when you come back for some.`}
        </Empty>
      );
    }

    return (
      <Empty icon="cart" title="Your cart is empty" href="/" action="Browse the menu">
        Pick a few things and they gather here, ready for the next delivery.
      </Empty>
    );
  }

  // Changed since they said they were done, as this browser can see it now
  // rather than as the server will see it shortly.
  const movedSinceFinalising =
    (mine?.finalised ?? false) &&
    finalisedAs !== "" &&
    JSON.stringify(toServerLines(cart)) !== finalisedAs;

  // An offer this cart nearly has. From the inside, a qualifying dish with
  // something else beside it looks like the offer simply not working, so it
  // says which is which and leaves the choice to them.
  const missed = nearMiss(
    offers,
    cart.map((line) => ({
      itemId: line.itemId,
      restaurantId: line.restaurantId,
      name: line.name,
      choices: line.choices,
    })),
    { batchId: nextRunId, deliverAt: null, returning: false }
  );

  // What delivery on this cart actually costs, promotions and all. Working
  // it off the ladder alone said four thousand over a cart that an offer
  // prices at two, which is the shop quoting a number it is not going to
  // charge. The same function decides it here, at the checkout and on the
  // server, so all three agree.
  const promotion = pickOffer(offers, {
    restaurantIds: [...new Set(cart.map((line) => line.restaurantId))],
    itemIds: cart.map((line) => line.itemId),
    lineChoices: cart.map((line) => line.choices),
    items: countItems(cart),
    batchId: nextRunId,
    deliverAt: null,
    returning: false,
  });
  const kitchensIn = [...new Set(cart.map((line) => line.restaurantId))];
  const cartAreas = areasIn(areas, kitchensIn, areaOf);
  const dearest = dearestArea(areas, kitchensIn, areaOf);
  /*
   * What a second stop adds.
   *
   * The checkout charges for it and the cart was not quoting it, so a
   * basket from Ajah and Lekki said six and a half on one screen and seven
   * and a half on the next. Every area after the first is another shop to
   * find, park at and queue in, whichever two they are.
   */
  const secondStop = mixedExtra(cartAreas, areaPairs);
  // Priced by the furthest kitchen in the cart, the same rule the checkout
  // quotes and the server charges by: one car fetches all of it, so the trip
  // is as long as its longest leg.
  const ladder = withExtra(bands, dearest.runExtra + secondStop);
  const byValue = ladderFor(kitchensIn, valueBandsOf);
  // Two errands, two fees: the market half by what the shopping comes to,
  // the restaurant half by how much of the car it fills.
  const marketHalf = cart.filter((line) => pricesByValue(line.restaurantId, valueBandsOf));
  const restHalf = cart.filter((line) => !pricesByValue(line.restaurantId, valueBandsOf));
  // What rides along on a trip the car was making anyway: out of the
  // container count, and the trip is the dearer of the two rather than the
  // sum. The cart says what the checkout will say.
  const steps = stepsFor(cart.map((line) => line.itemId), stepFeeOf);
  const ridingHalf = cart.filter((line) => pricesByStep(line.itemId, stepFeeOf));
  const drivingHalf = cart.filter((line) => !pricesByStep(line.itemId, stepFeeOf));
  const ridingCount = ridingHalf.reduce((all, line) => all + line.qty, 0);
  const ridesAlong = (otherFee: number) =>
    feeRidingAlong({ stepCount: ridingCount, steps, otherFee });
  // Which way the food is actually going, by the same rule as everywhere
  // else. With no run inside the days people can order ahead, the soonest
  // thing is a car of its own, and quoting the run ladder here had the cart
  // promising four thousand over a checkout that was going to charge six and
  // a half. The cart says what the checkout will say.
  /*
   * Something in the cart that is shut on the day this would go.
   *
   * The checkout says this properly, with the runs that work; here it is a
   * warning, because the cart is where somebody still has their hand on the
   * thing they would take out. Named against the soonest arrival, which is
   * the day the cart is quoting for.
   */
  /*
   * Only what could really carry this cart.
   *
   * The soonest arrival used to be worked out against every run on the
   * list and every window in the day, neither of which knows where the
   * food is. A cart from Ajah was quoted tonight's Sangotedo run, which
   * does not go that way, and a cart from Lekki was quoted a car of its
   * own on a day no car goes to Lekki. The checkout has always asked these
   * three questions, so the cart asks them in the same words: does the run
   * reach where this food is, does it stop at these counters, and is
   * everything open on the day it goes.
   */
  const usableRuns = runs.filter(
    (one) =>
      runCovers(one.areas ?? "", cartAreas) &&
      runCarries(one.onlyPlaces ?? "", kitchensIn) &&
      cart.every((line) => opensOn(openDaysOf[line.restaurantId], one.runDate))
  );
  const carDays = canGoSameDay(cartAreas)
    ? slots.filter((one) => carGoesOn(cartAreas, one.date, opensOn))
    : [];
  const going = nextArrival(usableRuns, carDays, today);
  const onItsOwn = going !== null && !going.onARun;

  // The day the cart is quoting for: the run it would go on, or today when
  // the soonest thing is a car of its own.
  const goingOn =
    (going?.runId ? runs.find((one) => one.id === going.runId)?.runDate : "") || today;
  const shutLines = cart.filter(
    (line) => !opensOn(openDaysOf[line.restaurantId], goingOn)
  );
  const shutNames = [...new Set(shutLines.map((line) => line.restaurantName))];
  const shutSaid =
    shutNames.length === 1
      ? shutNames[0]
      : `${shutNames.slice(0, -1).join(", ")} and ${shutNames[shutNames.length - 1]}`;
  const shutAgain =
    shutLines.length > 0
      ? nextOpenDay(openDaysOf[shutLines[0].restaurantId], goingOn)
      : "";
  const shutRest = [...new Set(
    cart
      .filter((line) => opensOn(openDaysOf[line.restaurantId], goingOn))
      .map((line) => line.restaurantName)
  )];
  /*
   * Food in the cart that a car of its own cannot fetch.
   *
   * A far area rides a run or it does not come: three hours is the whole
   * promise of a car of its own, and an hour each way to Lekki eats it
   * before the kitchen has started. The checkout has always said so and
   * names the date, but by then the food is chosen and the sentence reads
   * as small print about somebody else's order. Somebody put a Jay's Diner
   * burger in a cart, was given a date six days out, and still expected it
   * that afternoon.
   *
   * So it is said here too, where the thing they would take out is on the
   * screen in front of them with a button beside it, and it names the
   * counter rather than the part of Lagos it happens to sit in.
   */
  const runOnlyLines = cart.filter((line) => {
    const area = areas.find((one) => one.id === (areaOf[line.restaurantId] ?? ""));
    return area !== undefined && !area.sameDay;
  });
  const runOnlyNames = [...new Set(runOnlyLines.map((line) => line.restaurantName))];
  /** A list said the way it is read: "A", "A and B", "A, B and C". */
  const listed = (words: string[], joiner = "and") =>
    words.length <= 1
      ? (words[0] ?? "")
      : `${words.slice(0, -1).join(", ")} ${joiner} ${words[words.length - 1]}`;
  const runOnlySaid = listed(runOnlyNames);
  /*
   * Which shop is in which part of Lagos, said one by one.
   *
   * This used to take the area off the first of them and put every name in
   * it, so a cart with The Place and Yin Yang Express in it told somebody
   * that Yin Yang Express is in Ajah. It is in Lekki. A sentence the
   * customer can see is wrong is worse than no sentence: it is the shop
   * being confidently wrong about its own counters.
   */
  const areaNameOf = (restaurantId: string) =>
    areas.find((one) => one.id === (areaOf[restaurantId] ?? ""))?.name ?? "";
  const runOnlyWhere = [
    ...new Map(
      runOnlyLines.map((line) => [
        line.restaurantName,
        areaNameOf(line.restaurantId),
      ])
    ).entries(),
  ];
  const runOnlyWhereSaid = listed(
    runOnlyWhere.map(([shop, where]) => (where ? `${shop} is in ${where}` : shop))
  );
  const runOnlyAreasSaid = listed(
    [...new Set(runOnlyWhere.map(([, where]) => where).filter(Boolean))],
    "or"
  );
  /*
   * The day we are next going there, said the way a day is said.
   *
   * "On a run" is our word for it and means nothing to somebody buying
   * lunch. The day does: today, tomorrow, or the date. Empty where nothing
   * is going at all, which is its own sentence.
   */
  const goingWord =
    going === null
      ? ""
      : (going.date ?? "") === today
        ? "today"
        : (going.date ?? "") === dayAfter(today)
          ? "tomorrow"
          : (going.date ?? "") !== ""
            ? `on ${runDateLabel(going.date ?? "")}`
            : "";
  const runOnlyArea =
    runOnlyLines.length > 0
      ? areas.find((one) => one.id === (areaOf[runOnlyLines[0].restaurantId] ?? ""))?.name ?? ""
      : "";

  const soonSlot = onItsOwn ? slots.find((one) => one.at === going.at) ?? null : null;
  // A car of its own is priced the same way the checkout prices one: the
  // same day ladder, lifted by what the furthest area adds to a car and by
  // the second stop where there is one.
  const carFee =
    soonSlot && sameDayBands.length > 0
      ? sameDayFee(
          countItems(cart),
          soonSlot.urgent,
          withExtra(sameDayBands, dearest.sameDayExtra + secondStop),
          urgentExtra
        )
      : 0;

  // What this run has knocked off delivery, if anything. A flash drop
  // belongs to a run rather than to the shop, so it is read off the one the
  // food is actually going on. The cart used to ignore it and quote the full
  // ladder over a checkout about to charge less, which is the kinder
  // direction to be wrong in and still wrong.
  const flash = runs.find((one) => one.id === going?.runId)?.flashFee ?? null;

  // The same order the checkout decides in, and the same order the server
  // charges in. A car of its own is priced by the same day ladder whatever
  // is in it: asking the value ladder first had a cart with market shopping
  // going on a picked time quoting a fee nobody was going to be charged.
  const alone = promotion
    ? promotion.fee
    : carFee > 0
      ? carFee
    : byValue.length > 0
      ? feeAcross({
          marketFood: cartSubtotal(marketHalf),
          restaurantFee: restHalf.length === 0 ? 0 : feeFor(countItems(restHalf), flash, ladder),
          bands: byValue,
        })
    : ladder.length > 0
      ? ridesAlong(
          feeFor(
            ridingHalf.length === 0 ? countItems(cart) : countItems(drivingHalf),
            flash,
            ladder
          )
        )
      : 0;

  /*
   * How full the car is, and what else fits in the same fee.
   *
   * The app has drawn this at the top of its cart for a while and the
   * website never had it: the one number people are deciding about sat at
   * the bottom of the page under the food, as a line in a total. Here it
   * is a meter, and it answers the question that actually changes what
   * somebody buys, which is not "what does delivery cost" but "what else
   * can I put in it for nothing".
   *
   * Only where the fee really is the container ladder. An offer prices
   * delivery outright, shopping priced by what it comes to has no
   * containers to count, and a car of its own is a different ladder: each
   * of those leaves the meter out rather than drawing a number that is
   * wrong.
   */
  const items = countItems(cart);
  const onTheLadder =
    !promotion && carFee === 0 && byValue.length === 0 && ladder.length > 0;
  const rung = onTheLadder ? bandIndex(ladder, items) : -1;
  const cap = rung >= 0 ? (ladder[rung]?.maxItems ?? null) : null;
  const tier = cap === null ? "" : `up to ${cap} item${cap === 1 ? "" : "s"}`;
  const room = cap === null ? null : cap - items;
  const meterSaid =
    room === null
      ? promotion
        ? promotion.offer.note || "Delivery is on offer for this cart."
        : `Delivery on this cart is ${naira(alone)}.`
      : room > 0
        ? `${room} more item${room === 1 ? "" : "s"} ${
            room === 1 ? "fits" : "fit"
          } in ${naira(alone)}, from any kitchen.`
        : `That is as much as fits at ${naira(alone)}.`;

  /*
   * Buy one get one free, worked out here as well as on the server.
   *
   * The same rule and the same arithmetic, so the line in this basket is
   * the line on the bill: a cheaper pizza free for every dearer one, at
   * the size the counter put the deal on.
   */
  const paired = pairsInCart(cart, pairDeals);

  const names = people.map((p) => p.name);
  const groups = groupNames(cart, people)
    .map((person) => ({
      person,
      lines: cart.filter((l) => l.forName === person),
    }))
    .filter((group) => group.lines.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-36">
      <div className="flex items-baseline justify-between gap-3">
        {/* Half a phone screen of the word CART, over a page whose whole
            job is the four lines under it. The desk keeps the big one:
            there the page is wide and the heading is the only thing
            holding the top of it together. */}
        <h1 className="font-display text-[min(9vw,2.25rem)] font-black uppercase leading-[0.95] sm:text-[clamp(3.5rem,7vw,5.5rem)]">
          Your cart
        </h1>
        {group !== "" && (
          <Link href={`/g/${group}`} className="text-sm font-bold text-brand">
            See the group
          </Link>
        )}
      </div>

      {/* The meter, first, because the fee is the one number people are
          deciding about and it is the only thing on this page that says
          what another item would cost: nothing, usually. */}
      <div className="rounded-2xl bg-ink px-4 py-3.5 text-shell">
        <div className="flex items-baseline justify-between gap-3">
          <span className="ticket text-volt">Delivery for this order</span>
          {tier !== "" && (
            <span className="ticket text-shell/60">{tier}</span>
          )}
        </div>
        {/* A bar per container, and only where there are few enough to
            count at a glance. Fourteen little bars is a chart; four is a
            glance. */}
        {cap !== null && cap <= 14 && (
          <div className="mt-2.5 flex gap-1">
            {Array.from({ length: cap }, (_, at) => (
              <span
                key={at}
                className={`h-2 flex-1 rounded-full ${
                  at < items ? "bg-brand" : "bg-white/15"
                }`}
              />
            ))}
          </div>
        )}
        <p className="mt-2.5 text-sm leading-[1.45] text-shell/90">{meterSaid}</p>
      </div>

      {missed && (
        <div className="rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3">
          <p className="text-sm text-ink/85">
            <span className="font-extrabold text-brand-dark">
              {missed.fee === 0 ? "Free delivery" : `${naira(missed.fee)} delivery`}
            </span>{" "}
            is on for part of this cart.{" "}
            {/* Naming the two things in the way beats naming them when there
                are six: past that it is a list nobody reads, and the shorter
                truth is which food the offer is actually for. */}
            {missed.blocking.length <= 2
              ? `${missed.blocking.join(" and ")} ${
                  missed.blocking.length === 1 ? "is" : "are"
                } not in it, so it does not apply.`
              : missed.qualifying.length <= 2
                ? `Only the ${missed.qualifying.join(" and ")} ${
                    missed.qualifying.length === 1 ? "is" : "are"
                  } in it, so everything else would have to come out.`
                : `Only ${missed.qualifying.length} of your items are in it, and the other ${
                    missed.blocking.length
                  } would have to come out.`}
          </p>
          <p className="mt-1 text-xs text-ink/70">
            Keeping them is often the better deal anyway: the usual fee covers
            the lot, and this only pays off if the rest was going another time.
          </p>
        </div>
      )}





      {group !== "" && (
        <h2 className="ticket text-muted">
          Yours
        </h2>
      )}

      {/*
          Where the food is, said as a day rather than as a word of ours.

          This used to read "The Place and Yin Yang Express are in Ajah, so
          they come on a run rather than today", which is the shop
          explaining its own timetable to somebody who only wants to know
          when their food turns up. A run is our word. "We are not going to
          Ajah today, we are tomorrow" is the same fact in theirs, and the
          day is a day they can plan around.

          Said while the thing is still on this screen with a button next
          to it, because the surprise people hit at checkout is the one
          they hit after the food is already chosen.
       */}
      {runOnlyLines.length > 0 && goingWord !== "today" && (
        <div className="rounded-2xl border border-brand/30 bg-brand-tint px-4 py-3">
          <p className="text-sm text-brand-dark">
            <span className="font-bold">
              We are not going to {runOnlyAreasSaid || runOnlyArea} today
              {goingWord !== "" ? `, we are going ${goingWord}` : ""}.
            </span>{" "}
            {runOnlyWhereSaid || runOnlySaid}
            {runOnlyLines.length < cart.length
              ? ", and the whole order comes together, so all of it comes then. Take those out and the rest can come sooner."
              : goingWord !== ""
                ? ", so that is when it comes."
                : ", and we do not have the next day for it yet. Message us and we will say."}
          </p>
        </div>
      )}

      {/* Shut on the day this cart is quoting for.
          The checkout says it properly, with the runs that do work. Here it
          is a warning, because the cart is the screen where somebody still
          has their hand on the thing they would take out. */}
      {shutLines.length > 0 && (
        <div className="rounded-2xl border border-brand/30 bg-brand-tint px-4 py-3">
          <p className="text-sm text-brand-dark">
            <span className="font-bold">
              {shutSaid} {shutNames.length === 1 ? "is" : "are"} closed on{" "}
              {DAY_NAMES[weekdayOf(goingOn)]}s.
            </span>{" "}
            {shutRest.length > 0
              ? `Everything else is fine for ${goingOn === today ? "today" : DAY_NAMES[weekdayOf(goingOn)]}. `
              : ""}
            {shutAgain && shutAgain !== goingOn
              ? `${shutNames.length === 1 ? "It opens" : "They open"} again on ${DAY_NAMES[weekdayOf(shutAgain)]}, so order everything then, or take ${shutNames.length === 1 ? "it" : "them"} out and the rest goes sooner.`
              : ""}
          </p>
        </div>
      )}

      {/* Names carried in from before they joined. In a group everybody
          orders their own food on their own phone, so the names do nothing
          here, and a list you cannot get out of is worse than one that was
          never offered. */}
      {inParty && people.length > 0 && (
        <div className="rounded-2xl border border-black/10 bg-paper px-4 py-3">
          <p className="text-sm text-ink/80">
            You had {people.map((person) => person.name).join(", ")} on this order
            from before. In a group everybody orders their own food, so{" "}
            {people.length === 1 ? "that name is" : "those names are"} not used.
          </p>
          <button
            type="button"
            onClick={clearPeople}
            className="mt-2 text-sm font-bold text-brand"
          >
            {people.length === 1 ? "Remove them" : "Remove them all"}
          </button>
        </div>
      )}

      {groups.map((section) => (
        <section key={section.person || "me"} className="space-y-3">
          {people.length > 0 && (
            <h2 className="ticket text-muted">{section.person || "You"}</h2>
          )}

          {section.lines.map((line) => (
            /* Tighter than it was. A hundred and twenty pixels of card for
               one pie, with the price on a row of its own in display type
               and Remove on another below it, meant two items filled a
               phone. The app says the same four things in half the height. */
            <div key={line.key} className="card flex gap-3 p-3">
              {/* The picture and the name go back to the product, which is
                  where you go to check what is in it or change the choices. */}
              <Link
                href={`/p/${line.itemId}?line=${encodeURIComponent(line.key)}`}
                aria-label={`Open ${line.name}`}
                className="size-16 shrink-0 overflow-hidden rounded-xl"
              >
                <Thumb src={line.imageUrl} name={line.name} rounded="rounded-none" />
              </Link>

              <div className="min-w-0 flex-1">
                {/* The count lives beside the name too: one card holding three
                    of something read as one item in the cart. */}
                <p className="truncate font-bold">
                  {line.qty > 1 && <span className="text-brand">{line.qty}× </span>}
                  {line.itemId === iceItemId ? (
                    line.name
                  ) : (
                    <Link
                      href={`/p/${line.itemId}?line=${encodeURIComponent(line.key)}`}
                      className="hover:underline"
                    >
                      {line.name}
                    </Link>
                  )}
                </p>
                <p className="text-sm text-muted">
                  {/* No counter on the bag of ice. It is bought beside
                      whichever of them the ice cream came from, and a cart
                      holding a Domino's dessert reading "Cold Stone
                      Creamery" under the ice says the car is going
                      somewhere it is not. */}
                  {line.itemId === iceItemId ? (
                    <span className="font-semibold">Added by us</span>
                  ) : (
                  <Link
                    href={`/r/${line.restaurantId}`}
                    className="font-semibold hover:text-ink hover:underline"
                  >
                    {line.restaurantName}
                  </Link>
                  )}
                  {line.choices.length > 0 && ` · ${line.choices.join(", ")}`}
                  {people.length > 0 && !inParty && ` · for ${line.forName || "you"}`}
                  {" · "}
                  {/* Beside the counter rather than under it in display
                      type. It is a price on a line in a cart, not the
                      headline of the page. */}
                  <span className="font-bold text-ink">
                    {naira(line.unitPrice * line.qty)}
                  </span>
                </p>

                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {/* Taking something out had no button of its own: the only
                      way was to press minus until the row went, and somebody
                      who did not know that reported that the cart would not
                      let her delete anything. It shares this row with the
                      stepper rather than taking one of its own. */}
                  {line.itemId !== iceItemId ? (
                    <button
                      type="button"
                      onClick={() => setQty(line.key, 0)}
                      className="text-xs font-semibold text-muted underline hover:text-ink"
                      aria-label={`Remove ${line.name} from the cart`}
                    >
                      Remove
                    </button>
                  ) : (
                    <span />
                  )}
                  {/* The bag of ice block is not somebody's to change. It
                      arrived because the cart has ice cream in it and it
                      leaves when the ice cream does, so a stepper and a
                      Remove on it are two controls that undo themselves
                      the moment they are pressed. */}
                  {line.itemId === iceItemId ? (
                    <span className="shrink-0 text-xs font-semibold text-muted">
                      Goes with the ice cream
                    </span>
                  ) : (
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-ink p-0.5 text-white">
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.qty - 1)}
                      className="grid size-8 place-items-center rounded-full text-lg leading-none"
                      aria-label={`One less ${line.name}`}
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-mono font-semibold">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.qty + 1)}
                      className="grid size-8 place-items-center rounded-full bg-brand text-lg leading-none"
                      aria-label={`One more ${line.name}`}
                    >
                      +
                    </button>
                  </span>
                  )}
                </div>

                {people.length > 0 && !inParty && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted">Whose?</span>
                    {["", ...names].map((person) => (
                      <button
                        key={person || "me"}
                        type="button"
                        onClick={() => setForName(line.key, person)}
                        className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                          line.forName === person
                            ? "bg-brand text-white"
                            : "bg-black/[0.06] text-ink/70"
                        }`}
                      >
                        {person || "Me"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      {/*
          One line, at the bottom of the food, where the app puts it.

          This was a card of its own headed "Add something else" with a chip
          for every counter in the shop under it: a heading, a wall of
          twenty names and a decision, all to say the thing somebody already
          knows how to do. The one fact worth saying there is not which
          counters exist, it is that another kitchen rides in the same car
          for the same fee, which is what the meter at the top is about and
          what this says in its own words.
       */}
      <Link
        href="/products"
        className="card flex min-h-[56px] items-center gap-2.5 px-4 py-3 font-bold text-brand transition hover:border-ink"
      >
        <span aria-hidden className="text-2xl leading-none">
          +
        </span>
        Add from another kitchen, same delivery
      </Link>

      {theCar}

      {/*
          What it comes to, written out.

          The cart never said this. It had the food's subtotal on the bar at
          the bottom and the delivery fee nowhere at all, so the first time
          anybody saw what they were actually paying was the checkout. The
          app has shown all three lines since it was built, and it is the
          reason its cart reads as finished and this one read as a list.

          Not in a group: there the fee is split when the car closes and a
          total here would be a number nobody is going to be charged.
       */}
      {group === "" && (
        <section className="card space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold">{naira(cartSubtotal(cart))}</span>
          </div>
          {paired.off > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-mint">{paired.said}</span>
              <span className="font-semibold text-mint">
                −{naira(paired.off)}
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted">
              Delivery{tier === "" ? "" : ` (${tier})`}
            </span>
            <span className="font-semibold">{naira(alone)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t-[1.5px] border-rule pt-2">
            <span className="font-bold">Total</span>
            <span className="font-display text-[28px] font-black leading-none">
              {naira(cartSubtotal(cart) - paired.off + alone)}
            </span>
          </div>
        </section>
      )}

      {/*
          Both of these come after the food now, where the app has them.

          They were the first two cards on the page: a tinted card about
          splitting the fee, then a card about putting names to it, and
          only then the thing somebody came to look at. Two screens of
          offers before your own dinner is the whole of why this page felt
          like more work than the app's, which goes meter, food, what it
          comes to, and only then asks about friends.

          Neither is buried. Somebody who wants to share a run looks for it
          once they know what they are sharing, which is exactly here.
       */}
      {/* Before anything else, because it costs nothing to send and it is what
          makes the delivery cheaper for all of them. In a group already, the
          bar at the top says so and this would only repeat it. */}
      {/* The figures live on the Start card rather than beside it: "split one
          delivery" is an idea, two real numbers are an argument, and making
          the point twice in a row made it weaker rather than louder. */}
      <GroupLink
        openNow={startGroup}
        runs={runs}
        slots={slots}
        today={today}
        alone={alone}
        // An offer with a floor under it does not split evenly: five people
        // at a thousand each is five thousand, not two. Promising a split
        // the offer will not give is worse than promising nothing.
        splits={promotion ? promotion.offer.minEach === 0 : true}
      />

      {!inParty && (
      /*
       * Folded away until somebody wants it.
       *
       * Putting names to the food is for one cart in twenty, and it was a
       * full card with a heading, a paragraph and a text box standing
       * between the food and the total on every other one. The question is
       * worth asking and it is not worth a card, so it is one line that
       * opens into the same thing. Open from the start once there are
       * names in it, because then it is the cart rather than an offer.
       */
      <details className="card" open={people.length > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="font-bold">
            {people.length > 0 ? "People in this order" : "Ordering for them, and paying?"}
          </span>
          <span aria-hidden className="shrink-0 text-sm font-semibold text-muted">
            {people.length > 0 ? people.length : "Add names"}
          </span>
        </summary>

        <div className="mt-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted">
            {people.length > 0
              ? "Now tap a name under each item below to say whose it is. Bags are labelled with these names on delivery."
              : "Add their names, then tap a name under each item to say whose it is. The delivery fee does not change."}
          </p>
          {people.length > 0 && (
            <button
              type="button"
              onClick={clearPeople}
              className="shrink-0 text-sm font-semibold text-muted hover:text-brand"
            >
              Turn off group
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <span key={person.name} className="chip border-black/10 bg-paper">
              {person.name}
              <button
                type="button"
                onClick={() => removePerson(person.name)}
                aria-label={`Remove ${person.name}`}
                className="text-muted"
              >
                ✕
              </button>
            </span>
          ))}

          <span className="flex items-center gap-1">
            <input
              className="field w-32 py-1.5 text-sm"
              placeholder="Add a name"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addPerson(newPerson);
                setNewPerson("");
              }}
            />
            <button
              type="button"
              className="chip border-black/10 bg-paper"
              onClick={() => {
                addPerson(newPerson);
                setNewPerson("");
              }}
            >
              Add
            </button>
          </span>
        </div>
        </div>
      </details>
      )}

      {asking && (
        <Sheet
          title={mine?.finalised ? "Update your food?" : "Put this food in the group?"}
          onClose={() => setAsking(false)}
        >
            <div>
              <p className="text-sm text-muted">
                {mine?.finalised
                  ? "This replaces what you put in before. Your share of delivery is worked out when the group closes, so nothing is charged yet."
                  : "Your share of delivery is worked out when the group closes, so nothing is charged yet."}
              </p>
            </div>

            {/* What they are actually agreeing to, rather than a bare yes. */}
            <div className="rounded-2xl bg-black/[0.04] px-3 py-2 text-sm">
              <p className="font-bold">
                {countItems(cart)} item{countItems(cart) === 1 ? "" : "s"} ·{" "}
                {naira(cartSubtotal(cart))}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {cart.map((line) => `${line.qty}× ${line.name}`).join(", ")}
              </p>
            </div>

            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Your phone number"
              aria-label="Your phone number"
              inputMode="tel"
              className="field"
            />

            {hostels.length > 0 ? (
              <select
                value={hostel}
                onChange={(event) => setHostel(event.target.value)}
                aria-label="Your block"
                className="field"
              >
                <option value="">Which block?</option>
                {hostels.map((one) => (
                  <option key={one} value={one}>
                    {one}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={hostel}
                onChange={(event) => setHostel(event.target.value)}
                placeholder="Your hostel or block"
                aria-label="Your hostel or block"
                className="field"
              />
            )}

            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything we should know? (optional)"
              aria-label="Anything we should know"
              className="field"
            />

            <PayChoice value={method} onChange={setMethod} />

            {problem !== "" && (
              <p className="text-sm font-semibold text-brand-dark">{problem}</p>
            )}

            <button
              type="button"
              onClick={finalise}
              disabled={sending}
              className="btn-primary w-full"
            >
              {sending
                ? "Saving…"
                : mine?.finalised
                  ? "Yes, update it"
                  : "Yes, put my food in"}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="w-full text-sm font-semibold text-muted"
            >
              No, I am still choosing
            </button>
        </Sheet>
      )}

      {/* Shallower than it was. The bar is a total and a button, and it
          was taking a fifth of a phone to say them: thirty-two pixel
          figures and a button at fourteen pixels of padding. The app says
          the same two things in half the height, and the half it gives
          back is the cart. */}
      <div data-actionbar className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t-2 border-ink bg-shell px-4 pb-3 pt-2.5 sm:bottom-0">
        {problem !== "" && (
          <p className="mx-auto mb-2 max-w-2xl rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
            {problem}
          </p>
        )}
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {/* The whole price, not the food's half of it. The bar said
                the subtotal while the total on the next screen was several
                thousand more, which is the shop quoting a number it is not
                going to charge. In a group the fee is split when the car
                closes, so there the food is the honest figure. */}
            <p className="ticket text-muted">
              {countItems(cart)} item{countItems(cart) === 1 ? "" : "s"}
              {group === "" && tier !== "" ? ` · ${tier}` : ""}
            </p>
            <p className="truncate font-display text-[26px] font-black leading-none">
              {naira(cartSubtotal(cart) - paired.off + (group === "" ? alone : 0))}
            </p>
          </div>
          {group !== "" ? (
            mine?.finalised && !mine.changed && !movedSinceFinalising ? (
              // Nothing has moved since they finished, so there is nothing to
              // do here. Saying "Finalise" again invites them to wonder
              // whether the first one took.
              <span className="shrink-0 rounded-full bg-mint/15 px-5 py-3 text-center text-sm font-bold text-mint">
                Finalised
                <span className="block text-xs font-semibold text-mint/80">
                  change something to update
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAsking(true)}
                className="btn-primary shrink-0 border-2 border-ink px-6 py-3"
              >
                {mine?.finalised ? "Update my food" : "Finalise my food"}
              </button>
            )
          ) : (
            <Link
              href="/checkout"
              className="btn-primary shrink-0 border-2 border-ink px-6 py-3"
            >
              Checkout
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
