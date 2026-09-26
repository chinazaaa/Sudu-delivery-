"use client";

import Link from "next/link";
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
  dearestArea,
  runCovers,
  withExtra,
  type Area,
} from "@/lib/areas";
import { runCarries } from "@/lib/run-places";
import { offerShare, pickOffer, type LiveOffer } from "@/lib/offers";
import { normalisePhone } from "@/lib/phone";
import { OPENED, TRAP } from "@/lib/guard";
import FeeBands from "./FeeBands";
import { naira } from "@/lib/money";
import { feeAcross, type ValueBand } from "@/lib/value-bands";
import { ladderFor, pricesByValue } from "@/lib/areas-shared";
import CouponBox from "@/components/CouponBox";
import { clearJoin, readJoin } from "@/components/JoinDelivery";
import GroupLink, {
  joinedViaLink,
  leaveGroup,
  PARTY_CHANGED,
  readGroup,
} from "@/components/GroupLink";
import { aroundPhrase, type Slot } from "@/lib/same-day";
import { ESTIMATE_NOTE, nextArrival, runArrival } from "@/lib/arrival";
import FillDetails from "@/components/FillDetails";
import KeepCart from "@/components/KeepCart";
import { countdown } from "@/lib/time";
import type { GroupMode } from "@/lib/types";
import type { BatchView } from "@/lib/view";

type JoinLoad = {
  id: string;
  name: string;
  batchId: string;
  items: number;
  feeCharged: number;
};

export type AddingTo = {
  batchId: string;
  batchLabel: string;
  phone: string;
  name: string;
  hostel: string;
  items: number;
  feeCharged: number;
};

