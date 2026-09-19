"use client";

import GroupLink, { PARTY_CHANGED, readGroup } from "./GroupLink";
import RecentGroups from "./RecentGroups";
import { useRouter } from "next/navigation";
import type { Slot } from "@/lib/same-day";

import Link from "next/link";
import Empty from "@/components/Empty";
import { useEffect, useState } from "react";
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
import { feeFor, type Band } from "@/lib/fees";
import { nearMiss, type LiveOffer } from "@/lib/offers";
import { naira } from "@/lib/money";
import PayChoice from "./PayChoice";

/** Review and fix the order. Nothing is asked for here except the food. */
export default function CartView({
  restaurants = [],
  runs = [],
  slots = [],
  sameDayFrom = 6500,
  runFrom = 4000,
  hostels = [],
  bands = [],
  offers = [],
  nextRunId = "",
  startGroup = false,
}: {
  restaurants?: { id: string; name: string; href: string }[];
  /** What a group could be put on, worked out on the server so the clock and
   *  the prices are the shop's. */
  runs?: { id: string; label: string }[];
  slots?: Slot[];
  sameDayFrom?: number;
  runFrom?: number;
  /** The blocks admin delivers to. Empty means anything typed is allowed. */
  hostels?: string[];
  /** The delivery price list in force, so the saving shown is the real one. */
  bands?: Band[];
  /** The offers on today, so the cart can say when it is one thing away from
   *  one rather than leaving somebody to wonder why it is not free. */
  offers?: LiveOffer[];
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
  const { people } = usePeople();
  const [newPerson, setNewPerson] = useState("");
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

  useEffect(() => {
    if (group === "") {
      setOthers([]);
      return;
    }
    let alive = true;
    const look = () =>
      fetch(`/api/party/${group}`)
        .then((response) => response.json())
        .then((data: { members?: typeof others; eachNow?: number }) => {
          if (alive) setEachNow(data.eachNow ?? 0);
          const me = (data.members ?? []).find((one) => one.isMine);
          if (alive) setMine(me ? { finalised: !!me.finalised, changed: !!me.changed } : null);
          // Everybody but the reader. Their own food is the section above,
          // where they can change it; listing it twice, once unchangeable,
          // reads as somebody else having ordered the same thing.
          if (alive) setOthers((data.members ?? []).filter((one) => !one.isMine));
        })
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
          JSON.stringify({ ...saved, phone, hostel })
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
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">
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

  if (cart.length === 0) {
    // In a group this cart is yours alone: everybody picks their own food and
    // pays for their own. Saying so here is the difference between an empty
    // cart that makes sense and one that looks like the group lost something.
    if (group !== "") {
      return (
        <div className="space-y-5 pb-10">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-extrabold">Your cart</h1>
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

    return (
      <Empty icon="cart" title="Your cart is empty" href="/" action="Browse the menu">
        Pick a few things and they gather here, ready to go on the next run.
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

  const names = people.map((p) => p.name);
  const groups = groupNames(cart, people)
    .map((person) => ({
      person,
      lines: cart.filter((l) => l.forName === person),
    }))
    .filter((group) => group.lines.length > 0);

  return (
    <div className="space-y-5 pb-36">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Your cart</h1>
        {group !== "" && (
          <Link href={`/g/${group}`} className="text-sm font-bold text-brand">
            See the group
          </Link>
        )}
      </div>

      {missed && (
        <div className="rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3">
          <p className="text-sm text-ink/85">
            <span className="font-extrabold text-brand-dark">
              {missed.fee === 0 ? "Free delivery" : `${naira(missed.fee)} delivery`}
            </span>{" "}
            is on for part of this cart, but {missed.blocking.slice(0, 3).join(", ")}
            {missed.blocking.length > 3 && " and more"} {missed.blocking.length === 1 ? "is" : "are"}{" "}
            not in the offer, so it does not apply.
          </p>
          <p className="mt-1 text-xs text-ink/70">
            Take {missed.blocking.length === 1 ? "it" : "them"} out and delivery
            becomes {missed.fee === 0 ? "free" : naira(missed.fee)}. Keep{" "}
            {missed.blocking.length === 1 ? "it" : "them"} and the usual fee
            applies, which is often the better deal anyway.
          </p>
        </div>
      )}

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
        sameDayFrom={sameDayFrom}
        runFrom={runFrom}
        alone={bands.length > 0 ? feeFor(countItems(cart), null, bands) : 0}
      />

      {/* The way back to a car they were in, which until now existed only in
          whatever chat the link arrived in. */}
      <RecentGroups />

      {!inParty && (
      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold">
            {people.length > 0 ? "People in this order" : "Ordering for them, and paying?"}
          </h2>
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
        <div>
          <p className="text-sm text-muted">
            {people.length > 0
              ? "Now tap a name under each item below to say whose it is. Bags are labelled with these names on delivery."
              : "Add their names, then tap a name under each item to say whose it is. The delivery fee does not change."}
          </p>
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
      </section>
      )}


      {group !== "" && (
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">
          Yours
        </h2>
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
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">
              {section.person || "You"}
            </h2>
          )}

          {section.lines.map((line) => (
            <div key={line.key} className="card flex gap-3">
              {/* The picture and the name go back to the product, which is
                  where you go to check what is in it or change the choices. */}
              <Link
                href={`/p/${line.itemId}?line=${encodeURIComponent(line.key)}`}
                aria-label={`Open ${line.name}`}
                className="size-20 shrink-0 overflow-hidden rounded-xl"
              >
                <Thumb src={line.imageUrl} name={line.name} rounded="rounded-none" />
              </Link>

              <div className="min-w-0 flex-1">
                {/* The count lives beside the name too: one card holding three
                    of something read as one item in the cart. */}
                <p className="truncate font-bold">
                  {line.qty > 1 && <span className="text-brand">{line.qty}× </span>}
                  <Link
                    href={`/p/${line.itemId}?line=${encodeURIComponent(line.key)}`}
                    className="hover:underline"
                  >
                    {line.name}
                  </Link>
                </p>
                <p className="text-sm text-muted">
                  <Link
                    href={`/r/${line.restaurantId}`}
                    className="font-semibold hover:text-ink hover:underline"
                  >
                    {line.restaurantName}
                  </Link>
                  {line.choices.length > 0 && ` · ${line.choices.join(", ")}`}
                  {people.length > 0 && !inParty && ` · for ${line.forName || "you"}`}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-extrabold">{naira(line.unitPrice * line.qty)}</span>
                  <span className="flex items-center gap-1 rounded-full border border-black/10 p-1">
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.qty - 1)}
                      className="size-8 rounded-full text-lg leading-none hover:bg-black/5"
                      aria-label={`One less ${line.name}`}
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.qty + 1)}
                      className="size-8 rounded-full text-lg leading-none hover:bg-black/5"
                      aria-label={`One more ${line.name}`}
                    >
                      +
                    </button>
                  </span>
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

      {theCar}

      <section className="card space-y-2">
        <h2 className="font-bold">Add something else</h2>
        <div className="flex flex-wrap gap-2">
          {restaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/r/${restaurant.href}`}
              className="chip border-black/10 bg-white hover:border-ink/30"
            >
              {restaurant.name}
            </Link>
          ))}
          <Link href="/" className="chip border-black/10 bg-white hover:border-ink/30">
            Everything
          </Link>
        </div>
      </section>

      {asking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
          {/* Tall enough now to run off a small phone, so it scrolls rather
              than hiding the button at the bottom of it. */}
          <div className="max-h-[85vh] w-full max-w-sm space-y-3 overflow-y-auto rounded-3xl bg-paper p-5 shadow-bar">
            <div>
              <h2 className="text-lg font-extrabold">
                {mine?.finalised ? "Update your food?" : "Put this food in the group?"}
              </h2>
              <p className="mt-1 text-sm text-muted">
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
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-black/5 bg-paper p-3 shadow-bar sm:bottom-0">
        {problem !== "" && (
          <p className="mx-auto mb-2 max-w-2xl rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
            {problem}
          </p>
        )}
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              {countItems(cart)} item{countItems(cart) === 1 ? "" : "s"}
              {cart.length !== countItems(cart) && ` · ${cart.length} product${cart.length === 1 ? "" : "s"}`}
            </p>
            <p className="truncate text-lg font-extrabold">{naira(cartSubtotal(cart))}</p>
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
                className="btn-primary shrink-0 px-7 py-3.5"
              >
                {mine?.finalised ? "Update my food" : "Finalise my food"}
              </button>
            )
          ) : (
            <Link href="/checkout" className="btn-primary shrink-0 px-7 py-3.5">
              Checkout
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
