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
import { offerShare, pickOffer, type LiveOffer } from "@/lib/offers";
import { normalisePhone } from "@/lib/phone";
import FeeBands from "./FeeBands";
import { naira } from "@/lib/money";
import CouponBox from "@/components/CouponBox";
import { clearJoin, readJoin } from "@/components/JoinDelivery";
import GroupLink, {
  joinedViaLink,
  leaveGroup,
  PARTY_CHANGED,
  readGroup,
} from "@/components/GroupLink";
import type { Slot } from "@/lib/same-day";
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
  adding,
  sameDaySlots,
  sameDayBands,
  urgentExtra,
  bands,
  offers,
  hostels,
}: {
  batches: BatchView[];
  adding: AddingTo | null;
  /** Times still available today, worked out on the server so the clock is
   *  the shop's rather than the phone's. Empty means same day is off. */
  sameDaySlots: Slot[];
  /** The pick-a-time ladder as the admin has it, so what is shown is what is
   *  charged. */
  sameDayBands: Band[];
  urgentExtra: number;
  /** The delivery price list in force, read from settings on the server. */
  bands: Band[];
  /** Promotions on today. The same rule that prices the order judges them
   *  here, so what is quoted is what is charged. */
  offers: LiveOffer[];
  /** The blocks the admin delivers to. Empty means anything typed is allowed. */
  hostels: string[];
}) {
  const cart = useCart();
  const { people } = usePeople();
  const openable = batches.filter((b) => !b.closed && !b.full);
  const [batchId, setBatchId] = useState(adding?.batchId ?? openable[0]?.id ?? "");
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
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
    } catch {
      /* Nothing saved, or storage is blocked. The fields simply start empty. */
    }
  }, [adding]);

  useEffect(() => {
    try {
      localStorage.setItem("sudu_me_v1", JSON.stringify({ name, phone, hostel }));
    } catch {
      /* Not worth failing checkout over. */
    }
  }, [name, phone, hostel]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const badPhone = Boolean(state.error?.toLowerCase().includes("phone"));
  const selected = batches.find((b) => b.id === batchId) ?? null;
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
  // Same day instead of a run. Empty means they are on a run, which is the
  // cheap way and stays the default.
  // Picking a time is the default, because it is what most people are here
  // for. Empty means a run, which is one tap away and still cheaper.
  const [deliverAt, setDeliverAt] = useState(sameDaySlots[0]?.at ?? "");
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
    : Math.max(
        0,
        feeFor(itemCount + alreadyItems, selected?.flashFee ?? null, bands) - alreadyCharged
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
          {openable.map((batch) => (
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

      <input type="hidden" name="cart" value={JSON.stringify(toServerLines(cart))} />
      <input type="hidden" name="coupon" value={applied?.code ?? ""} />
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="group_mode" value={groupOn ? mode : ""} />
      <input type="hidden" name="payment_method" value={method} />
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
      <section className="card space-y-3">
        <h2 className="font-bold">When do you want it?</h2>

        {offersSameDay ? (
          <>
            <select
              className="field"
              value={sameDay ? "today" : "run"}
              onChange={(event) =>
                setDeliverAt(event.target.value === "today" ? sameDaySlots[0].at : "")
              }
              aria-label="How you want it delivered"
            >
              {/* Short enough to survive a narrow phone. A native select
                  truncates its option text with no warning, and a price cut
                  off halfway is worse than no price. */}
              {/* An offer prices the delivery outright, so quoting the
                  ladder beside it would be quoting a number nobody is going
                  to be charged. Each option says what it would actually
                  cost, and only falls back to "from" when nothing applies. */}
              <option value="today">
                {sameDaySlots[0].day === "today" ? "Today" : "Tomorrow"} ·{" "}
                {priceFor(sameDaySlots[0].at) ??
                  `from ${naira(sameDayBands[0]?.fee ?? 6500)}`}
              </option>
              <option value="run">
                On a run · {priceFor(null) ?? `from ${naira(bands[0]?.fee ?? 4000)}`}
              </option>
            </select>

            {sameDay ? (
              <div className="space-y-2">
                <label className="label" htmlFor="deliver_at">
                  What time?
                </label>
                <select
                  id="deliver_at"
                  className="field"
                  value={deliverAt}
                  onChange={(event) => setDeliverAt(event.target.value)}
                >
                  {sameDaySlots.map((slot) => (
                    <option key={slot.at} value={slot.at}>
                      {slot.label}
                      {slot.urgent ? " · urgent" : ""}
                      {` · ${
                        priceFor(slot.at) ??
                        naira(sameDayFee(itemCount, slot.urgent, sameDayBands, urgentExtra))
                      }`}
                    </option>
                  ))}
                </select>
                {/* One line. The reasons behind the times are ours, not
                    theirs: they want to know when they can eat. */}
                <p className="text-sm text-muted">
                  {sameDaySlots[0].day === "tomorrow"
                    ? `Past our delivery time. The soonest is ${sameDaySlots[0].phrase}.`
                    : sameDay.urgent
                      ? "Under five hours, so this one is urgent. A later time is cheaper."
                      : `The soonest is ${sameDaySlots[0].phrase}.`}
                </p>
              </div>
            ) : (
              <>
                <RunPicker />
                <p className="text-sm text-muted">
                  A run is everybody&apos;s food in one car, which is why it is cheaper.
                </p>
              </>
            )}
          </>
        ) : (
          <RunPicker />
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
            runs={openable.map((batch) => ({ id: batch.id, label: batch.label }))}
            slots={sameDaySlots}
            sameDayFrom={sameDayBands[0]?.fee ?? 6500}
            runFrom={bands[0]?.fee ?? 4000}
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

        <div>
          <label className="label" htmlFor="customer_note">
            Anything we should know? (optional)
          </label>
          <textarea
            id="customer_note"
            name="customer_note"
            rows={2}
            maxLength={300}
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
      </section>

      <section className="card space-y-1 text-sm">
        <div className="flex justify-between text-muted">
          <span>Food</span>
          <span>{naira(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>
            {sameDay
              ? `Delivery ${sameDay.label}${sameDay.urgent ? " · urgent" : ""}`
              : shared
              ? "Delivery"
              : alreadyCharged > 0
                ? `Delivery top-up (${itemCount + alreadyItems} items)`
                : `Delivery (${itemCount} item${itemCount === 1 ? "" : "s"})`}
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
        {!shared && !sameDay && (
          <FeeBands
            itemCount={itemCount + alreadyItems}
            flashFee={selected?.flashFee ?? null}
            bands={bands}
          />
        )}
        <div className="flex justify-between border-t border-black/10 pt-2 text-lg font-extrabold">
          <span>{shared ? "Food so far" : "Total"}</span>
          <span>{naira(total)}</span>
        </div>
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