export default function Checkout({
  batches,
  today,
  adding,
  sameDaySlots: allSlots,
  sameDayBands: baseSameDayBands,
  urgentExtra,
  bands: baseBands,
  areas,
  areaOf,
  valueBandsOf,
  offers,
  hostels,
  promoters,
  monies = [],
}: {
  batches: BatchView[];
  /** Today in Lagos, from the shop's clock: it decides whether a run going
   *  today opens instead of a time of their own. */
  today: string;
  adding: AddingTo | null;
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
  /** The kitchens that price by what the shopping comes to rather than by
   *  how many things it is, by id. A market is one; a restaurant is not. */
  valueBandsOf: Record<string, ValueBand[]>;
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
  const bands = withExtra(baseBands, area.runExtra);
  // A kitchen that charges by what the shopping comes to rather than by how
  // many things it is. A market trip is one trip and two bags, and the
  // container ladder would call eleven peppers eleven containers.
  const byValue = ladderFor(kitchens, valueBandsOf);
  // Two errands, two fees: the market half by what the shopping comes to,
  // the restaurant half by how much of the car it fills.
  const marketHalf = cart.filter((line) => pricesByValue(line.restaurantId, valueBandsOf));
  const restHalf = cart.filter((line) => !pricesByValue(line.restaurantId, valueBandsOf));
  const sameDayBands = withExtra(baseSameDayBands, area.sameDayExtra);
  // One thing from a far area makes the whole order a run: a car cannot be
  // in two places in three hours.
  const sameDaySlots = canGoSameDay(cartAreas) ? allSlots : [];

  const openable = batches.filter(
    (b) => !b.closed && !b.full && runCovers(b.areas, cartAreas) && runCarries(b.onlyPlaces, kitchens)
  );

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
  const farNames = far.map((one) => one.name).join(" and ");
  const farLines = cart.filter((line) =>
    far.some((one) => one.id === (areaOf[line.restaurantId] ?? ""))
  );
  const noRunThere = far.length > 0 && openable.length === 0;


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
  // car of its own today, a run tomorrow, tomorrow's first window.
  const todayRun = openable.find((one) => one.runDate === today) ?? null;
  const todaySlot = sameDaySlots.find((one) => one.day === "today") ?? null;
  const laterRun = openable.find((one) => one.runDate > today) ?? null;
  const laterSlot = sameDaySlots.find((one) => one.day !== "today") ?? null;
  const decided = nextArrival(openable.map(runArrival), sameDaySlots, today);
  // A car of its own still carries a run id, because that is what the
  // coupon and the offer rules are asked about. The time is what decides
  // the price, and it wins wherever both are set.
  const [batchId, setBatchId] = useState(
    adding?.batchId ?? decided?.runId ?? openable[0]?.id ?? ""
  );

  // The run is picked once, when the page is drawn, and the cart can change
  // after that. Adding something from Lekki to a cart that was going out
  // tomorrow leaves tomorrow's run picked although it cannot carry it, so the
  // page said "get it between 5pm and 7pm tomorrow" directly above "no run is
  // going to Lekki/Ikoyi". Whenever the picked run cannot carry what is in
  // the cart, it moves to one that can.
  //
  // Not while adding to an order already placed: that one is locked to its
  // own run, which is the whole point of adding to it.
  if (
    adding === null &&
    batchId !== "" &&
    !openable.some((one) => one.id === batchId)
  ) {
    setBatchId(decided?.runId ?? openable[0]?.id ?? "");
  }
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
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
  const [name, setName] = useState(adding?.name ?? "");
  const [phone, setPhone] = useState(adding?.phone ?? "");
  const [hostel, setHostel] = useState(adding?.hostel ?? "");
  const [filled, setFilled] = useState(false);
  const [note, setNote] = useState("");
  // Set once, when the page is drawn, rather than read at submit: what
  // matters is how long it was open.
  const [openedAt] = useState(() => Date.now());
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitOrder, {
    error: null,
  });

  useEffect(() => {
    if (adding) return;
    try {
      const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "null");
      if (saved?.name) setName((current) => current || saved.name);
      if (saved?.phone) setPhone((current) => current || saved.phone);
      if (saved?.hostel) setHostel((current) => current || saved.hostel);
      if (saved?.method === "card" || saved?.method === "transfer") setMethod(saved.method);
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
  }, [adding]);

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
  const [deliverAt, setDeliverAt] = useState(decided?.at ?? "");
  const sameDay = sameDaySlots.find((one) => one.at === deliverAt) ?? null;
  const shared = joining !== null || party !== "";

  const alreadyItems = adding?.items ?? 0;
  const alreadyCharged = adding?.feeCharged ?? 0;

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

  const fee = promotion
    ? promotion.fee
    : sameDay
    ? sameDayFee(itemCount, sameDay.urgent, sameDayBands, urgentExtra)
    : shared
    ? 0
    : byValue.length > 0
      ? // Nothing but market shopping is charged by what the shopping comes
        // to. Mix a restaurant in and the dearer of the two measures comes
        // back, so a pepper added to twelve pizzas cannot drop the whole
        // order onto the market's ladder.
        feeAcross({
          marketFood: cartSubtotal(marketHalf),
          // The container count floors at one, which is right for a cart and
          // wrong for half of one: no restaurant lines must mean no
          // restaurant fee, not the price of a container nobody ordered.
          restaurantFee: (() => {
            const containers =
              (restHalf.length === 0 ? 0 : countItems(restHalf)) + alreadyItems;
            return containers === 0
              ? 0
              : feeFor(containers, selected?.flashFee ?? null, bands);
          })(),
          bands: byValue,
        }) +
        area.runExtra
      : Math.max(
          0,
          feeFor(itemCount + alreadyItems, selected?.flashFee ?? null, bands) - alreadyCharged
        );

  /**
   * When this order arrives, in the same words as the front page.
   *
   * A run is the window it delivers in: "between 12pm and 2pm today". A car
   * of its own is three hours out, so it is the time it lands: "around
   * 4:30pm today". One sentence either way, and the line under it says
   * plainly that a time is an estimate.
   */
  const onARun = deliverAt === "";
  const runNow = batches.find((one) => one.id === batchId) ?? null;
  const arriving = onARun
    ? runNow
      ? runArrival(runNow).said
      : "on the next run"
    : sameDay
      ? `${aroundPhrase(sameDay.at)} ${sameDay.day}`
      : "on the next run";

  // The same arrival as a line of its own rather than the tail of a
  // sentence: "Between 3:30pm and 5:30pm, Saturday, 26 Sept". Beside the
  // delivery fee, where what the money buys is the question being asked.
  const arrivingWhen = onARun
    ? runNow
      ? runArrival(runNow).when
      : ""
    : sameDay
      ? `${aroundPhrase(sameDay.at).charAt(0).toUpperCase()}${aroundPhrase(sameDay.at).slice(1)} ${sameDay.day}`
      : "";

  /*
   * Comparing one way of getting the food here with the other.
   *
   * Only where the fee comes from the container ladder on both sides. A
   * market is priced by what the shopping comes to, and a promotion is a
   * price rather than a ladder, so there is nothing to compare.
   */
  const comparable =
    !shared && !promotion && itemCount > 0 && byValue.length === 0;

  /**
   * The next run, for somebody in a car of its own.
   *
   * Named whether or not it is cheaper. It usually is, by thousands, but a
   * run that costs the same is still the answer to "when else could I get
   * this", and hiding it because the arithmetic came out level leaves the
   * question looking unanswered.
   */
  const runInstead = (() => {
    const run = todayRun ?? laterRun;
    if (!comparable || onARun || !run || !sameDay) return null;

    const fee = Math.max(
      0,
      feeFor(itemCount + alreadyItems, run.flashFee, bands) - alreadyCharged
    );
    const now = sameDayFee(itemCount, sameDay.urgent, sameDayBands, urgentExtra);
    return { id: run.id, label: run.label, fee, saving: Math.max(0, now - fee) };
  })();

  /**
   * The other direction: somebody on a run may not know a car today is even
   * possible. Only worth a sentence when it costs more, because a car that
   * were somehow cheaper would already have been chosen for them.
   */
  const carSooner = (() => {
    const soon = todaySlot ?? laterSlot;
    if (!comparable || !onARun || !soon) return null;

    const runFee = Math.max(
      0,
      feeFor(itemCount + alreadyItems, null, bands) - alreadyCharged
    );
    const fee = sameDayFee(itemCount, soon.urgent, sameDayBands, urgentExtra);
    return fee > runFee ? { fee, phrase: soon.phrase, at: soon.at } : null;
  })();

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
  const total = Math.max(0, subtotal + charged - (applied?.discount ?? 0));

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

  if (cart.length === 0) {
    return (
      <Empty icon="cart" title="Your cart is empty" href="/" action="Browse the menu">
        Pick a few things and they gather here, ready to go on the next run.
      </Empty>
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
              {now !== null &&
                ` · closes in ${countdown(new Date(batch.cutOffISO).getTime() - now)}`}
            </option>
          ))}
        </select>
        {selected && (
          <p className="text-sm text-muted">
            Orders close {selected.cutOffLabel}. {selected.deliveryWindow}.
          </p>
        )}
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
        summary={cart
          .map((line) => `${line.qty}x ${line.name}`)
          .join(", ")}
      />

      {joining && (
        <div className="rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3">
          <p className="font-bold text-brand-dark">
            Riding along with {joining.name}&apos;s delivery
          </p>
          <p className="mt-0.5 text-sm text-ink/80">
            Your food goes in the same car, so you only pay the difference in
            delivery, never a second fee. You pay for your own food and your bag
            is labelled with your name.
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

      <h1 className="text-2xl font-extrabold">Checkout</h1>

      {adding && (
        <p className="rounded-2xl bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-dark">
          Adding to your {adding.batchLabel} order. Same bag, and more delivery only if
          this pushes you into a bigger load.
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
      <section className="card space-y-2">
        {/* Decided, not asked, and said the same way as the front page. A
            dropdown here asked somebody to know the fee ladder and the cut
            off before they could buy lunch.

            Silent where nothing can carry the cart: there is no arrival to
            promise, and the line under the basket already says what is
            wrong and what to do about it. */}
        {!noRunThere && (
          <h2 className="text-lg font-extrabold text-ink">Order now, get it {arriving}</h2>
        )}

        {!noRunThere && (
          <p className="text-sm text-muted">
            {onARun
              ? "Everybody's food in one car, which is why it costs less."
              : "A car of its own, because no run is going in time for this."}
          </p>
        )}

        {/* One line, because three paragraphs about Lekki is three
            paragraphs nobody reads. Why it waits for a run, and the way out
            if waiting is the wrong trade. Why the fee is higher belongs in
            "Why this much?", which is where somebody asks it. */}
        {far.length > 0 && !noRunThere && (
          <p className="text-sm text-brand-dark">
            <span className="font-semibold">{farNames} goes out on a run only.</span>{" "}
            {farHoldsItUp && withoutFar ? (
              <>
                Take {farLines.length === 1 ? "it" : "those"} out and the rest
                can come {withoutFar.said}.{" "}
                <Link href="/cart" className="font-semibold underline">
                  Change the cart
                </Link>
              </>
            ) : (
              "Everything here travels together, so there is one delivery fee."
            )}
          </p>
        )}

        {/* A run kept to one counter, said before somebody wonders where the
            usual runs went. The headline above already names when this cart
            can actually come; this says why it is not sooner. */}
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
        <p className="text-sm text-muted">{ESTIMATE_NOTE}</p>

        {/* The one choice worth keeping. Where waiting for a run would save
            real money, it is offered as a sentence rather than as a menu: a
            car of its own can be two and a half thousand dearer, and nobody
            should pay that without being told there was another way. */}
        {carSooner !== null && (
          <button
            type="button"
            onClick={() => setDeliverAt(carSooner.at)}
            className="block w-full rounded-xl bg-brand-tint px-3 py-2 text-left text-sm font-semibold text-brand-dark"
          >
            Need it sooner? A car of its own can be there {carSooner.phrase},
            for {naira(carSooner.fee)}.{" "}
            <span className="underline decoration-dotted underline-offset-4">
              Tap for that instead.
            </span>
          </button>
        )}
      </section>
      )}



      {/* The same one tap as the cart and the item sheet. There used to be a
          tick box here saying "put your food in and you get a link", which is
          the wrong way round: nobody invites their friends after they have
          finished ordering. */}
      {!groupOn && !joining && party === "" && (
        <section className="space-y-3">
          <GroupLink
            runs={openable.map(runArrival)}
            slots={sameDaySlots}
            today={today}
          />
        </section>
      )}

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
          <h2 className="font-bold">{whereHeading}</h2>
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
          <p className="mt-1 text-xs text-muted">
            {badPhone
              ? "A Nigerian mobile: 0803 123 4567, or +234 803 123 4567."
              : "This is how you are reached, and what matches your transfer."}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="hostel">Hostel / block</label>
          {hostels.length > 0 ? (
            <>
              <select
                id="hostel"
                name="hostel"
                required
                value={hostels.includes(hostel) ? hostel : ""}
                onChange={(event) => setHostel(event.target.value)}
                className="field"
              >
                <option value="">Pick your block</option>
                {hostels.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
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
        {promoters.length > 0 && (
          <div>
            <label className="label" htmlFor="heard_from">
              Where did you hear about us?
            </label>
            <select id="heard_from" name="heard_from" className="field" defaultValue="">
              <option value="">Somewhere else</option>
              {promoters.map((one) => (
                <option key={one.code} value={one.code}>
                  {one.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
        <h2 className="font-bold">How are you paying?</h2>
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
              className={`rounded-xl border p-3 text-left transition ${
                method === value ? "border-brand bg-brand-tint" : "border-black/10"
              }`}
            >
              <span className="block font-bold">{title}</span>
              <span className="block text-sm text-muted">{detail}</span>
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

      <section className="card space-y-1 text-sm">
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
        <div className="flex justify-between text-muted">
          <span>Food</span>
          <span>{naira(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>
            {sameDay
              ? `Delivery ${sameDay.phrase}${sameDay.urgent ? " · urgent" : ""}`
              : shared
              ? "Delivery"
              : alreadyCharged > 0
                ? `Delivery top-up (${itemCount + alreadyItems} items)`
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
        {/* Four items costing more than three looks arbitrary until the whole
            ladder is there, so it is one tap away. */}
        {!shared && !promotion && !sameDay && byValue.length === 0 && (
          <FeeBands
            itemCount={itemCount + alreadyItems}
            flashFee={selected?.flashFee ?? null}
            bands={bands}
            // Where the cart reaches past Sangotedo the whole ladder is
            // higher, and a ladder that is higher for no stated reason reads
            // as the price having gone up. It is the trip that is longer.
            note={
              area.runExtra > 0
                ? `${area.name} is a longer trip than Sangotedo, so every rung is ${naira(area.runExtra)} more. One fee for the whole order, however many restaurants are in it: it is the car, not the food, so it goes by how much room your order takes.`
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
        {/* Outside the fold on purpose. The ladder is for somebody who asked
            the question; this is money off for somebody who did not, and it
            is no use to them behind a tap they have no reason to make. */}
        {!shared && !promotion && sameDay && runInstead !== null && (
          <button
            type="button"
            onClick={() => {
              setDeliverAt("");
              setBatchId(runInstead.id);
            }}
            className="mt-2 block w-full rounded-xl bg-brand-tint px-3 py-2 text-left font-semibold text-brand-dark"
          >
            {runInstead.saving > 0
              ? `Pay ${naira(runInstead.saving)} less: ${runInstead.label} is ${naira(runInstead.fee)}.`
              : `${runInstead.label} is ${naira(runInstead.fee)}.`}{" "}
            <span className="underline decoration-dotted underline-offset-4">
              Tap to move onto it.
            </span>
          </button>
        )}
        <div className="flex justify-between border-t border-black/10 pt-2 text-lg font-extrabold">
          <span>{shared ? "Food so far" : "Total"}</span>
          <span>{naira(total)}</span>
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
        />
        {applied && (
          <div className="flex justify-between text-mint">
            <span>Code {applied.code}</span>
            <span>−{naira(applied.discount)}</span>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-black/5 bg-paper p-3 shadow-bar sm:bottom-0">
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
          <button
            type="submit"
            className="btn-primary w-full py-4 text-base"
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
                : `Place order · ${naira(total)}`}
          </button>
        </div>
      </div>
    </form>
  );
}
