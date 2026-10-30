"use client";

import Link from "next/link";
import { LAST_MINUTE_SAID, payWithinSaid } from "@/lib/last-minute";
import Empty from "@/components/Empty";
import { useActionState, useEffect, useState } from "react";
import { submitOrder, type SubmitState } from "@/app/actions";
import {
  cartSubtotal,
  countItems,
  groupNames,
  toServerLines,
  updatePerson,
  useCart,
  usePeople,
} from "@/lib/cart";
import { feeFor, sameDayFee, splitFee, type Band } from "@/lib/fees";
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
import { placesOfRun, runCarries } from "@/lib/run-places";
import { DAY_NAMES, nextOpenDay, opensOn, weekdayOf } from "@/lib/open-days";
import { offerShare, pickOffer, type LiveOffer } from "@/lib/offers";
import { normalisePhone } from "@/lib/phone";
import { OPENED, TRAP } from "@/lib/guard";
import FeeBands from "./FeeBands";
import { naira } from "@/lib/money";
import { perkOnCart } from "@/app/actions";
import type { LinkPerk } from "@/lib/orders";
import HeardFrom from "./HeardFrom";
import { feeAcross, feeForValue, type ValueBand } from "@/lib/value-bands";
import { ladderFor, pricesByStep, pricesByValue, stepsFor } from "@/lib/areas-shared";
import { feeRidingAlong, type StepFee } from "@/lib/step-fee";
import CouponBox from "@/components/CouponBox";
import { clearJoin, readJoin } from "@/components/JoinDelivery";
import {
  joinedViaLink,
  leaveGroup,
  PARTY_CHANGED,
  readGroup,
} from "@/components/GroupLink";
import { type Slot } from "@/lib/same-day";
import { nextArrival, runArrival } from "@/lib/arrival";
import FillDetails from "@/components/FillDetails";
import KeepCart from "@/components/KeepCart";
import { countdown, runDateLabel } from "@/lib/time";
import { waLink } from "@/lib/whatsapp";
import {
  dayAfter,
  dayOfChoice,
  dayToHoldTo,
  daySaid,
  daysOnOffer,
  soonestDay,
  worthACar,
} from "@/lib/pick-a-day";
import type { GroupMode } from "@/lib/types";
import type { BatchView } from "@/lib/view";

type JoinLoad = {
  id: string;
  name: string;
  batchId: string;
  items: number;
  feeCharged: number;
};

/**
 * An order already on this run for this number, so the checkout can lock to
 * its car and fill in who it is for.
 *
 * It carries no items and no fee, because delivery is no longer credited
 * across orders. It used to be: a second order on the same number paid only
 * the difference, which read well and was trivially gamed. Somebody with an
 * order in a run could add a friend's food to it for nothing, and an order
 * abandoned unpaid handed its fee to the next one as credit that had never
 * arrived. Each order now pays for the room its own containers take.
 */
export type AddingTo = {
  batchId: string;
  batchLabel: string;
  phone: string;
  name: string;
  hostel: string;
};

/**
 * Whoever is signed in, as the shop already knows them.
 *
 * The checkout asked everybody for their name, their number and their
 * block every single time, including the person whose number it was
 * holding a signed cookie for. The only way to fill it in was the PIN box,
 * which asks a regular to prove again what she proved when she signed in,
 * and which the shop cannot use at all when it is taking an order for
 * somebody: a PIN only ever goes to the number it belongs to.
 *
 * Null for a visitor nobody knows, which is how it was for everybody.
 */
export type SignedIn = {
  name: string;
  phone: string;
  hostel: string;
  paymentMethod: "transfer" | "card";
  /** Who brought them, written once on their first order. Checked against
   *  the live promoters where it is used, so one who has stopped is never
   *  put in front of anybody. */
  heardFrom: string;
  /** The channel they came through, as the shop files it: "chatgpt". A
   *  channel is not a person and pays nobody, but it is still the answer
   *  to where they heard about us. */
  cameFrom: string;
};

export default function Checkout({
  batches,
  today,
  adding,
  you,
  sameDaySlots: allSlots,
  sameDayBands: baseSameDayBands,
  urgentExtra,
  bands: baseBands,
  areas,
  areaOf,
  areaPairs = [],
  valueBandsOf,
  stepFeeOf,
  openDaysOf = {},
  offers,
  hostels,
  promoters,
  sentBy = "",
  sentByName = "",
  monies = [],
  iceItemId = "",
  whatsapp = "",
}: {
  batches: BatchView[];
  /** The shop's number, for the one case this page cannot serve: somebody
   *  who needs it sooner than anything on offer. Empty leaves the line off
   *  rather than sending anybody to a dead link. */
  whatsapp?: string;
  /** The bag of ice block the shop puts in and takes out itself. Named
   *  here only so the cart listing does not print a counter on it. */
  iceItemId?: string;
  /** Today in Lagos, from the shop's clock: it decides whether a run going
   *  today opens instead of a time of their own. */
  today: string;
  adding: AddingTo | null;
  /** Whoever is signed in, so a regular is not asked again for what the
   *  shop already has. Null for a visitor nobody knows. */
  you: SignedIn | null;
  /** Times still available today, worked out on the server so the clock is
   *  the shop's rather than the phone's. Empty means same day is off. */
  sameDaySlots: Slot[];
  /** The pick-a-time ladder as the admin has it, so what is shown is what is
   *  charged. */
  sameDayBands: Band[];
  urgentExtra: number;
  /** The delivery price list in force, read from settings on the server. It
   *  is what Sangotedo costs; anywhere further adds to every band. */
  bands: Band[];
  /** The areas the shop delivers from, and which one each kitchen is in. */
  areas: Area[];
  areaOf: Record<string, string>;
  /** What a stop between any two areas costs, as the shop has priced it.
   *  A cart that is two errands pays this on top of the distance. */
  areaPairs?: AreaPair[];
  /** The kitchens that price by what the shopping comes to rather than by
   *  how many things it is, by id. A market is one; a restaurant is not. */
  valueBandsOf: Record<string, ValueBand[]>;
  /** The kitchens priced by the cool box, so the checkout quotes
   *  the same number the till charges. */
  stepFeeOf: Record<string, StepFee>;
  /** The days each restaurant opens, for the few that do not open every
   *  day. Missing means all seven. */
  openDaysOf?: Record<string, string>;
  /** Promotions on today. The same rule that prices the order judges them
   *  here, so what is quoted is what is charged. */
  offers: LiveOffer[];
  /** The currencies somebody abroad can be sent a card link in. Empty
   *  unless the shop has switched it on and set a rate. */
  monies?: { code: string; label: string; symbol: string; rate: number }[];
  /** The blocks the admin delivers to. Empty means anything typed is allowed. */
  hostels: string[];
  /** Who somebody could say they heard about the shop from. Empty means
   *  nobody is promoting, and then the question is not worth asking. */
  promoters: { code: string; name: string }[];
  /** Whose link they arrived on, already checked against the live list. */
  sentBy?: string;
  /** What to call them, so a discount says whose doing it was. */
  sentByName?: string;
}) {
  const cart = useCart();
  const { people } = usePeople();

  // How far the car has to go for this cart, which decides three things: what
  // delivery costs, whether a car of its own can go at all, and which runs
  // can carry it. The same rule the server prices by, so the number here is
  // the number on the bill.
  const kitchens = [...new Set(cart.map((line) => line.restaurantId))];
  const cartAreas = areasIn(areas, kitchens, areaOf);
  const area = dearestArea(areas, kitchens, areaOf);
  // The dearest area sets the distance; every area after the first is a
  // second shop to find, park at and queue in, and costs the same whichever
  // two they are. Sangotedo is not one of them: every run passes it anyway.
  const secondStop = mixedExtra(cartAreas, areaPairs);
  const farExtra = area.runExtra + secondStop;
  const sameDayBands = withExtra(baseSameDayBands, area.sameDayExtra + secondStop);
  const runBands = withExtra(baseBands, farExtra);
  // A kitchen that charges by what the shopping comes to rather than by how
  // many things it is. A market trip is one trip and two bags, and the
  // container ladder would call eleven peppers eleven containers.
  const byValue = ladderFor(kitchens, valueBandsOf);
  // Two errands, two fees: the market half by what the shopping comes to,
  // the restaurant half by how much of the car it fills.
  /* What is priced by the cool box is priced by the cool box and by
     nothing else. Counting it in the market half as well charged the same
     tubs twice: once by what they came to, and again by the box they
     travel in. Only Fantasy is priced this way. */
  const notByBox = cart.filter((line) => !pricesByStep(line.itemId, stepFeeOf));
  const marketHalf = notByBox.filter((line) =>
    pricesByValue(line.restaurantId, valueBandsOf)
  );
  const restHalf = notByBox.filter(
    (line) => !pricesByValue(line.restaurantId, valueBandsOf)
  );
  /*
   * What rides along on a trip the car was making anyway.
   *
   * Fantasy ice cream is small and the people who buy it buy a lot: the
   * container ladder would call fifteen of them fifteen takeaway boxes. It
   * is also not a stop the car makes for its own sake, so it is the dearer
   * of the two rather than the sum: three pizzas and an ice cream pays for
   * the pizzas, and sixty ice creams and one pizza pays for four cool
   * boxes.
   */
  const steps = stepsFor(cart.map((line) => line.itemId), stepFeeOf);
  const ridingHalf = cart.filter((line) => pricesByStep(line.itemId, stepFeeOf));
  const drivingHalf = cart.filter((line) => !pricesByStep(line.itemId, stepFeeOf));
  const ridingCount = ridingHalf.reduce((all, line) => all + line.qty, 0);
  /** What the rest of the cart costs, with what rides along left out. */
  const ridesAlong = (otherFee: number) =>
    feeRidingAlong({ stepCount: ridingCount, steps, otherFee });
  // One thing from a far area makes the whole order a run: a car cannot be
  // in two places in three hours.
  // A car of its own goes today, so a counter shut today cannot be fetched
  // from either. Offering the slots and refusing the order afterwards is
  // the worst of both.
  const shutToday = [...new Set(
    cart
      .filter((line) => !opensOn(openDaysOf[line.restaurantId], today))
      .map((line) => line.restaurantName)
  )];
  /*
   * Today and tomorrow, as this has always meant.
   *
   * The server now sends windows for every day the shop is open, because
   * the day dropdown needs them. Everything else on this page that reads
   * `sameDaySlots` is answering "how soon can this get here", and handing
   * it next Friday would change what it says. So the long list is cut back
   * to what it used to be, and the dropdown reads the long one below.
   */
  const sameDaySlots =
    canGoSameDay(cartAreas) && shutToday.length === 0
      ? allSlots.filter(
          (one) =>
            one.date <= dayAfter(today) &&
            carGoesOn(cartAreas, one.date, opensOn)
        )
      : [];

  /*
   * A counter that will be shut when that car goes.
   *
   * D.O Bowls opens Monday to Friday, so Saturday's run cannot fetch from
   * it however much room is in the car. Treated exactly like a run that
   * does not stop at the right counter: the run drops out of the list and
   * a sentence says why and which one does work, rather than the order
   * being refused at the end for a reason nobody could have known.
   */
  const shutNames = (date: string) =>
    [...new Set(
      cart
        .filter((line) => !opensOn(openDaysOf[line.restaurantId], date))
        .map((line) => line.restaurantName)
    )];

  const runOpen = (b: BatchView) => shutNames(b.runDate).length === 0;

  const openable = batches.filter(
    (b) =>
      !b.closed &&
      !b.full &&
      runCovers(b.areas, cartAreas) &&
      runCarries(b.onlyPlaces, kitchens) &&
      runOpen(b)
  );

  /*
   * Every day this cart could arrive on, and what would carry it.
   *
   * A run where one is going, a car of its own where none is. Checked per
   * date rather than against today, because a counter shut on Sunday is
   * open on Monday and the car that fetches it goes on the day chosen,
   * not on this one.
   */
  const carWindows = canGoSameDay(cartAreas)
    ? allSlots.filter(
        (one) =>
          shutNames(one.date).length === 0 &&
          // And only on the days a car can reach everywhere this cart
          // touches. Ajah takes a car on the day the shop is already going
          // that way and on no other, so with the day picker offering a
          // fortnight, this is what stops somebody buying a Monday car to
          // Ajah that nobody was ever going to drive.
          carGoesOn(cartAreas, one.date, opensOn)
      )
    : [];
  const dayChoices = daysOnOffer({
    runs: openable.map((one) => ({ id: one.id, runDate: one.runDate })),
    slots: carWindows,
  });
  /*
   * What the page opens on: today if anything at all goes today, then
   * tomorrow, then the next day something goes.
   *
   * It used to open on the soonest arrival worked out across runs and
   * cars together, which preferred a run three days out to a car tonight
   * because the run is cheaper. That is the shop's reasoning, not the
   * customer's: somebody at the checkout at six o'clock wants to know
   * about tonight first and can choose to wait. The day is the question
   * and the price is the answer to it, rather than the other way round.
   */
  const firstDay = soonestDay(dayChoices);

  /*
   * A day with two ways of arriving on it.
   *
   * The day control is only drawn where there is more than one day to
   * choose, which was right while a day had one answer. A day with a run
   * and a car on it has two, and the commonest cart in the shop is exactly
   * that: everything going today, a run at six, and a car that could be
   * there at one. With only today on offer the control was not drawn at
   * all, so the choice existed and could not be reached.
   */
  const waysOn = (date: string) => {
    const run = openable.find((one) => one.runDate === date) ?? null;
    return {
      run,
      cars:
        run === null
          ? []
          : // A car has to be properly sooner to be worth its money. Four
            // o'clock against a run at five is an hour, maybe, for a
            // dearer trip: offering it is talking somebody into the
            // expensive thing for nothing.
            carWindows.filter(
              (car) =>
                car.date === date && worthACar(run.deliveryWindow, car.window)
            ),
    };
  };

  // The runs that only fail because somebody is closed that day, and what
  // is closed on the soonest of them. Said in their words: "DO Bowls is
  // closed on Saturdays."
  const shutRuns = batches.filter(
    (b) =>
      !b.closed &&
      !b.full &&
      runCovers(b.areas, cartAreas) &&
      runCarries(b.onlyPlaces, kitchens) &&
      !runOpen(b)
  );
  const shutSoonest = shutRuns.reduce<BatchView | null>(
    (best, one) => (best === null || one.runDate < best.runDate ? one : best),
    null
  );
  const shutThere = shutSoonest ? shutNames(shutSoonest.runDate) : [];
  const shutSaid =
    shutThere.length === 1
      ? shutThere[0]
      : `${shutThere.slice(0, -1).join(", ")} and ${shutThere[shutThere.length - 1]}`;
  const shutDayWord = shutSoonest ? DAY_NAMES[weekdayOf(shutSoonest.runDate)] : "";

  // The rest of the cart, which is usually most of it: somebody with a
  // bucket of chicken and one bowl should be told the chicken is fine.
  const stillFine = shutSoonest
    ? [...new Set(
        cart
          .filter((line) => opensOn(openDaysOf[line.restaurantId], shutSoonest.runDate))
          .map((line) => line.restaurantName)
      )]
    : [];
  const stillFineSaid =
    stillFine.length === 1
      ? stillFine[0]
      : `${stillFine.slice(0, -1).join(", ")} and ${stillFine[stillFine.length - 1]}`;

  /*
   * Tonight's closed run, and the counters it has already been to.
   *
   * The cart holding one of them is not a cart with nothing going for it:
   * the rest of it can still go out tonight, and the whole of it can go on
   * the next run. Saying which half is which is the difference between an
   * order split by somebody who knows why, and a run that silently is not
   * on the list. See lib/last-minute.ts.
   */
  const lateRun = batches.find((one) => one.lastMinute === true) ?? null;
  const lateStops = lateRun ? placesOfRun(lateRun.onlyPlaces) : [];
  const saidList = (names: string[]) =>
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const beenTo =
    lateRun === null
      ? []
      : [
          ...new Set(
            cart
              .filter((line) => !lateStops.includes(line.restaurantId))
              .map((line) => line.restaurantName)
          ),
        ];
  const stillToCome =
    lateRun === null
      ? []
      : [
          ...new Set(
            cart
              .filter((line) => lateStops.includes(line.restaurantId))
              .map((line) => line.restaurantName)
          ),
        ];

  // When the closed one opens again, for the case where no run at all can
  // carry this cart: "Pick another day" is useless without the day.
  const openAgainWord = (() => {
    if (!shutSoonest) return "";
    const shut = cart.find(
      (line) => !opensOn(openDaysOf[line.restaurantId], shutSoonest.runDate)
    );
    if (!shut) return "";
    const date = nextOpenDay(openDaysOf[shut.restaurantId], shutSoonest.runDate);
    return date === today ? "today" : `on ${DAY_NAMES[weekdayOf(date)]}`;
  })();

  // Runs that are open, going the right way, and stopping at counters this
  // cart does not need. Some nights are one counter's run: the car queues at
  // Domino's and fetches nothing else. Without a word about them the list of
  // runs is simply shorter than it was yesterday and nobody knows why.
  const wrongCounter = batches.filter(
    (b) =>
      !b.closed && !b.full && runCovers(b.areas, cartAreas) && !runCarries(b.onlyPlaces, kitchens)
  );
  const counterNames = [...new Set(cart.map((line) => line.restaurantName))];
  const counterSaid =
    counterNames.length === 1
      ? counterNames[0]
      : `${counterNames.slice(0, -1).join(", ")} and ${counterNames[counterNames.length - 1]}`;

  // The things in this cart that are not from Sangotedo, and what holds
  // them up. A car that goes to Lekki passes Sangotedo on the way back, so a
  // mixed cart is fine the moment such a run exists: everything travels
  // together and there is one fee. It is only when no run is going there
  // that the two halves cannot be one order.
  const far = cartAreas.filter((one) => one.id !== "");
  const farNames = (() => {
    const names = [...new Set(far.map((one) => one.name))];
    if (names.length < 3) return names.join(" and ");
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  })();
  const farLines = cart.filter((line) =>
    far.some((one) => one.id === (areaOf[line.restaurantId] ?? ""))
  );
  const noRunThere = far.length > 0 && openable.length === 0;

  /*
   * The counters holding the cart up, by their own names.
   *
   * This notice used to name the area: "Lekki/Ikoyi goes out on a run
   * only". Nobody thinks of themselves as ordering from Lekki. They think
   * they ordered a burger from Jay's Diner, so a sentence about a part of
   * Lagos is a sentence about somebody else's order, and it got read as
   * boilerplate and skipped. Somebody put Jay's Diner in a cart, was given
   * a date six days out, and still expected it that afternoon.
   *
   * So it names the thing they chose. The area stays in the sentence,
   * because it is the reason, but it is no longer the subject.
   */
  const farShops = [...new Set(farLines.map((line) => line.restaurantName))];
  const farShopSaid =
    farShops.length === 1
      ? farShops[0]
      : `${farShops.slice(0, -1).join(", ")} and ${farShops[farShops.length - 1]}`;
  /*
   * Each of them with its own part of Lagos.
   *
   * "The Place and Yin Yang Express are in Ajah and Lekki" leaves the
   * reader to work out which is which, and the cart's version of this
   * sentence put both of them in Ajah. Yin Yang Express is in Lekki. Said
   * one by one, there is nothing to work out and nothing to get wrong.
   */
  const farWhereSaid = (() => {
    const pairs = [
      ...new Map(
        farLines.map((line) => [
          line.restaurantName,
          far.find((one) => one.id === (areaOf[line.restaurantId] ?? ""))?.name ?? "",
        ])
      ).entries(),
    ].map(([shop, where]) => (where ? `${shop} is in ${where}` : shop));
    if (pairs.length <= 1) return pairs[0] ?? "";
    return `${pairs.slice(0, -1).join(", ")} and ${pairs[pairs.length - 1]}`;
  })();


  // The soonest run that can carry the far half of this cart, against the
  // soonest run there is at all. Where they are not the same day, the far
  // half is what is holding the order up, and saying so is the difference
  // between a list of runs that is quietly shorter than usual and a choice
  // somebody can actually make: wait for the one going there, or take that
  // food out and eat sooner.
  const soonest = (list: BatchView[]): BatchView | null =>
    list.reduce<BatchView | null>(
      (best, one) => (best === null || one.runDate < best.runDate ? one : best),
      null
    );
  const goingThere = soonest(openable);

  // What the rest of the cart could catch on its own, worked out the same way
  // the shop works out every other arrival: a run today, a car of its own
  // today, a run tomorrow, tomorrow's first window. Without the far food the
  // cart is a Sangotedo one, so every open run can carry it and a car of its
  // own is back on the table. Comparing runs alone named tomorrow night while
  // a car could have been there this afternoon.
  const usableRuns = batches.filter((one) => !one.closed && !one.full);
  const withoutFar = nextArrival(usableRuns.map(runArrival), allSlots, today);
  const withoutFarRun = withoutFar?.onARun
    ? usableRuns.find((one) => one.id === withoutFar.runId) ?? null
    : null;

  // Sooner than waiting for the run that goes there. A car of its own counts
  // only where one could go today: one tomorrow is no better than tomorrow's
  // run, and offering it as if it were is how somebody pays for a car to save
  // nothing.
  const restCouldComeSooner =
    goingThere !== null &&
    withoutFar !== null &&
    (withoutFar.onARun
      ? withoutFarRun !== null && withoutFarRun.runDate < goingThere.runDate
      : allSlots.some((one) => one.day === "today") && goingThere.runDate > today);

  const farHoldsItUp =
    far.length > 0 && farLines.length < cart.length && restCouldComeSooner;

  // The soonest way to eat, the same rule as everywhere else: a run today, a
  // car of its own today, a run tomorrow, tomorrow's first window. Only as a
  // fallback now that the day is picked; see `firstDay` above.
  const decided = nextArrival(openable.map(runArrival), sameDaySlots, today);
  // A car of its own still carries a run id, because that is what the
  // coupon and the offer rules are asked about. The time is what decides
  // the price, and it wins wherever both are set.
  const [batchId, setBatchId] = useState(
    adding?.batchId ||
      // A car of its own carries a run id too, so where the soonest day
      // is a car day this still falls through to a real run. Falling
      // through on empty rather than on null on purpose: the soonest
      // arrival writes an empty run id for a car, and `??` kept that empty
      // string as the answer, which left the page holding no run at all.
      firstDay?.runId ||
      decided?.runId ||
      openable[0]?.id ||
      ""
  );

  const [method, setMethod] = useState<"transfer" | "card">(you?.paymentMethod ?? "transfer");
  // Empty is naira, which is nearly every order. Cleared whenever somebody
  // goes back to a transfer, so a currency cannot ride along on an order
  // that is not being paid by card at all.
  const [money, setMoney] = useState("");
  const [mode, setMode] = useState<GroupMode>("one_payer");
  // Not asked: every friend has already said where their own food goes, and
  // asking again in different words got a different answer half the time.
  // One bag going to its owner is enough to make this an each-bag run.
  const [now, setNow] = useState<number | null>(null);
  // React resets an uncontrolled form once its action finishes, which wiped
  // the name, number and block every time the server rejected something. They
  // are held here instead, and remembered for the next order.
  /*
   * The order being added to first, then whoever is signed in.
   *
   * Signed in beats what this browser last typed: the record on the shop is
   * the person, and the box is one machine's memory of the last order
   * placed on it. That difference is invisible until the shop takes an
   * order for somebody on its own laptop, and then it is her order under
   * whoever used the laptop last.
   */
  const [name, setName] = useState(adding?.name ?? you?.name ?? "");
  const [phone, setPhone] = useState(adding?.phone ?? you?.phone ?? "");
  const [hostel, setHostel] = useState(adding?.hostel ?? you?.hostel ?? "");
  /** Whether the whole list of blocks is open. A few to tap and the rest
   *  behind one word, the way the app has it: sixteen fat buttons is four
   *  rows of them on the page where somebody is trying to finish. */
  const [allBlocks, setAllBlocks] = useState(false);
  const [filled, setFilled] = useState(false);
  const [note, setNote] = useState("");
  // Set once, when the page is drawn, rather than read at submit: what
  // matters is how long it was open.
  const [openedAt] = useState(() => Date.now());
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  // What the link they arrived on is worth on this cart. Asked of the server
  // rather than assumed, because whether it applies at all depends on whose
  // first order this is and on what else is already on the order.
  const [perk, setPerk] = useState<LinkPerk>({ kind: "none" });

  /*
   * Their answer to "where did you hear about us?", which starts as the
   * link's and is theirs to change.
   *
   * It used to be a field on the form and nothing else, so correcting it
   * moved the commission and left the discount sitting on the total:
   * somebody who picked "Somewhere else" was still being shown ₦500 off
   * from a person they had just said did not send them. The offer belongs
   * to coming in through somebody, so it follows the answer.
   */
  /*
   * Where they heard about us, already answered where the shop knows.
   *
   * The link first, then whoever brought them, then the channel they came
   * through. All three were written down on their first order and never
   * touched again, and the box still opened on "Somewhere else": the shop
   * asking a regular to remember something it had written down for her,
   * and taking the one answer that was never true.
   *
   * A channel carries a prefix no promoter's code can have, because it
   * credits nobody. Only the ones the list actually offers: a channel the
   * select has no option for cannot be shown as picked, and "Somewhere
   * else" is the honest answer then.
   */
  const [heardFrom, setHeardFrom] = useState(() => {
    if (sentBy !== "") return sentBy;
    const channel = (you?.cameFrom ?? "").trim().toLowerCase();
    return channel === "chatgpt" ? "c:chatgpt" : "";
  });

  // Whose name goes on the line. The link's, until they name somebody else.
  const creditName =
    heardFrom === ""
      ? ""
      : heardFrom === sentBy
        ? sentByName
        : (promoters.find((one) => one.code === heardFrom)?.name ?? "");
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitOrder, {
    error: null,
  });

  useEffect(() => {
    if (adding) return;
    try {
      const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "null");
      // Not over somebody who is signed in. The shop knows who they are;
      // the box knows who last used this machine, and on the shop's own
      // laptop those are different people.
      if (!you) {
        if (saved?.name) setName((current) => current || saved.name);
        if (saved?.phone) setPhone((current) => current || saved.phone);
        if (saved?.hostel) setHostel((current) => current || saved.hostel);
        if (saved?.method === "card" || saved?.method === "transfer") {
          setMethod(saved.method);
        }
      }
      // Carried over by "want this again". Taken out once it is used, so it
      // does not haunt an order three weeks later that has nothing to do
      // with it.
      if (typeof saved?.note === "string" && saved.note !== "") {
        setNote(saved.note);
        localStorage.setItem(
          "sudu_me_v1",
          JSON.stringify({ ...saved, note: "" })
        );
      }
    } catch {
      /* Nothing saved, or storage is blocked. The fields simply start empty. */
    }
  }, [adding, you]);

  useEffect(() => {
    try {
      // Merged rather than replaced: this used to write the three fields
      // whole, which threw away anything else kept beside them.
      const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "{}");
      localStorage.setItem(
        "sudu_me_v1",
        JSON.stringify({ ...saved, name, phone, hostel, method })
      );
    } catch {
      /* Not worth failing checkout over. */
    }
  }, [name, phone, hostel, method]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const badPhone = Boolean(state.error?.toLowerCase().includes("phone"));
  const selected = batches.find((b) => b.id === batchId) ?? null;

  /*
   * A run that has closed but has not been shopped is charged as a car.
   *
   * The food has not been bought, so this order really is going out
   * today, and what it buys is a car's worth of driving at the moment
   * the shop happens to be doing it. Four thousand is the price of
   * sharing a trip planned around everybody; this one was not planned at
   * all. See lib/last-minute.ts.
   */
  const lastMinute = selected?.lastMinute === true;
  const bands = lastMinute ? sameDayBands : runBands;
  const ladderBase = lastMinute ? baseSameDayBands : baseBands;

  // A month of Fridays is a wall, not a choice, so only the next few are
  // offered. Counted out of the runs that can carry this cart rather than out
  // of every run there is, which is what let the one run going to Lekki fall
  // off the end of a list of four. Never without the one that is picked.
  const shownRuns = [
    ...openable.slice(0, 4),
    ...openable.filter(
      (one, index) => index >= 4 && one.id === batchId
    ),
  ];
  const itemCount = countItems(cart);
  const subtotal = cartSubtotal(cart);

  // A friend's delivery this browser said it was joining. Checked against the
  // server on the way in, so a link from a run that has since closed quietly
  // stops applying rather than pricing an order wrongly.
  const [joining, setJoining] = useState<JoinLoad | null>(null);

  useEffect(() => {
    const saved = readJoin();
    if (!saved) return;
    let alive = true;
    void fetch(`/api/join/${saved.id}`)
      .then((response) => response.json())
      .then((data: JoinLoad & { ok: boolean }) => {
        if (!alive) return;
        if (data.ok) setJoining(data);
        else clearJoin();
      })
      .catch(() => {
        /* Unreachable means they order on their own, which still works. */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Their food has to be on the run the delivery is actually on, or it is not
  // the same car.
  useEffect(() => {
    if (joining) setBatchId(joining.batchId);
  }, [joining]);

  // Sharing a delivery, either starting one or joining one. Neither has a
  // delivery fee yet: it is split evenly when the group closes, once it is
  // known how many are in the car.
  // The group this browser is in, if any. Read on mount, because localStorage
  // does not exist while the server renders.
  //
  // A group now has its car from the moment its link is made, so there is no
  // waiting-for-the-leader state left: whoever is in one is on the trip the
  // leader already picked, and this page only has to say which trip that is.
  const [party, setParty] = useState("");
  const [partyWhen, setPartyWhen] = useState("");
  const [partyLeader, setPartyLeader] = useState("");
  const [partyPeople, setPartyPeople] = useState(0);
  // Whether this browser arrived on somebody else's link, so the wording can
  // be theirs rather than the leader's. Recorded when the link is taken, never
  // guessed from something being missing.
  const [joinedLink, setJoinedLink] = useState(false);

  useEffect(() => {
    let alive = true;

    const look = (id: string) => {
      if (!id) return;
      void fetch(`/api/party/${id}`)
        .then((response) => response.json())
        .then(
          (data: {
            started?: boolean;
            when?: string;
            leader?: string;
            people?: number;
            closed?: boolean;
          }) => {
            if (!alive) return;
            // Gone or already priced. Staying in it would show a delivery fee
            // of nothing and then charge the full one, so the browser lets go.
            if (!data.started || data.closed) {
              leaveGroup();
              setParty("");
              return;
            }
            setPartyWhen(data.when ?? "");
            setPartyLeader(data.leader ?? "");
            setPartyPeople(data.people ?? 0);
          }
        )
        .catch(() => {
          /* Offline. They still order into the group they are in. */
        });
    };

    // A link can be made from this very page, so this listens rather than
    // reading once and believing it for ever.
    const reread = () => {
      const found = readGroup();
      setParty(found);
      setJoinedLink(joinedViaLink());
      look(found);
    };
    window.addEventListener(PARTY_CHANGED, reread);
    reread();

    return () => {
      alive = false;
      window.removeEventListener(PARTY_CHANGED, reread);
    };
  }, []);
  // Same day instead of a run. Empty means they are on a run.
  //
  // Whatever the decision above landed on: a run today if there is one,
  // else a car of its own today, else a run tomorrow, else tomorrow's first
  // window. Nobody is asked, because there is one right answer and the
  // dropdown that used to be here only made somebody find it.
  // Empty where the soonest day has a run on it, which is what tells the
  // whole page it is on a run rather than a car.
  const [deliverAt, setDeliverAt] = useState(
    adding ? "" : (firstDay?.at ?? "")
  );
  /*
   * Looked for in every window the shop sent, not only today's and
   * tomorrow's.
   *
   * A day chosen from the dropdown can be next Thursday, and the whole
   * page reads the arrival off this: found in the short list only, a car
   * picked for later came back as nothing and the headline fell through to
   * "on the next run" while the fee was charging for a car.
   */
  const sameDay = allSlots.find((one) => one.at === deliverAt) ?? null;
  /** The dropdown is on Today, Tomorrow, or a date somebody typed. */
  const [pickingDate, setPickingDate] = useState(false);
  /** Why the day somebody typed cannot be done, where it cannot. Said out
   *  loud, because a date box that takes a tap and changes nothing reads as
   *  a broken page rather than as an answer. */
  const [dayProblem, setDayProblem] = useState("");
  /** The day to offer instead, where the one somebody asked for cannot be
   *  done. A date box that says no and stops is a dead end: the shop knows
   *  which day does work and should say it, with a tap to take it. */
  const [dayInstead, setDayInstead] = useState("");
  const shared = joining !== null || party !== "";

  // A promotion is the price rather than money off it, so it is settled
  // first. The same function decides it here and on the server, because a fee
  // quoted on this screen and charged on the next has to be one number.
  const promotion = pickOffer(offers, {
    restaurantIds: [...new Set(cart.map((line) => line.restaurantId))],
    itemIds: cart.map((line) => line.itemId),
    lineChoices: cart.map((line) => line.choices),
    items: itemCount,
    batchId,
    deliverAt: sameDay ? sameDay.at : null,
    returning: false,
  });

  // What an offer would charge for this cart at a given time, or nothing
  // when none applies there. A run is asked for with no time at all.
  const priceFor = (at: string | null) => {
    const found = pickOffer(offers, {
      restaurantIds: [...new Set(cart.map((line) => line.restaurantId))],
      itemIds: cart.map((line) => line.itemId),
      lineChoices: cart.map((line) => line.choices),
      items: itemCount,
      batchId,
      deliverAt: at,
      returning: false,
    });
    return found ? (found.fee === 0 ? "free delivery" : naira(found.fee)) : null;
  };

  /** The two errands added, before anything riding along is counted. */
  let beforeRiding = 0;
  const acrossBoth = (args: Parameters<typeof feeAcross>[0]) => {
    beforeRiding = feeAcross(args) + farExtra;
    return beforeRiding;
  };

  const fee = promotion
    ? promotion.fee
    : sameDay
    ? sameDayFee(itemCount, sameDay.urgent, sameDayBands, urgentExtra)
    : shared
    ? 0
    : byValue.length > 0
      ? // Nothing but market shopping is charged by what the shopping comes
        // to. Mix a restaurant in and both halves pay, because they are two
        // errands. What rides along in the cool box is added on top of
        // whichever of those applies, exactly as it is on the ordinary
        // ladder below: the server does it once at the end for every cart,
        // and this branch was the one place the phone did not.
        ridesAlong(
        acrossBoth({
          marketFood: cartSubtotal(marketHalf),
          // The container count floors at one, which is right for a cart and
          // wrong for half of one: no restaurant lines must mean no
          // restaurant fee, not the price of a container nobody ordered.
          restaurantFee: (() => {
            const containers = restHalf.length === 0 ? 0 : countItems(restHalf);
            // The plain ladder. The trip is added once below, for the whole
            // order: taking the one with it already in charged a cart
            // holding both a market and a kitchen twice for one car.
            return containers === 0
              ? 0
              : feeFor(containers, selected?.flashFee ?? null, ladderBase);
          })(),
          bands: byValue,
        })
        )
      : ridesAlong(
          feeFor(
            // What rides along is out of the container count: the car is
            // going for the rest of it.
            ridingHalf.length === 0 ? itemCount : countItems(drivingHalf),
            selected?.flashFee ?? null,
            bands
          )
        );

  /**
   * When this order arrives, in the same words as the front page.
   *
   * A run is the window it delivers in: "between 12pm and 2pm today". A car
   * of its own is three hours out, so it is the time it lands: "around
   * 4:30pm today". One sentence either way, and the line under it says
   * plainly that a time is an estimate.
   */
  /* The message already written, so nobody has to explain themselves twice.
     What they are ordering is on the page in front of them and in the cart
     we can see; what the shop needs is the hurry and the block. */
  const urgentChat = waLink(
    whatsapp,
    "Hi Sudu, I need an order sooner than the site can do it. Here is what " +
      "I want, which block I am in and when I need it:"
  );

  const onARun = deliverAt === "";
  /*
   * Which day a car of its own lands on, in words.
   *
   * The windows come back labelled today, tomorrow or "later", which was
   * fine while only today and tomorrow were ever offered. A day can be
   * picked out of the calendar now, so the page was saying "get it around
   * 4pm later" and, in the box asking somebody to agree to the date,
   * "Around 4pm later. Tick to say that works for you."
   */
  const sameDayWord = (one: { day: string; date: string }) =>
    one.day === "later" ? `on ${runDateLabel(one.date)}` : one.day;
  const runNow = batches.find((one) => one.id === batchId) ?? null;
  const arriving = onARun
    ? runNow
      ? runArrival(runNow).said
      : "on the next run"
    : sameDay
      ? `${sameDay.window} ${sameDayWord(sameDay)}`
      : "on the next run";

  // The same arrival as a line of its own rather than the tail of a
  // sentence: "Between 3:30pm and 5:30pm, Saturday, 26 Sept". Beside the
  // delivery fee, where what the money buys is the question being asked.
  const arrivingWhen = onARun
    ? runNow
      ? runArrival(runNow).when
      : ""
    : sameDay
      ? `${sameDay.window.charAt(0).toUpperCase()}${sameDay.window.slice(1)} ${sameDayWord(sameDay)}`
      : "";


  /**
   * What this cart costs on a run, on a named run's numbers.
   *
   * The two comparisons below used to give up whenever a market was in the
   * cart, on the grounds that the container ladder was the wrong ladder to
   * compare against. The market half has a ladder of its own, so there was
   * always an answer, and the customer with market shopping in their cart
   * was the only one never told a car of its own existed.
   */
  const feeOnRun = (flash: number | null): number =>
    byValue.length > 0
      ? feeAcross({
          marketFood: cartSubtotal(marketHalf),
          restaurantFee: (() => {
            const containers = restHalf.length === 0 ? 0 : countItems(restHalf);
            return containers === 0 ? 0 : feeFor(containers, flash, bands);
          })(),
          bands: byValue,
        }) + area.runExtra
      : ridesAlong(
          feeFor(
            ridingHalf.length === 0 ? itemCount : countItems(drivingHalf),
            flash,
            bands
          )
        );

  // Naming friends to carry food for is a different thing from being in a
  // shared delivery, and doing both at once is two answers to one question.
  // The shared delivery wins: it is the one with a link out in a chat.
  const groupOn = people.length > 0 && party === "";
  const names = people.map((p) => p.name);
  // Anyone the cart still names, whether or not they are on the list, so no
  // line can be paid for without being ordered.
  const shares = groupNames(cart, people)
    .map((person) => {
      const lines = cart.filter((l) => l.forName === person);
      return {
        person,
        lines,
        items: lines.reduce((n, l) => n + l.qty, 0),
        food: lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
      };
    })
    .filter((share) => share.items > 0);
  // Under a promotion everybody pays the same share of it, with the floor
  // the offer sets, rather than a slice worked out from what they each got.
  const feeShares = promotion
    ? shares.map(() => offerShare(promotion.offer, itemCount, Math.max(1, shares.length)))
    : splitFee(fee, shares.map((s) => s.items));

  // Under a promotion with a floor, what the car pays between them is the
  // sum of those shares rather than the offer's own figure: five people at a
  // thousand each is five thousand, not two.
  const charged =
    promotion && shares.length > 1
      ? feeShares.reduce((sum, one) => sum + one, 0)
      : fee;

  /** What the cool box added on top of the rest, for the breakdown to say
   *  out loud. Nought on a cart with nothing riding along. */
  const ridesAlongAdds = Math.max(0, charged - beforeRiding);
  // One offer to a checkout: a typed code takes the slot if there is one,
  // and the link's own code only fills it when nothing else has.
  const linkOff = !applied && perk.kind === "applied" ? perk.discount : 0;
  const total = Math.max(0, subtotal + charged - (applied?.discount ?? 0) - linkOff);

  const collect: "leader" | "each" = people.some(
    (person) =>
      person.goesTo === "theirs" &&
      shares.some((share) => share.person === person.name)
  )
    ? "each"
    : "leader";
  /**
   * What this section is actually asking for.
   *
   * Ordering only for friends is a real thing people do, and "where your own
   * food goes" over a cart holding none of it reads as a question nobody can
   * answer. It is their own food, a bag a friend asked to be left with them,
   * or nothing coming to them at all and we still need to reach them.
   */
  const ownFood = cart.some((line) => line.forName === "");
  const bagsToMe = people.some(
    (person) =>
      person.goesTo === "mine" && shares.some((share) => share.person === person.name)
  );
  const whereHeading = !groupOn
    ? "Where it goes"
    : ownFood
      ? "Where your own food goes"
      : bagsToMe
        ? "Where the bags come to"
        : "How to reach you";

  // Two people with food in the cart is what a split needs, whatever they are
  // called: the leader's share is counted separately from a friend of the same
  // name.
  // Somebody other than the leader has to be paying for a split to mean
  // anything. One friend paying for her own food is a split of one, which is
  // a thing people actually want; the leader alone is not.
  const splitReady =
    !groupOn || mode === "one_payer" || shares.some((share) => share.person !== "");

  // Everyone in the cart has to be resolved before the order can be placed.
  const unresolved = people.filter((person) => {
    if (!shares.some((share) => share.person === person.name)) return false;
    if (!person.goesTo) return true;
    if (person.goesTo === "theirs") {
      return !normalisePhone(person.phone) || person.hostel.trim() === "";
    }
    return false;
  });

  // A code applied to one cart and run is not necessarily worth the same, or
  // valid at all, on another. Changing either takes it off rather than
  // showing a discount that will be refused when the order is placed.
  useEffect(() => {
    setApplied(null);
  }, [batchId, itemCount]);

  // The same is true of the link's code, and more so: it turns on the phone
  // number as well, since it is a first order only. Re-asked whenever any of
  // the three move, so the line above the button is never a number from a
  // cart somebody has since changed.
  useEffect(() => {
    if (heardFrom === "" || batchId === "" || cart.length === 0) {
      setPerk({ kind: "none" });
      return;
    }

    let current = true;
    const timer = setTimeout(async () => {
      const form = new FormData();
      form.set("batch_id", batchId);
      form.set("cart", JSON.stringify(toServerLines(cart)));
      form.set("phone", phone);
      try {
        const answer = await perkOnCart(form);
        if (current) setPerk(answer);
      } catch {
        // The discount still applies when the order is placed; this line is
        // only the promise of it, and a promise nobody can make is better
        // left unmade than shown as an error on a checkout.
        if (current) setPerk({ kind: "none" });
      }
    }, 350);

    return () => {
      current = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heardFrom, batchId, itemCount, phone]);

  // A group already has its car, picked when the link was made, so nobody in
  // one is asked again. Everybody else picks here.
  const offersSameDay =
    sameDaySlots.length > 0 && !adding && !joining && party === "";

  // Adding to an order, joining a friend and being in a group are all a run by
  // definition, so a default of "today" would price them wrongly and silently.
  //
  // Above the empty-cart return on purpose. Every hook has to run on every
  // render: below it, an empty cart ran fewer of them than a full one, and
  // React refuses to carry on when the count changes.
  useEffect(() => {
    if (!offersSameDay && deliverAt) setDeliverAt("");
  }, [offersSameDay, deliverAt]);

  /*
   * The day on the page, kept to a day the shop can really do.
   *
   * Both halves of the answer are held here: a run id and, where it is a
   * car of its own, the time. They are settled when the page is first
   * drawn, and at that moment the cart is still being read out of the
   * browser, so they are settled for an empty cart. An empty cart can go
   * on any run at all, so today's run was picked, and when the Ajah food
   * arrived a second later nothing went back and looked again: today's
   * run cannot reach Ajah, so the page quietly held a run that was not on
   * the list, said "on the next run", and quoted the run ladder for a day
   * nothing was going. A lady in Ajah was shown five thousand for a trip
   * that was not happening.
   *
   * So whenever the pair does not name a day that is on offer, it moves to
   * the soonest day that is, and moves both halves together: the run where
   * that day has one, the window where it is a car. A car day still keeps
   * a run id where there is a run to keep, because that is what the
   * coupons and the offers are asked about, and the time is what the price
   * is worked out from.
   *
   * It also covers what this replaced, which was the same repair done to
   * the run alone: a Lekki bowl added to a cart going out on tomorrow's
   * Sangotedo run leaves that run picked although it cannot carry it.
   *
   * Not while adding to an order already placed: that one is locked to its
   * own run, which is the whole point of adding to it.
   */
  const holdTo =
    adding === null
      ? dayToHoldTo(
          dayChoices,
          { runId: batchId, at: deliverAt },
          openable[0]?.id ?? "",
          offersSameDay
        )
      : null;
  if (holdTo !== null) {
    if (holdTo.runId !== batchId) setBatchId(holdTo.runId);
    if (holdTo.at !== deliverAt) setDeliverAt(holdTo.at);
  }

  if (cart.length === 0) {
    return (
      <Empty icon="cart" title="Your cart is empty" href="/" action="Browse the menu">
        Pick a few things and they gather here, ready to go on the next run.
      </Empty>
    );
  }

  /**
   * Which day the food comes.
   *
   * The only question worth asking, and the one the page stopped asking.
   * A run or a car of its own is the shop's business: the customer picks a
   * day and pays what that day costs, the same way they would anywhere
   * else. Today and tomorrow are named, everything past that is a date,
   * because "in six days" is not how anybody says Saturday.
   *
   * Choosing a day sets a run or a time, and every price on this page is
   * already worked out from those two, so nothing here knows what anything
   * costs.
   *
   * Called as a function rather than drawn as <DayPicker />. Declared in
   * here, it is a new component type on every render, and React throws away
   * the old one and builds a fresh one each time: the date box would lose
   * the caret halfway through somebody typing a date into it. Called, its
   * elements are this component's own and the box is left alone.
   */
  function dayPicker() {
    const chosen = dayOfChoice(dayChoices, { runId: batchId, at: deliverAt });
    const named = [today, dayAfter(today)];
    // Today and tomorrow are always on the list, on offer or not: a
    // dropdown that silently has no "Today" on it is a dropdown somebody
    // reads twice looking for it. One that says nothing goes today has
    // answered the question.
    const near = named.map((date) => ({
      date,
      choice: dayChoices.find((one) => one.date === date) ?? null,
    }));
    const further = dayChoices.filter((one) => !named.includes(one.date));
    /*
     * As far out as the box will let somebody look.
     *
     * The last day on offer, which is how far the shop is going, or the
     * last window it knows about where that is further: a cart only one
     * run can carry has tomorrow as its last day on offer, and capping the
     * calendar there means the one question worth asking, what about next
     * week, cannot be asked at all. Past the list it answers rather than
     * refusing, naming the day that does work.
     */
    const furthest = [
      dayChoices.at(-1)?.date ?? today,
      allSlots.at(-1)?.date ?? today,
    ].sort()[1];
    /*
     * The day that is picked, when it is further out than tomorrow.
     *
     * A select whose value matches none of its options does not sit
     * empty: the browser shows the first one it can pick and presents it
     * as the choice. So an order going out on Wednesday sat under a
     * dropdown reading "Tomorrow", with the real date in the line above
     * it and in the box agreeing to it. A day has to be on the list
     * before the list can say it is the one.
     */
    const farDay =
      chosen !== null && !named.includes(chosen.date) ? chosen.date : "";

    /*
     * Both ways of getting it there on the day that is picked.
     *
     * Only where the shop would really offer both, and never to somebody
     * adding to an order, joining a friend or in a group: their car was
     * settled when they were invited and is not theirs to change.
     */
    const onDay = chosen?.date ?? "";
    const bothWays =
      onDay === "" || !offersSameDay
        ? { run: null, cars: [] as typeof carWindows }
        : waysOn(onDay);

    const goTo = (date: string) => {
      if (date === "") return;
      const day = dayChoices.find((one) => one.date === date);
      if (!day) {
        /*
         * The soonest day that does work, by name.
         *
         * "Nothing is going that day. Try another." leaves somebody
         * tapping through a calendar guessing, and on a cart that only one
         * run in the fortnight can carry they can guess for a long time.
         * The shop has the list in its hand, so it says the day.
         */
        const instead =
          date < today
            ? (dayChoices[0] ?? null)
            : (dayChoices.find((one) => one.date > date) ?? null);
        setDayInstead(instead?.date ?? "");
        setDayProblem(
          date < today
            ? instead
              ? "That day has gone."
              : "That day has gone, and nothing is going yet."
            : instead
              ? "Nothing goes that day."
              : "Nothing goes that day, or any day after it. Message us and we will say what we can do."
        );
        return;
      }
      setDayProblem("");
      setDayInstead("");
      // Picked today or tomorrow out of the calendar: those have their own
      // place on the list above, so the dropdown goes back to naming the
      // day and the calendar closes behind it. Left open, the box sat
      // blank underneath a dropdown reading "Pick a date", with the day
      // itself said nowhere.
      if (named.includes(date)) setPickingDate(false);
      if (day.runId !== null) {
        setBatchId(day.runId);
        setDeliverAt("");
      } else if (day.at !== null) {
        setDeliverAt(day.at);
      }
    };

    /*
     * The days as chips, the way the app draws them.
     *
     * A dropdown is one line and hides every answer but the one it is
     * showing, so the question "can I have it tomorrow instead" needs a
     * tap before it can even be asked. Four chips answer it without one,
     * and on the dark card they are the only colour on the screen.
     *
     * Today and tomorrow are always on the row, on offer or not: a row
     * that silently has no Today on it is a row somebody reads twice
     * looking for it. One that says Today is closed has answered them.
     */
    const chipFor = (date: string) => {
      if (date === today) return "Today";
      if (date === dayAfter(today)) return "Tomorrow";
      return runDateLabel(date).replace(/,\s*\d{4}$/, "");
    };

    return (
      <div className="space-y-2.5">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {near.map((one) => {
            const on = chosen?.date === one.date && !pickingDate;
            const shut = one.choice === null;
            return (
              <button
                key={one.date}
                type="button"
                disabled={shut || adding !== null || joining !== null || party !== ""}
                onClick={() => {
                  setPickingDate(false);
                  goTo(one.date);
                }}
                aria-pressed={on}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border-2 px-4 text-sm font-bold transition ${
                  on
                    ? "border-volt bg-volt text-ink"
                    : shut
                      ? "border-shell/20 text-shell/40"
                      : "border-shell/40 text-shell"
                }`}
              >
                {chipFor(one.date)}
                {shut ? " · closed" : ""}
              </button>
            );
          })}

          {further.map((one) => {
            const on = chosen?.date === one.date && !pickingDate;
            return (
              <button
                key={one.date}
                type="button"
                disabled={adding !== null || joining !== null || party !== ""}
                onClick={() => {
                  setPickingDate(false);
                  goTo(one.date);
                }}
                aria-pressed={on}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border-2 px-4 text-sm font-bold transition ${
                  on ? "border-volt bg-volt text-ink" : "border-shell/40 text-shell"
                }`}
              >
                {chipFor(one.date)}
              </button>
            );
          })}

          {/* Always, not only where a further day is already on the row.
              A cart that one run in the fortnight can carry has today and
              tomorrow and nothing else, which is exactly the cart somebody
              wants to look further ahead on. */}
          <button
            type="button"
            disabled={adding !== null || joining !== null || party !== ""}
            onClick={() => {
              setPickingDate(true);
              if (farDay === "" && further[0]) goTo(further[0].date);
            }}
            aria-pressed={pickingDate}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border-2 border-dashed px-4 text-sm font-bold transition ${
              pickingDate ? "border-volt bg-volt text-ink" : "border-shell/40 text-shell"
            }`}
          >
            Another day
          </button>
        </div>

        {/*
            Any day, because a car of its own can go on any of them.

            This was briefly a list of the days with something already
            going, which is the shop's diary rather than the customer's
            question: there is a car for a Monday as much as for a
            Wednesday, and the only difference is the fee. So it is a date
            again.

            `min` and `max` are a suggestion iOS does not take, so a day
            we cannot do says why rather than taking the tap and changing
            nothing, which reads as a broken page.
         */}
        {pickingDate && (
          <div className="space-y-2">
            <input
              type="date"
              className="field"
              min={today}
              max={furthest}
              // Whatever day is chosen, not only the far ones. `far` is
              // empty for today and tomorrow, which left the box blank
              // the moment somebody picked one of them in it.
              value={chosen?.date ?? ""}
              onChange={(e) => goTo(e.target.value)}
              aria-label="The day you want it"
            />
            {dayProblem !== "" && (
              <p className="text-sm text-volt">
                {dayProblem}
                {dayInstead !== "" && (
                  <>
                    {" "}
                    The soonest after it is{" "}
                    <button
                      type="button"
                      onClick={() => goTo(dayInstead)}
                      className="font-semibold underline underline-offset-4"
                    >
                      {runDateLabel(dayInstead)}
                    </button>
                    .
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {/*
            How it comes, on a day where there are two answers.

            The day list holds one entry per day, and where a run is going
            that day the run is the entry: the car would be dearer, and the
            reasoning went that it would be no sooner either. That second
            half is simply not true. Tonight's run is between five and
            seven; a car of its own can be at the block at one o'clock, and
            somebody who wants their lunch at lunchtime had no way to say
            so and no sign that there was anything to say.

            So where a day has both, the day stays one line and this asks
            the second question underneath it. It only ever appears on a
            day that really has both, which is why it is not another
            permanent dropdown on a page that is already long.
        */}
        {bothWays.run !== null && bothWays.cars.length > 0 && (
          <div className="space-y-1.5">
            <label className="label text-shell/70" htmlFor="when-how">
              How it comes
            </label>
            <select
              id="when-how"
              /* text-ink, because this sits on the dark card and a select
                 with no colour of its own inherits the card's: a white box
                 with white words in it. */
              className="field text-ink"
              value={deliverAt === "" ? "run" : `car:${deliverAt}`}
              onChange={(event) => {
                const picked = event.target.value;
                          if (picked === "run") {
                  if (bothWays.run) setBatchId(bothWays.run.id);
                  setDeliverAt("");
                  return;
                }
                // The car rides on that day's run as far as the books are
                // concerned, so the order sits with the rest of the day's
                // work rather than on whichever run the page happened to
                // be showing before.
                if (bothWays.run) setBatchId(bothWays.run.id);
                setDeliverAt(picked.slice(4));
              }}
            >
              <option value="run">
                On the run · {bothWays.run.deliveryWindow || bothWays.run.label}
              </option>
              {bothWays.cars.map((car) => (
                <option key={car.at} value={`car:${car.at}`}>
                  A car of its own · {car.window || car.label}
                </option>
              ))}
            </select>
            {/* The two options say what they are, and the total at the
                bottom changes when you pick. A paragraph explaining a
                dropdown is a paragraph nobody reads. */}
          </div>
        )}

        {/* Under the whole control, calendar and all. Between the dropdown
            and the date box it was describing the day above it while the
            box below it was the thing being changed. */}
        {/* "Get it between 4pm and 6:30pm tomorrow" sat two inches under a
            headline reading BETWEEN 4PM AND 6:30PM, TOMORROW. */}

        {/*
            The one thing this page cannot do.
            
            Everything above is the shop's timetable, and somebody who needs
            it in forty minutes is outside it: there is no option to pick,
            because whether it can be done at all depends on where the car
            is this minute, which only a person knows. Saying so here, with
            the message already written, is better than letting them read
            the list twice and close the tab.

            Quiet on purpose. It sits under the day as a line rather than
            beside the order button as a way out, because most people do not
            need it and a loud escape hatch on a checkout is an invitation
            to leave the checkout.
        */}
        {urgentChat && (
          <p className="text-sm text-shell/70">
            Need another day or time?{" "}
            <a
              href={urgentChat}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-volt underline-offset-4 hover:underline"
            >
              Message us
            </a>
          </p>
        )}
      </div>
    );
  }

  /** Which run, and what it says underneath. The same control wherever it is
   *  shown, so the two ways of ordering read as one decision. */
  function RunPicker() {
    return (
      <div className="space-y-2">
        <select
          className="field"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          disabled={adding !== null}
          aria-label="Delivery run"
        >
          {shownRuns.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.label}
              {batch.lastMinute === true
                ? ` · ${LAST_MINUTE_SAID.toLowerCase()}`
                : now !== null &&
                  ` · closes in ${countdown(new Date(batch.cutOffISO).getTime() - now)}`}
            </option>
          ))}
        </select>
        {selected &&
          (selected.lastMinute === true ? (
            /*
              The closed run that has not been shopped yet.
              
              It cannot say "orders close at half past four" when that was
              an hour ago, and the thing worth saying is the hurry: she is
              about to stand at the counter, and an order that is not paid
              for by then is an order she cannot buy.
            */
            <p className="soft px-3.5 py-2.5 text-sm">
              <span className="font-semibold">{LAST_MINUTE_SAID}.</span> This
              run has closed and the food is about to be bought, so it goes
              out with tonight&rsquo;s car. {payWithinSaid()}. Only the
              counters it has not been to yet are on it.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Orders close {selected.cutOffLabel}. {selected.deliveryWindow}.
            </p>
          ))}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 pb-36">
      <KeepCart
        phone={phone}
        name={name}
        hostel={hostel}
        batchId={batchId}
        items={itemCount}
        value={total}
        /* Named by counter, because "1x Shawarma" is three counters'
           shawarma and the person ringing a cart back has to know which
           car it was going on before they can say anything useful about
           when it could come. */
        summary={cart
          .map((line) => `${line.qty}x ${line.name} (${line.restaurantName})`)
          .join(", ")}
        /* And the basket itself, which is what lets admin turn it back
           into an order without working out from the total which of two
           counters sold the shawarma. */
        lines={JSON.stringify({
          kind: "food",
          lines: cart.map((line) => ({
            itemId: line.itemId,
            optionIds: line.optionIds,
            qty: line.qty,
            forName: line.forName,
          })),
        })}
      />

      {joining && (
        <div className="rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3">
          <p className="font-bold text-brand-dark">
            Riding along with {joining.name}&apos;s delivery
          </p>
          <p className="mt-0.5 text-sm text-ink/80">
            Your food goes in the same car, so you pay a share of one delivery
            rather than a whole one of your own. You pay for your own food and
            your bag is labelled with your name.
          </p>
          <button
            type="button"
            onClick={() => {
              clearJoin();
              setJoining(null);
            }}
            className="mt-2 text-xs font-semibold text-brand-dark underline"
          >
            Order on my own instead
          </button>
        </div>
      )}

      {/* Nobody can see this, so anything in it was not typed by a person.
          Labelled like an ordinary optional field rather than as a trap,
          because a script good enough to read the name is good enough to
          skip one that announces itself. Out of the tab order and hidden
          from a screen reader too: somebody using one is a customer. */}
      <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={TRAP}>Collection reference</label>
        <input id={TRAP} name={TRAP} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* When this page was opened. Nobody fills a checkout in three
          seconds, and a script does the whole thing in one go. */}
      <input type="hidden" name={OPENED} value={openedAt} />

      <input type="hidden" name="cart" value={JSON.stringify(toServerLines(cart))} />
      <input type="hidden" name="coupon" value={applied?.code ?? ""} />
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="group_mode" value={groupOn ? mode : ""} />
      <input type="hidden" name="payment_method" value={method} />
      <input type="hidden" name="pay_currency" value={method === "card" ? money : ""} />
      <input type="hidden" name="collect_mode" value={collect} />
      <input type="hidden" name="join_order_id" value={joining?.id ?? ""} />
      <input type="hidden" name="party_id" value={party} />
      <input type="hidden" name="party_leader" value={joinedLink ? "" : "1"} />
      <input type="hidden" name="deliver_at" value={deliverAt} />
      <input type="hidden" name="people" value={JSON.stringify(people)} />

      {/* A heading the size of a heading. Two lines of BOOK YOUR RUN at
          sixteen percent of the screen is most of a phone, on the page
          where the only thing anybody wants is to finish. The desk keeps
          the big one, where the page is wide and there is room for it. */}
      <h1 className="font-display text-[min(9vw,2.25rem)] font-black uppercase leading-[0.95] sm:text-[clamp(3.5rem,7vw,5.5rem)]">
        Book your run
      </h1>

      {/* The board's two columns: the form, and the order beside it. One
          column at 1,200px wide is a form nobody can read across. */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">

      {adding && (
        <p className="rounded-2xl bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-dark">
          Adding to your {adding.batchLabel} order. It travels in the same car, and
          delivery is charged on this order the same as any other.
        </p>
      )}

      {/* Two different situations, and people get them mixed up if you only
          offer one. Ordering FOR friends is one cart you pay for. Ordering
          WITH friends is everybody buying their own food out of one car. */}

      {/* In a group the car was chosen when the link was made, so this says
          which one it is and asks nothing. Offering a picker here would be a
          second car, which is the opposite of sharing a delivery. */}
      {party !== "" ? (
        <section className="card space-y-1">
          <h2 className="font-bold">
            {joinedLink && partyLeader
              ? `In ${partyLeader}'s group`
              : "Your group"}
          </h2>
          <p className="text-sm text-ink/80">
            {partyWhen
              ? `Arriving ${partyWhen}.`
              : "Everything ordered under your link rides in the same car."}
            {partyPeople > 0 &&
              ` ${partyPeople} ${partyPeople === 1 ? "order" : "orders"} in it so far.`}
          </p>
          <p className="text-sm text-muted">
            You pay for your own food. The delivery is one fee for the whole car,
            split evenly when the group closes.
          </p>
        </section>
      ) : (
      <section className="space-y-2.5">
        {/*
            The ticket, the way the app draws it.

            This was a white card with a step number, a dropdown and four
            paragraphs of grey type under it. The day is the one decision
            on this page, and on the app it is a dark card with the arrival
            in display type and the days as chips under it: you can see the
            answer from across the room and change it with one tap.

            Silent where nothing can carry the cart: there is no arrival to
            promise, and the line under the basket already says what is
            wrong and what to do about it.
         */}
        {!noRunThere && <Step at="01">When</Step>}

        <div className="space-y-3 rounded-2xl bg-ink p-4 text-shell sm:p-5">
          <span className="ticket block text-volt">Choose when you want it</span>
          {arrivingWhen !== "" && !noRunThere && (
            <p className="font-display text-[clamp(1.55rem,6.6vw,2.15rem)] font-black uppercase leading-[0.96]">
              {arrivingWhen}
            </p>
          )}

        {/* And the day is a choice again.

            It was decided and said, on the reasoning that a dropdown asked
            somebody to know the fee ladder and the cut-off before they
            could buy lunch. That is true of a dropdown of runs, which is
            what it was. A dropdown of days is not: everybody knows which
            day they want their food.

            Only where there is more than one day to pick from, and never
            for somebody adding to an order, joining a friend or in a
            group, whose day was settled when they were invited. */}
        {/* Wherever there is a day at all. It used to want two of them,
            on the reasoning that a dropdown with one answer is furniture.
            It is not: the day somebody wants may be neither of the two
            near ones, and the way to ask for it is in here. */}
        {!noRunThere &&
          dayChoices.length > 0 &&
          adding === null &&
          joining === null &&
          party === "" &&
          dayPicker()}

        {/* Before the explaining rather than under it, and named.
            The date above is the surprising part of this page whenever a
            far counter is in the cart, and the only sentence that makes
            sense of it was the third paragraph down in small grey type. */}
        {/*
            Only where there is something to do about it.

            This used to explain the shop's own words back at the customer:
            "The Place is in Ajah, and we only go there on a run." Nobody
            ordering lunch knows or cares what a run is, and on Ajah it was
            not even true, because nothing runs there and the car is the
            only way it ever goes. It also sat over a picker reading today
            between four and seven, so it was explaining a delay that was
            not happening.

            What is worth saying is the one case where the customer can
            act: this shop is why the date is what it is, and taking it out
            brings the rest sooner. Said in days and food, with no word
            about how we drive. Everything else is the shop's business.
        */}
        {farHoldsItUp && withoutFar && (
          <p className="rounded-xl bg-white/10 px-3.5 py-2.5 text-[14.5px] leading-[1.45] text-shell">
            <span className="font-semibold">
              {farWhereSaid}, which is what sets the date above.
            </span>{" "}
            Take {farLines.length === 1 ? "it" : "those"} out and the rest can
            come {withoutFar.said}.{" "}
            <Link href="/cart" className="font-semibold text-volt underline">
              Change the cart
            </Link>
          </p>
        )}


        {/* Half this cart can go out tonight and half of it cannot, and
            which half is a fact about where the car has got to rather than
            anything the customer did. Said plainly, with both ways out of
            it, rather than leaving tonight's run quietly off the list. */}
        {lateRun !== null && beenTo.length > 0 && stillToCome.length > 0 && (
          <p className="soft px-3.5 py-2.5 text-sm">
            <span className="font-semibold">
              We have already been to {saidList(beenTo)} tonight.
            </span>{" "}
            {saidList(stillToCome)} {stillToCome.length === 1 ? "is" : "are"}{" "}
            still ahead of the car, so {stillToCome.length === 1 ? "that" : "those"}{" "}
            can go out today as a last minute order: take the rest out of the
            cart and it comes tonight. For all of it together, pick the next
            run or a car of its own below.
          </p>
        )}

        {/* A run kept to one counter, said before somebody wonders where the
            usual runs went. The headline above already names when this cart
            can actually come; this says why it is not sooner. */}
        {shutSoonest !== null && (
          <p className="text-sm leading-[1.45] text-shell/85">
            <span className="font-semibold">
              {shutSaid} {shutThere.length === 1 ? "is" : "are"} closed on{" "}
              {shutDayWord}s.
            </span>{" "}
            {/* What is still fine, and what taking it out would buy them.
                "Closed" on its own reads as the whole cart being stuck,
                when usually it is one line of it. */}
            {stillFine.length > 0
              ? `${stillFineSaid} ${stillFine.length === 1 ? "is" : "are"} open: take ${shutThere.length === 1 ? "it" : "them"} out and this can go on ${shutSoonest.label}. `
              : ""}
            {openable.length > 0
              ? `Otherwise the next run that can carry everything is ${goingThere?.label ?? "the one below"}.`
              : `${shutSaid} ${shutThere.length === 1 ? "opens" : "open"} again ${openAgainWord}.`}
          </p>
        )}

        {wrongCounter.length > 0 && (
          <p className="text-sm text-brand-dark">
            <span className="font-semibold">
              Not every run stops at {counterSaid}.
            </span>{" "}
            {openable.length > 0
              ? `The next one that does is ${goingThere?.label ?? "the one below"}.`
              : sameDaySlots.length > 0
                ? "None of the runs coming up are, so this goes as a car of its own, at the time you pick below."
                : "None of the runs coming up are."}
          </p>
        )}

        {/* An estimate, and said to be one. A time to the minute is a promise
            nobody can keep in Lagos traffic, and arriving at 4:15 for a four
            o'clock is fine unless somebody was told four o'clock exactly. */}
        </div>

        {/* The offer of a car of its own used to live here, as a sentence:
            "need it sooner, a car can be there at four for 6,500". It was
            the one way of asking for a different arrival when the day was
            decided for you. The dropdown above is that question asked
            properly, so this is the same offer made twice, in the shop's
            words rather than the customer's. Pick the day; the price
            follows. */}
      </section>
      )}



      {/*
          Sharing a run is asked on the cart, and only there.

          It was asked here as well, in the middle of somebody filling in
          their name and their block. Nobody gathers friends after they
          have started paying: by this page the decision is made, so the
          offer is an interruption in the one place that should be a
          straight line to the button.
       */}

      {groupOn && (
        <section className="card space-y-3">
          <div>
            <h2 className="font-bold">Group order · {shares.length} people</h2>
            <p className="text-sm text-muted">
              Bags are labelled with these names.{" "}
              <Link href="/cart" className="font-semibold text-brand">
                Change who has what
              </Link>
              .
            </p>
          </div>

          <ul className="space-y-3">
            {shares.map((share, index) => {
              const person = people.find((p) => p.name === share.person);

              return (
                <li
                  key={share.person || "me"}
                  className="space-y-2 rounded-2xl border border-black/10 bg-white p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold">{share.person || "You"}</span>
                    <span className="text-sm font-semibold">
                      {naira(share.food)}
                      {mode === "split" && (
                        <span className="font-normal text-muted">
                          {" "}+ {naira(feeShares[index] ?? 0)} delivery
                        </span>
                      )}
                    </span>
                  </div>

                  <ul className="space-y-0.5 text-sm text-ink/75">
                    {share.lines.map((line) => (
                      <li key={line.key}>
                        {line.qty}× {line.name}
                        {line.choices.length > 0 && (
                          <span className="text-muted"> · {line.choices.join(", ")}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {person && (
                    <div className="space-y-2 border-t border-black/5 pt-2">
                      {/* Nothing is assumed. Sending a friend's food to your own
                          block because a field was left blank is the kind of
                          mistake that loses a customer. */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-muted">
                          {person.name}&apos;s food goes
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updatePerson(person.name, {
                              goesTo: "mine",
                              hostel: "",
                              phone: "",
                            })
                          }
                          className={`chip py-1.5 text-xs ${
                            person.goesTo === "mine"
                              ? "border-ink bg-ink text-white"
                              : "border-black/10 bg-white"
                          }`}
                        >
                          Where mine goes
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePerson(person.name, { goesTo: "theirs" })}
                          className={`chip py-1.5 text-xs ${
                            person.goesTo === "theirs"
                              ? "border-ink bg-ink text-white"
                              : "border-black/10 bg-white"
                          }`}
                        >
                          To them
                        </button>
                      </div>

                      {person.goesTo === "theirs" && (
                        <div className="flex flex-wrap gap-2">
                          <span className="grow">
                            <input
                              className={`field w-full py-1.5 text-sm ${
                                person.phone.trim() && !normalisePhone(person.phone)
                                  ? "border-brand"
                                  : ""
                              }`}
                              inputMode="tel"
                              placeholder={`${person.name}'s phone`}
                              value={person.phone}
                              onChange={(event) =>
                                updatePerson(person.name, { phone: event.target.value })
                              }
                            />
                            {/* Checked as it is typed, and by the same rule as
                                the payer's own number. A friend's bag with a
                                wrong number on it is a bag nobody can hand
                                over. */}
                            {person.phone.trim() && !normalisePhone(person.phone) && (
                              <span className="mt-1 block text-xs font-semibold text-brand">
                                That number does not look right. 0803 123 4567.
                              </span>
                            )}
                          </span>
                          {hostels.length > 0 ? (
                            <select
                              className="field grow py-1.5 text-sm"
                              value={hostels.includes(person.hostel) ? person.hostel : ""}
                              onChange={(event) =>
                                updatePerson(person.name, { hostel: event.target.value })
                              }
                            >
                              <option value="">{person.name}&apos;s block</option>
                              {hostels.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="field grow py-1.5 text-sm"
                              placeholder={`${person.name}'s hostel or block`}
                              value={person.hostel}
                              onChange={(event) =>
                                updatePerson(person.name, { hostel: event.target.value })
                              }
                            />
                          )}
                        </div>
                      )}

                      {mode === "split" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-muted">
                            {person.name} pays by
                          </span>
                          {(["transfer", "card"] as const).map((way) => (
                            <button
                              key={way}
                              type="button"
                              onClick={() => updatePerson(person.name, { pays: way })}
                              className={`chip py-1.5 text-xs ${
                                (person.pays ?? "transfer") === way
                                  ? "border-ink bg-ink text-white"
                                  : "border-black/10 bg-white"
                              }`}
                            >
                              {way === "transfer" ? "Transfer" : "Card link"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </li>
              );
            })}
          </ul>

          <p className="text-xs text-muted">
            A number each is how anyone in the group gets called when their food
            lands, and in a split it is what their payment link hangs off.
          </p>

          {mode === "split" && (
            <p className="text-xs text-muted">
              A phone number each means everyone gets their own payment link and
              their own narration. Leave one blank and that share sits
              under your number instead.
            </p>
          )}

          <p className="border-t border-black/5 pt-3 text-sm text-muted">
            {collect === "leader"
              ? "Every bag comes to your block, and you hand the rest out."
              : "Each bag goes to the block under its own name. Yours comes to you."}
          </p>

          <fieldset className="space-y-2 border-t border-black/5 pt-3">
            <legend className="label">Who pays?</legend>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                checked={mode === "one_payer"}
                onChange={() => setMode("one_payer")}
              />
              <span>
                <span className="font-semibold">I pay for everything.</span> Friends
                settle up with me.
              </span>
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                checked={mode === "split"}
                onChange={() => setMode("split")}
              />
              <span>
                <span className="font-semibold">Everyone pays their share.</span> A
                payment link each. Anyone unpaid by the cut-off is dropped and the rest
                still travels.
              </span>
            </label>
          </fieldset>
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {/* In a group, the friends' details are already above, so this
              section has to say whose it is. */}
          <Step at="02">{whereHeading}</Step>
          {/* Not to somebody already signed in.

              It asks for the PIN, which is the thing they proved when they
              signed in, to fill in what is already filled in. Offering it
              there reads as the shop not knowing who it is talking to, and
              the shop cannot use it at all when it is taking an order for
              somebody: a PIN only ever goes to the number it belongs to. */}
          {you === null && (
          <FillDetails
            phone={phone}
            onFilled={(me) => {
              setName(me.name);
              setFilled(true);
              if (me.phone) setPhone(me.phone);
              if (me.hostel) setHostel(me.hostel);
              // How they paid last time, kept on their record rather than in
              // this browser, so a new phone does not put somebody who always
              // pays by card back on a transfer.
              if (me.paymentMethod) setMethod(me.paymentMethod);
            }}
          />
          )}
        </div>
        {groupOn && !ownFood && !bagsToMe && (
          <p className="text-sm text-muted">
            Nothing in this cart is coming to you, but we still need somebody to call if a
            bag cannot be handed over.
          </p>
        )}
        {filled && (
          <p className="rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
            Filled in from your last order. Change anything that has moved.
          </p>
        )}

        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            placeholder="0803 123 4567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            readOnly={Boolean(adding)}
            className={`field ${badPhone ? "border-red-400 ring-4 ring-red-100" : ""}`}
            autoComplete="tel"
          />
          {/* Only when it is wrong. "This is how you are reached" under a
              box labelled Phone is the form explaining itself to somebody
              who has filled in a form before. */}
          {badPhone && (
            <p className="mt-1 text-xs text-brand">
              A Nigerian mobile: 0803 123 4567, or +234 803 123 4567.
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="hostel">Hostel / block</label>
          {hostels.length > 0 ? (
            <>
              {/*
                  A few to tap, and the rest behind one word.

                  Sixteen blocks as chips is four rows of fat buttons
                  pushing the rest of the form off the screen, on the one
                  page where somebody is trying to finish. A plain dropdown
                  hides the common answer behind a tap and a scroll. So:
                  the first few where a thumb can reach them, and all
                  sixteen one tap away, which is what the app does.
               */}
              {(() => {
                /*
                 * Their own block first, where we know it.
                 *
                 * Somebody signed in, or who has ordered on this phone
                 * before, has already told us where they live, and it is
                 * the same answer every time. So it is filled in and it is
                 * the first chip rather than the eleventh: the one tap
                 * this field needs is checking that it still says Queen
                 * Mary, not finding Queen Mary.
                 */
                const few = hostels.includes(hostel)
                  ? [hostel, ...hostels.filter((one) => one !== hostel)].slice(0, 5)
                  : hostels.slice(0, 5);
                const open =
                  allBlocks || (hostel !== "" && !few.includes(hostel));
                return open ? (
                  <select
                    id="hostel"
                    name="hostel"
                    required
                    value={hostels.includes(hostel) ? hostel : ""}
                    onChange={(event) => setHostel(event.target.value)}
                    className="field"
                  >
                    <option value="" disabled>
                      Pick your block
                    </option>
                    {hostels.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    role="radiogroup"
                    aria-label="Hostel block"
                    className="flex flex-wrap gap-1.5 sm:gap-2"
                  >
                    {few.map((name) => (
                      <label
                        key={name}
                        className={`chip min-h-11 cursor-pointer px-3 text-sm font-semibold sm:px-4 sm:text-[15px] ${
                          hostel === name
                            ? "border-ink bg-brand text-white"
                            : "border-line bg-paper"
                        }`}
                      >
                        <input
                          type="radio"
                          name="hostel"
                          value={name}
                          required
                          checked={hostel === name}
                          onChange={() => setHostel(name)}
                          className="sr-only"
                        />
                        {name}
                      </label>
                    ))}
                    {hostels.length > few.length && (
                      <button
                        type="button"
                        onClick={() => setAllBlocks(true)}
                        className="chip min-h-11 border-dashed border-ink/40 bg-paper px-3 text-sm font-semibold sm:px-4 sm:text-[15px]"
                      >
                        All {hostels.length} blocks
                      </button>
                    )}
                  </div>
                );
              })()}
              {hostel !== "" && !hostels.includes(hostel) && (
                <p className="mt-1 text-xs text-brand">
                  You used &quot;{hostel}&quot; last time, which is not on the
                  list any more. Pick the closest block.
                </p>
              )}
            </>
          ) : (
            <input
              id="hostel"
              name="hostel"
              required
              value={hostel}
              onChange={(event) => setHostel(event.target.value)}
              placeholder="Block and room, or the hostel name"
              className="field"
            />
          )}
        </div>

        {/* Asked once, in the only place a first order passes through.
            Whoever they name is theirs for life, so it is worth a line on a
            form people are already filling in, and "somewhere else" is a
            real answer: most people are nobody's referral. */}
        <HeardFrom
          promoters={promoters}
          sentBy={sentBy}
          value={heardFrom}
          onChange={setHeardFrom}
        />

        {/* Buying it for somebody else. Folded away, because nearly every
            order is for whoever is typing, and two more boxes on every
            checkout would be a tax on all of them to serve the few.

            Not offered in a group: a group is already several people with
            their own names and blocks, and a gift inside one is two answers
            to the same question. */}
        {!shared && !groupOn && (
          <details className="rounded-xl bg-black/[0.03] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-brand">
              Sending this to somebody else?
            </summary>
            <p className="mt-2 text-xs text-muted">
              Fill these in and it goes to them instead. You pay, and we deal
              with you about the money. Put their block above, and their name
              and number here so we know who to call when it is at their door.
              Leave them blank and it comes to you.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="gift_name">Their name</label>
                <input id="gift_name" name="gift_name" className="field" />
              </div>
              <div>
                <label className="label" htmlFor="gift_phone">Their number</label>
                <input id="gift_phone" name="gift_phone" inputMode="tel" className="field" />
              </div>
            </div>
          </details>
        )}

        <div>
          <label className="label" htmlFor="customer_note">
            Anything we should know? (optional)
          </label>
          <textarea
            id="customer_note"
            name="customer_note"
            rows={2}
            maxLength={300}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="No pepper, call me when you are outside, room 12"
            className="field"
          />
        </div>
      </section>

      <section className="card space-y-3">
        <Step at="03">How are you paying?</Step>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["transfer", "Bank transfer", "Account details on the next screen, with a four-digit number to put in the narration."],
              // Nothing for them to do: the link comes to them. The old
              // wording read as a chore before they had even ordered.
              ["card", "Card", "We send the link to your WhatsApp after you order. Pay it there."],
            ] as const
          ).map(([value, title, detail]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              aria-pressed={method === value}
              className={`flex flex-col gap-1.5 rounded-xl border-2 border-ink p-4 text-left transition ${
                method === value
                  ? "bg-ink text-shell shadow-[4px_4px_0_#e5321d]"
                  : "bg-paper"
              }`}
            >
              <span className="block text-[17px] font-bold">{title}</span>
              <span
                className={`block text-sm ${
                  method === value ? "text-rail-text" : "text-muted"
                }`}
              >
                {detail}
              </span>
            </button>
          ))}
        </div>

        {/* Only under the card, because that is what it is: the same link
            sent on WhatsApp, made out in their money. A parent in London
            cannot make a Nigerian transfer, and this is all they need from
            us. */}
        {method === "card" && monies.length > 0 && (
          <div className="rounded-xl bg-shell p-3">
            <p className="text-sm font-bold text-ink">
              Is somebody abroad paying for this?
            </p>
            <p className="mt-0.5 text-xs text-muted">
              We send you a card link in their money, and you pass it on to
              them. The order is still {naira(total)}; the amount on the link
              is worked out at our rate, so it is close rather than exact.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMoney("")}
                className={`chip ${money === "" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"}`}
              >
                No, naira
              </button>
              {monies.map((one) => (
                <button
                  key={one.code}
                  type="button"
                  onClick={() => setMoney(one.code)}
                  className={`chip ${money === one.code ? "border-brand bg-brand text-white" : "border-black/10 bg-white"}`}
                >
                  {one.label}
                  {one.rate > 0 && (
                    <span className={money === one.code ? "text-white/75" : "text-muted"}>
                      about {one.symbol}
                      {(Math.ceil((total / one.rate) * 10) / 10).toFixed(2)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

        </div>

      <aside
        aria-label="Order summary"
        className="overflow-hidden rounded-2xl border-2 border-ink bg-paper text-sm shadow-card lg:sticky lg:top-24 lg:w-[360px] lg:shrink-0 lg:shadow-[8px_8px_0_#15110e]"
      >
        {/* The ticket at the top of the summary: which run, and whose block
            it is going to. Both are chosen in the form beside this, and the
            board puts them here so the two halves of the answer are never
            on different screens. */}
        <div className="flex flex-col gap-2 bg-ink px-5 py-4 text-shell">
          <span className="ticket text-volt">Your run</span>
          <span className="font-display text-[28px] font-extrabold uppercase leading-none">
            {noRunThere
              ? "Nothing going yet"
              : arriving !== ""
                ? arriving
                : "Pick a run"}
          </span>
          <div className="border-t-2 border-dashed border-[#4a423b]" />
          <div className="flex justify-between gap-3">
            <span className="text-[#b9b0a5]">Drop-off</span>
            <span className="truncate font-semibold">
              {hostel.trim() === "" ? "Pick your block" : hostel}
            </span>
          </div>
        </div>

        <div className="space-y-1 p-4">
        {/* The way back. Everything above is about what this order costs and
            when it lands, and the answer to both is often "take something
            out", which needed the browser's back button to act on. */}
        <div className="flex items-baseline justify-between">
          <span className="font-bold text-ink">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
          <Link href="/cart" className="font-semibold text-brand">
            Change the cart
          </Link>
        </div>

        {/* What is actually in it. The summary used to give the number of
            items and nothing else, so the only way to check the order was
            the one thing it was asking you not to do: leave the page. */}
        <ul className="space-y-1.5 py-1.5">
          {cart.map((line) => (
            <li key={line.key} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="font-mono font-semibold">{line.qty}×</span>{" "}
                {line.name}
                {/* No counter on the bag of ice: it is bought beside
                    whichever of them the ice cream came from, and naming
                    one says the car is going somewhere it is not. */}
                <span className="text-muted">
                  {" "}· {line.itemId === iceItemId ? "added by us" : line.restaurantName}
                </span>
                {line.choices.length > 0 && (
                  <span className="text-muted"> · {line.choices.join(", ")}</span>
                )}
              </span>
              <span className="whitespace-nowrap font-semibold">
                {naira(line.unitPrice * line.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t-2 border-dashed border-line" />
        <div className="flex justify-between text-muted">
          <span>Food</span>
          <span>{naira(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>
            {sameDay
              ? // The day is said underneath, the same as it is for a run.
                // Saying it here as well printed "Delivery between 4pm and
                // 7pm tomorrow" with "Between 4pm and 7pm tomorrow" directly
                // under it.
                `Delivery${sameDay.urgent ? " · urgent" : ""}`
              : shared
              ? "Delivery"
              : `Delivery (${itemCount} item${itemCount === 1 ? "" : "s"})`}
            {/* When it lands, beside what it costs. The two decide each
                other, and reading the total without the day meant scrolling
                back up to find out what the money was buying. */}
            {arrivingWhen !== "" && !noRunThere && (
              <span className="block text-xs">{arrivingWhen}</span>
            )}
          </span>
          <span>
            {shared && !sameDay
              ? "worked out when the group closes"
              : charged === 0
                ? "Free"
                : naira(charged)}
          </span>
        </div>
        {/* Two errands on one trip. The rungs answer nothing here: what the
            customer wants is the two halves and what they add up to, which
            is the thing that makes seven thousand out of a five item cart
            look like a mistake. */}
        {!shared && !promotion && !sameDay && byValue.length > 0 && (
          <details className="group text-sm sm:mt-1">
            <summary className="cursor-pointer list-none text-muted underline decoration-dotted underline-offset-4">
              Why this much?
            </summary>
            <ul className="mt-2 space-y-1 rounded-xl bg-black/[0.03] p-3">
              {marketHalf.length > 0 && (
                <li className="flex justify-between text-muted">
                  <span>Market shopping, {naira(cartSubtotal(marketHalf))}</span>
                  <span>{naira(feeForValue(cartSubtotal(marketHalf), byValue))}</span>
                </li>
              )}
              {restHalf.length > 0 && (
                <li className="flex justify-between text-muted">
                  <span>
                    {countItems(restHalf)} item
                    {countItems(restHalf) === 1 ? "" : "s"} from the kitchens
                  </span>
                  <span>
                    {naira(
                      feeFor(countItems(restHalf), selected?.flashFee ?? null, bands)
                    )}
                  </span>
                </li>
              )}
              {/* What the cool box adds, said as its own line. The panel
                  showed four thousand for the kitchens and four and a half
                  at the bottom, with nothing anywhere saying where the
                  five hundred came from. */}
              {ridesAlongAdds > 0 && (
                <li className="flex justify-between text-muted">
                  <span>
                    {ridingCount} picked up on the way
                  </span>
                  <span>{naira(ridesAlongAdds)}</span>
                </li>
              )}
              {area.runExtra > 0 && (
                <li className="flex justify-between text-muted">
                  <span>{area.name} is a longer trip</span>
                  <span>{naira(area.runExtra)}</span>
                </li>
              )}
              {/* Said as its own line rather than folded into the one
                  above, which names a single area and would be quietly
                  wrong about why the number moved. */}
              {secondStop > 0 && (
                <li className="flex justify-between text-muted">
                  <span>A second stop, in {farNames}</span>
                  <span>{naira(secondStop)}</span>
                </li>
              )}
              <li className="flex justify-between border-t border-black/10 pt-1 font-bold text-ink">
                <span>Delivery</span>
                <span>{naira(charged)}</span>
              </li>
            </ul>
            <p className="mt-2 text-muted">
              {marketHalf.length > 0 && (
                <>
                  Two errands on one trip. The market shopping is priced by what
                  it comes to, because a trip to the market is one trip whether
                  it is two bags or five. The kitchens are priced by how much
                  room the food takes in the car.{" "}
                </>
              )}
              {marketHalf.length === 0 &&
                "Priced by how much room the food takes in the car. "}
              {ridesAlongAdds > 0 &&
                "The ice cream is small and we pass it on the way, so it adds a little rather than a trip of its own. "}
              One fee either way, however many places are in it.
            </p>
          </details>
        )}

        {/* Four items costing more than three looks arbitrary until the whole
            ladder is there, so it is one tap away. */}
        {!shared && !promotion && !sameDay && byValue.length === 0 && (
          <FeeBands
            itemCount={itemCount}
            flashFee={selected?.flashFee ?? null}
            bands={bands}
            // Where the cart reaches past Sangotedo the whole ladder is
            // higher, and a ladder that is higher for no stated reason reads
            // as the price having gone up. It is the trip that is longer.
            note={
              farExtra > 0
                ? `${secondStop > 0 ? `Your order comes from ${farNames}, which is two stops rather than one` : `${area.name} is a longer trip than Sangotedo`}, so every rung is ${naira(farExtra)} more. One fee for the whole order, however many restaurants are in it: it is the car, not the food, so it goes by how much room your order takes.`
                : undefined
            }
          />
        )}
        {/* The same question, and a sharper one, for a car of its own: this
            is the dearest way to get food here, and the number is meaningless
            until you can see both the rung it landed on and the run it could
            have been on instead. The way out is a tap, inside the answer. */}
        {!shared && !promotion && sameDay && byValue.length === 0 && (
          <FeeBands
            itemCount={itemCount}
            flashFee={null}
            bands={sameDayBands}
            extra={
              sameDay.urgent && urgentExtra > 0
                ? { label: "Leaving within the hour", fee: urgentExtra }
                : null
            }
            note="A car of its own is one order, one driver, one trip, so there is nobody to share the petrol with. A run carries everybody at once, which is why it costs less."
          />
        )}
        {/* "Pay 2,500 less: Wednesday is 4,000. Tap to move onto it" used
            to sit here. It was money off for somebody who had not asked,
            back when the day was decided for them and this was the only way
            to change it. The day is a choice at the top of the page now, so
            this was the same offer made twice, the second time as a nag
            under the total. */}
        {/* Above the total, where money taken off belongs. Below it, the
            total read as the price before the discount and the line under it
            read as a promise nothing had been done about. */}
        {applied && (
          <div className="flex justify-between font-semibold text-mint">
            <span>Code {applied.code}</span>
            <span>−{naira(applied.discount)}</span>
          </div>
        )}
        {!applied && perk.kind === "applied" && (
          <div className="flex justify-between font-semibold text-mint">
            <span>{creditName ? `${creditName}'s link` : perk.label}</span>
            <span>−{naira(perk.discount)}</span>
          </div>
        )}
        {!applied && perk.kind === "offer" && (
          <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm text-brand-dark">
            {perk.note} is already on this order, so it is that rather than
            the discount on the link. Only one offer applies at a time.
          </p>
        )}
        <div className="flex items-baseline justify-between border-t-2 border-dashed border-line pt-3">
          <span className="text-lg font-bold">
            {shared ? "Food so far" : "Total"}
          </span>
          <span className="font-display text-[40px] font-black leading-none">
            {naira(total)}
          </span>
        </div>
        {/* The order is in naira and stays in naira: that is what is owed and
            what the books are kept in. Picking pounds changes what the card
            link is made out for, and without saying so here the button looks
            like it did nothing at all. */}
        {method === "card" &&
          money !== "" &&
          (() => {
            const picked = monies.find((one) => one.code === money);
            if (!picked || picked.rate <= 0) return null;
            return (
              <p className="text-xs text-muted">
                The card link will be for about {picked.symbol}
                {(Math.ceil((total / picked.rate) * 10) / 10).toFixed(2)}, which
                is this same {naira(total)} at our rate.
              </p>
            );
          })()}
        {shared && (
          <p className="text-xs text-muted">
            One delivery fee for the whole car, split evenly between everybody in
            it. The more of you there are, the less each of you pays, so nobody
            can be told their share until the last person is done.
          </p>
        )}
        {/* A code is a thing somebody was given in a group chat, so it is
            typed in rather than carried by the link they happened to open. */}
        <CouponBox
          batchId={batchId}
          cart={JSON.stringify(toServerLines(cart))}
          phone={phone}
          applied={applied}
          onApplied={setApplied}
          // What the link is already worth, so the box does not sit open
          // inviting a second code that could not be taken anyway.
          perk={
            !applied && perk.kind === "applied"
              ? {
                  label: creditName
                    ? `${perk.label}, from ${creditName}`
                    : perk.label,
                  discount: perk.discount,
                }
              : null
          }
        />
        </div>
      </aside>
      </div>

      <div data-actionbar className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t-2 border-ink bg-shell px-4 pb-4 pt-3 sm:bottom-0">
        <div className="mx-auto max-w-2xl space-y-2">
          {unresolved.length > 0 && (
            <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
              {/* Name the thing that is actually missing. "Say where it goes"
                  is unhelpful when what is wrong is a mistyped number. */}
              {unresolved[0].goesTo !== "theirs"
                ? `Say where ${unresolved[0].name}'s food goes: to your block with yours, or to them with their own number.`
                : !normalisePhone(unresolved[0].phone)
                  ? `${unresolved[0].name}'s number does not look right. It goes to them, so it has to be one that works.`
                  : `Pick the block ${unresolved[0].name}'s food goes to.`}
            </p>
          )}
          {noRunThere && (
            <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
              {/* The way out is named, because "no run" on its own leaves
                  somebody holding a cart with nothing to do about it. */}
              No run is going to {farNames} just now, and a car of its own
              cannot get there and back in time.{" "}
              {farLines.length < cart.length && withoutFar
                ? `Take ${farLines.length === 1 ? "that one" : "those"} out and the rest can come ${withoutFar.said}.`
                : farLines.length < cart.length
                  ? `Take ${farLines.length === 1 ? "that one" : "those"} out and the rest can still come.`
                  : "Check back when the next one is up, or message us."}
            </p>
          )}
          {/* Nothing coming up stops there and no car can go either. Said
              here, beside the button, because this is the moment somebody
              finds out they cannot buy what is in the basket. */}
          {wrongCounter.length > 0 && openable.length === 0 && sameDaySlots.length === 0 && (
            <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
              No run coming up is stopping at {counterSaid}, and a car of its
              own cannot go just now. Check back when the next run is up, or
              take those things out of the cart.
            </p>
          )}
          {state.error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {state.error}
            </p>
          )}
          {/*
              The day is said, not sworn to.

              There was a tick box here: "this is not coming today, tick to
              say that works for you", in front of the button, on every
              order that was not for today. It went in after somebody
              expected a Saturday burger that afternoon. The day is now the
              first thing on the page, in the card where it is picked, in
              type you cannot miss, and a box asking somebody to agree to
              what they themselves chose is a page that does not believe
              them. A tick everybody learns to click is worth nothing
              anyway.
           */}

          <div className="flex items-center gap-3">
            <span className="flex shrink-0 flex-col">
              <span className="ticket text-muted">
                {shared ? "So far" : "Total"}
              </span>
              <span className="font-display text-[32px] font-black leading-none">
                {naira(total)}
              </span>
            </span>
          <button
            type="submit"
            className="btn-primary flex-1 border-2 border-ink py-4 text-base"
            disabled={
              pending ||
              // A group brings its own car, so an empty run list is not a
              // reason to lock the button: there may be no run open at all.
              (!batchId && party === "" && !sameDay) ||
              noRunThere ||
              !splitReady ||
              unresolved.length > 0
            }
          >
            {pending
              ? "Placing…"
              : shared
                ? "Put my food in"
                : `Place order · ${method === "card" ? "Card" : "Transfer"}`}
          </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/**
 * A step's heading, the way the board sets one: the number in the display
 * face, in Tomato, beside the words. The numbers are what make four cards
 * read as one form rather than as four separate questions.
 */
function Step({ at, children }: { at: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[17px] font-bold sm:text-xl">
      <span className="font-display text-[30px] font-black leading-none text-brand sm:text-4xl">
        {at}
      </span>
      {children}
    </h2>
  );
}
