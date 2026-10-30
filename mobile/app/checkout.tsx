import { useEffect, useState } from "react";
import { useIceInCart } from "@/lib/ice";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  api,
  areasIn,
  feeAcross,
  feeRidingAlong,
  pricesByStep,
  pricesByValue,
  stepsFor,
  valueLadderFor,
  canGoSameDay,
  carGoesOn,
  dayShort,
  daysOnOffer,
  slotDayWord,
  slotWindow,
  type DayOnOffer,
  dearestArea,
  mixedExtra,
  lagosToday,
  naira,
  nextArrival,
  runCarries,
  runCovers,
  bandIndex,
  bandRows,
  feeForValue,
  sameDayFeeFor,
  withExtra,
  type Shop,
  type Slot,
} from "@/lib/api";
import { cart, cartTotal, countItems, me, mine, people, useStored } from "@/lib/store";
import FeeWhy from "@/components/FeeWhy";
import KeepCart from "@/components/KeepCart";
import { registerForPush } from "@/lib/push";
import { Card, Display, Ticket } from "@/components/ui";
import { F, T } from "@/lib/theme";
import { whatsappTo } from "@/lib/whatsapp";

/** Who it is for, which run, and how they are paying. Nothing else. */
export default function Checkout() {
  const router = useRouter();
  const [lines] = useStored(cart.read, []);
  const [saved] = useStored(me.read, {
    name: "",
    phone: "",
    hostel: "",
    token: null,
  });

  const [shop, setShop] = useState<Shop | null>(null);
  const [runId, setRunId] = useState("");
  /** The time they picked. Empty means they are waiting for a run. */
  const [deliverAt, setDeliverAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  /** Who they say they heard about us from. Empty is "somewhere else". */
  const [heardFrom, setHeardFrom] = useState("");
  /** Where they really heard about us, where none of the chips is it. The
   *  list is a name or two and a channel; at a university nearly every real
   *  answer is a sentence, and "my roommate" is worth more than any box. */
  const [heardSaid, setHeardSaid] = useState("");
  /** Anything we should know: a gate, a room number, no pepper. The website
   *  has asked this since it was built and the app never did, so the one
   *  thing somebody needs to tell us had nowhere to go. */
  const [note, setNote] = useState("");
  /** Buying it for somebody else: their name and number, and the block
   *  above is theirs. Both or neither; the shop refuses half of it. */
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftName, setGiftName] = useState("");
  const [giftPhone, setGiftPhone] = useState("");
  /** Whose money a card link is made out in. Empty is naira, which is
   *  almost everybody, so it stays the default. */
  const [money, setMoney] = useState("");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [codeError, setCodeError] = useState("");
  const [friends] = useStored(people.read, []);
  const [mode, setMode] = useState<"one_payer" | "split">("one_payer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** The blocks admin delivers to. Older servers do not send them, and then
   *  the checkout asks for a typed answer as it always did. */
  const hostels = shop?.hostels ?? [];
  // The bag of ice block, put in by the shop and taken out again, so the
  // figure on this screen is the figure on the bill. See lib/ice.ts.
  useIceInCart(shop, lines);

  useEffect(() => {
    void api
      .shop(true)
      .then((next) => {
        setShop(next);
        // Nothing is picked here. What is going soonest is worked out from
        // the cart once both are known, below, because it depends on where
        // the food is coming from.
      })
      .catch((problem: unknown) =>
        setError(problem instanceof Error ? problem.message : "Could not reach the shop.")
      );
  }, []);

  // Filled in from the last order on this phone, which is as close to an
  // account as anybody needs.
  useEffect(() => {
    setName((was) => was || saved.name);
    // How they pay is a fact about them like the block, so it comes back with
    // it rather than starting on the default every time.
    if (saved.paymentMethod) setMethod(saved.paymentMethod);
    setPhone((was) => was || saved.phone);
    setHostel((was) => was || saved.hostel);
  }, [saved]);

  useEffect(() => {
    setApplied(null);
  }, [runId, lines.length]);

  // Only the people with food in this cart matter to the order.
  const sharing = friends.filter((friend) =>
    lines.some((line) => line.forName === friend.name)
  );

  /**
   * What this section is actually asking for.
   *
   * Ordering only for friends is a real thing people do, and "where your own
   * food goes" over a cart holding none of it reads as a question nobody can
   * answer. It is their own food, a bag a friend asked to be left with them,
   * or nothing coming to them at all and we still need to reach them.
   */
  const ownFood = lines.some((line) => line.forName === "");
  const bagsToMe = sharing.some((friend) => friend.goesTo === "mine");
  const whereHeading =
    sharing.length === 0
      ? "Where it goes"
      : ownFood
        ? "Where your own food goes"
        : bagsToMe
          ? "Where the bags come to"
          : "How to reach you";

  // Where the bags go is read off the answers already given, exactly as on
  // the website: one bag going to its owner makes it an each-bag run.
  const collect: "leader" | "each" = sharing.some((friend) => friend.goesTo === "theirs")
    ? "each"
    : "leader";

  const unresolved = sharing.filter(
    (friend) =>
      friend.goesTo === null ||
      (friend.goesTo === "theirs" && (friend.phone.trim() === "" || friend.hostel.trim() === ""))
  );

  // Somebody other than the person ordering has to be paying for a split to
  // mean anything. One friend paying for her own food is a split of one, which
  // is a thing people actually want; ordering only for yourself is not.
  const splitNotReady = mode === "split" && sharing.length === 0;

  const items = countItems(lines);
  const food = cartTotal(lines);

  // Which kitchens this cart touches, and so how far the car has to go. It
  // decides what delivery costs, whether a car of its own can go at all, and
  // which runs can carry it: the same rule the server charges by, so the
  // number on this screen is the number on the bill.
  const kitchens = [
    ...new Set(
      lines.map(
        (line) =>
          shop?.menu.find((one) => one.items.some((item) => item.id === line.itemId))
            ?.restaurant.id ?? ""
      )
    ),
  ].filter(Boolean);
  const cartAreas = areasIn(shop, kitchens);

  // Two errands, two fees: the market half of the cart pays by what the
  // shopping comes to, the restaurant half by how much of the car it fills.
  const kitchenOf = (line: { itemId: string }) =>
    shop?.menu.find((one) => one.items.some((item) => item.id === line.itemId))
      ?.restaurant.id ?? "";
  /* Priced by the cool box, and so not by what it came to as well: the
     same tubs were being charged twice. Only Fantasy is priced this way. */
  const notByBox = lines.filter((line) => !pricesByStep(shop, line.itemId));
  const marketHalf = notByBox.filter((line) => pricesByValue(shop, kitchenOf(line)));
  const restHalf = notByBox.filter((line) => !pricesByValue(shop, kitchenOf(line)));
  /*
   * What rides along on a trip the car was making anyway.
   *
   * Fantasy ice cream is small and the people who buy it buy a lot, and the
   * container ladder would call fifteen of them fifteen takeaway boxes. It
   * is grabbed on the way past rather than fetched, so it is the dearer of
   * the two rather than the sum: three pizzas and an ice cream pays for the
   * pizzas, sixty ice creams and one pizza pays for four cool boxes.
   */
  const steps = stepsFor(shop, lines.map((line) => line.itemId));
  const ridingHalf = lines.filter((line) => pricesByStep(shop, line.itemId));
  const drivingHalf = lines.filter((line) => !pricesByStep(shop, line.itemId));
  const ridingCount = ridingHalf.reduce((all, line) => all + line.qty, 0);
  const ridesAlong = (otherFee: number) =>
    feeRidingAlong({ stepCount: ridingCount, steps, otherFee });
  const area = dearestArea(shop, kitchens);
  // The dearest area sets the distance; every area after the first is a
  // second stop, and a second stop costs the same whichever two they are.
  const secondStop = mixedExtra(cartAreas, shop?.areaPairs ?? []);
  const farExtra = area.runExtra + secondStop;
  const plainRunBands = withExtra(shop?.bands ?? [], farExtra);
  const sameDayBands = withExtra(shop?.sameDay?.bands ?? [], area.sameDayExtra + secondStop);

  const runsHere = (shop?.runs ?? []).filter(
    (one) => !one.closed && !one.full && runCovers(one, cartAreas) && runCarries(one, kitchens)
  );
  // One thing from a far area makes the whole order a run: a car cannot be
  // in two places in three hours.
  const slots = canGoSameDay(cartAreas)
    ? (shop?.sameDay?.slots ?? []).filter((one) =>
        // Ajah takes a car on the day the shop is already going that way and
        // on no other. The day picker offers a fortnight, so without this
        // somebody could buy a Monday car to Ajah nobody was going to drive.
        carGoesOn(cartAreas, one.date ?? "")
      )
    : [];

  const far = cartAreas.filter((one) => one.id !== "");
  const farNames = far.map((one) => one.name).join(" and ");
  const noRunThere = far.length > 0 && runsHere.length === 0;

  // Runs that are open, going the right way, and stopping at counters this
  // cart does not need. Some nights are one counter's run: the car queues at
  // Domino's and fetches nothing else. Hidden without a word, the list of
  // runs is simply shorter than it was yesterday and nobody knows why.
  const wrongCounter = (shop?.runs ?? []).filter(
    (one) =>
      !one.closed && !one.full && runCovers(one, cartAreas) && !runCarries(one, kitchens)
  );
  const counterNames = [...new Set(lines.map((line) => line.restaurant))];
  const counterSaid =
    counterNames.length === 1
      ? counterNames[0]
      : `${counterNames.slice(0, -1).join(", ")} and ${counterNames[counterNames.length - 1]}`;

  // What the rest of the cart could catch on its own. Without the far food it
  // is a Sangotedo cart, so every open run can carry it and a car of its own
  // is back on the table: counting runs alone named tomorrow night while a
  // car could have been there this afternoon.
  const farSooner = (() => {
    if (far.length === 0) return "";
    // Every run, not only the ones that can carry the far half: without that
    // food the cart is a Sangotedo one and any of them will do.
    const usable = (shop?.runs ?? []).filter((one) => !one.closed && !one.full);
    const everySlot = shop?.sameDay?.slots ?? [];

    const slotToday = everySlot.find((one) => one.day === "today");
    const soonest = usable[0] ?? null;
    // A car of its own counts only where one could go today: one tomorrow is
    // no better than tomorrow's run, and offering it as if it were is how
    // somebody pays for a car to save nothing.
    if (slotToday && slotToday.phrase) return `${slotToday.phrase} today`;
    return soonest ? soonest.label : "";
  })();

  const run = runsHere.find((one) => one.id === runId) ?? null;

  /*
   * A run that has closed but has not been shopped yet is charged as a
   * car: six and a half, not four. The app was quoting the run ladder
   * and the server was charging the car one, which is the one thing a
   * checkout must never do. See lib/last-minute.ts on the server.
   */
  const lastMinute = run?.lastMinute === true;
  const runBands = lastMinute ? sameDayBands : plainRunBands;
  const ladderBase = lastMinute ? (shop?.sameDay?.bands ?? []) : (shop?.bands ?? []);
  const picked: Slot | null = slots.find((one) => one.at === deliverAt) ?? null;

  // When it lands, worked out rather than asked for: a run going today, a
  // car of its own today, a run tomorrow, else tomorrow's first window.
  const going = nextArrival(runsHere, slots, lagosToday());
  // Nobody picks, so the decision is applied: the car it goes in, or the
  // time a car of its own is for. Written into state rather than only read,
  // because it is what the order is placed with.
  useEffect(() => {
    if (!going) return;
    setRunId(going.runId);
    setDeliverAt(going.at);
  }, [going?.runId, going?.at]);

  /*
   * The days this cart could come on, and the one it is on.
   *
   * The app decided the day and said so, which is the right answer to
   * "when is the next run" and the wrong one to "I want it today". A run
   * where one is going, a car of its own where none is, and the price
   * follows from which: nobody has to know what a run is to buy lunch.
   */
  const dayChoices = daysOnOffer({
    runs: runsHere.map((one) => ({ id: one.id, runDate: one.runDate })),
    slots,
  });
  const chosenDate = picked?.date ?? run?.runDate ?? "";
  const goToDay = (day: DayOnOffer) => {
    setRunId(day.runId);
    setDeliverAt(day.at);
  };

  const arriving = picked
    ? `${slotWindow(picked)} ${slotDayWord(picked)}`
    : run
      ? `${run.deliveryWindow.charAt(0).toLowerCase()}${run.deliveryWindow.slice(1)} ${run.label.split(" · ")[0]}`
      : (going?.said ?? "on the next run");

  // A picked time makes its own trip, so nothing is shared and there is no
  // earlier order on it to take off. A run is priced on everything travelling
  // for this number on it, less whatever the earlier order already paid.
  // A kitchen that charges by what the shopping comes to rather than by how
  // many things it is. The same rule the server charges by, so the number on
  // this screen is the number on the bill.
  const byValue = valueLadderFor(shop, kitchens);

  /**
   * What this cart costs on a run, on a named run's numbers.
   *
   * Pulled out of the fee itself so the other way of getting it here can be
   * priced with the same sentence. It used to be written once, inside the
   * fee, and the comparison further down simply gave up whenever a market
   * was in the cart: no alternative was offered, on the grounds that the
   * ladder it would have compared against was the wrong ladder. The market
   * half has a ladder of its own, so there was always an answer.
   */
  const feeOnRun = (flash: number | null): number =>
    byValue.length > 0
      ? // Nothing but market shopping is charged by what the shopping comes
        // to. Mix a restaurant in and both are charged, their own way, and
        // the bill is the two added. What rides along in the cool box goes
        // on top of that, exactly as it does on the ordinary ladder below:
        // the server adds it once at the end for every cart, and this
        // branch was the one place the phone did not.
        ridesAlong(
        feeAcross({
          marketFood: cartTotal(marketHalf),
          // The container count floors at one, which is right for a cart and
          // wrong for half of one: no restaurant lines must mean no restaurant
          // fee, not the price of a container nobody ordered.
          restaurantFee: (() => {
            const containers = restHalf.length === 0 ? 0 : countItems(restHalf);
            // The plain ladder. The trip is added once below, for the whole
            // order: taking the one with it already in charged a cart
            // holding both a market and a kitchen twice for one car.
            return containers === 0
              ? 0
              : feeFrom(containers, ladderBase, flash);
          })(),
          bands: byValue,
        }) + farExtra
        )
      : ridesAlong(
          feeFrom(
            // What rides along is out of the container count: the car is
            // going for the rest of it.
            ridingHalf.length === 0 ? items : countItems(drivingHalf),
            runBands,
            flash
          )
        );

  /** And what it costs in a car of its own, which is one ladder either way:
   *  a car is a car whatever is riding in it. */
  const feeOnCar = (slot: Slot): number =>
    ridesAlong(
      sameDayFeeFor(
        ridingHalf.length === 0 ? items : countItems(drivingHalf),
        slot.urgent,
        sameDayBands,
        shop?.sameDay?.urgentExtra ?? 0
      )
    );

  const ladder = picked
    ? feeOnCar(picked)
    : shop && (run || byValue.length > 0)
      ? feeOnRun(run?.flashFee ?? null)
      : 0;

  // What a promotion does to this cart, worked out by the shop because that
  // is where the rules are. It prices delivery outright, so it wins over the
  // ladder and over the same day figure alike.
  const [priced, setPriced] = useState<{
    offer: { fee: number; note: string } | null;
    nearly: {
      fee: number;
      note: string;
      blocking: string[];
      qualifying: string[];
    } | null;
  } | null>(null);

  useEffect(() => {
    if (lines.length === 0 || (!run && !picked)) {
      setPriced(null);
      return;
    }
    let alive = true;
    void api
      .offerOn({
        batchId: run?.id ?? "",
        deliverAt: picked?.at ?? null,
        phone,
        lines: lines.map((line) => {
          const place = shop?.menu.find((one) =>
            one.items.some((item) => item.id === line.itemId)
          );
          return {
            itemId: line.itemId,
            restaurantId: place?.restaurant.id ?? "",
            name: line.name,
            choices: line.choices,
          };
        }),
      })
      .then((answer) => {
        if (alive) setPriced(answer);
      })
      .catch(() => {
        if (alive) setPriced(null);
      });
    return () => {
      alive = false;
    };
  }, [lines, run?.id, picked?.at, phone, shop]);

  const offered = priced?.offer ?? null;
  const nearly = priced?.nearly ?? null;
  // A promotion is the price, so it wins over the ladder and over the same
  // day figure alike, exactly as the order itself settles it.
  const fee = offered ? offered.fee : ladder;
  /** What the order comes to: the number the Total row shows, and the one a
   *  card link abroad is worked out from. */
  const owed = Math.max(0, food + fee - (applied?.discount ?? 0));

  const place = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await api.place({
        batchId: runId,
        deliverAt: deliverAt || undefined,
        name,
        phone,
        hostel,
        lines: lines.map((line) => ({
          menu_item_id: line.itemId,
          qty: line.qty,
          option_ids: line.optionIds,
          for_name: line.forName || null,
        })),
        paymentMethod: method,
        payCurrency: method === "card" ? money : "",
        heardFrom,
        heardSaid,
        customerNote: note,
        giftTo:
          giftOpen && (giftName.trim() !== "" || giftPhone.trim() !== "")
            ? { name: giftName.trim(), phone: giftPhone.trim() }
            : undefined,
        coupon: applied?.code ?? "",
        groupMode: sharing.length > 0 ? mode : null,
        collectMode: collect,
        people: sharing.map((friend) => ({
          name: friend.name,
          phone: friend.goesTo === "theirs" ? friend.phone : "",
          hostel: friend.goesTo === "theirs" ? friend.hostel : "",
          pays: friend.pays,
        })),
      });

      await me.save({ name, phone, hostel, token: result.token, paymentMethod: method });
      await mine.add(result.orderId);
      await cart.clear();

      // Asked for only now, when there is something worth being told about.
      void registerForPush(result.token);

      router.replace(`/order/${result.orderId}`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not place that order.");
    } finally {
      setBusy(false);
    }
  };

  if (!shop) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  const ready =
    !busy &&
    !(picked === null && runId === "") &&
    lines.length > 0 &&
    unresolved.length === 0 &&
    !splitNotReady;

  return (
    <View style={{ flex: 1, backgroundColor: T.shell }}>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}>
      <KeepCart
        phone={phone}
        name={name}
        hostel={hostel}
        batchId={runId}
        items={items}
        value={food + fee}
        summary={lines.map((line) => `${line.qty}x ${line.name}`).join(", ")}
      />
      {/* Decided, not asked. A dropdown here made somebody know the fee
          ladder, the cut off and the three hours it takes to fetch food and
          drive it over before they could buy lunch, and the commonest answer
          to it was the dear one twenty minutes before a run went to the same
          block. */}
      <Step number="01" title="When" />
      <View
        style={{
          backgroundColor: T.ink,
          borderWidth: 2,
          borderColor: T.ink,
          borderRadius: T.radius,
          padding: 14,
          gap: 8,
        }}
      >
        {/* Not "a car of its own" or "next run to PAU". Which it is, is the
            shop's business: the customer picks a day and pays what that day
            costs. The website's step above this control says the same. */}
        <Ticket colour={T.volt}>Choose when you want it</Ticket>
        <Display size={30} colour={T.shell}>
          {arriving}
        </Display>

        {/*
         * Which day, wherever there is a day at all.
         *
         * A row rather than a calendar: today and tomorrow are the two
         * anybody says in words, and past that a date is clearer than
         * counting days. Scrolls sideways because a fortnight of them does
         * not fit across a phone.
         *
         * It used to want two days before it drew anything, on the
         * reasoning that a choice with one answer is furniture. It is not:
         * a cart only one run in the fortnight can carry shows no control
         * at all, so the date in the headline reads as something that was
         * decided for you with no say in it, and the first thing somebody
         * does is look for the picker that is not there. One day is still
         * worth drawing, because seeing it is the only day is itself the
         * answer.
         */}
        {dayChoices.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {dayChoices.map((day) => {
              const on = day.date === chosenDate;
              return (
                <Pressable
                  key={day.date}
                  onPress={() => goToDay(day)}
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: on ? T.volt : T.onInkMuted,
                    backgroundColor: on ? T.volt : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: on ? F.bodyBold : F.body,
                      fontSize: 14,
                      color: on ? T.ink : T.onInk,
                    }}
                  >
                    {dayShort(day.date, lagosToday())}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* One line, because three paragraphs about Lekki is three
            paragraphs nobody reads. Why it waits for a run, and the way out
            where waiting is the wrong trade. */}
        {far.length > 0 && !noRunThere && (
          <Text style={{ color: T.onInk, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>
            <Text style={{ fontFamily: F.bodyBold, color: T.volt }}>
              {farNames} goes out on a run only.
            </Text>
            {farSooner !== ""
              ? ` Take ${far.length === 1 ? "it" : "those"} out and the rest can come ${farSooner}.`
              : " Everything here travels together, so there is one delivery fee."}
          </Text>
        )}

        {/* A run kept to one counter, said before somebody wonders where the
            usual runs went. The line above already names when this cart can
            come; this says why it is not sooner. */}
        {wrongCounter.length > 0 && (
          <Text style={{ color: T.onInk, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>
            <Text style={{ fontFamily: F.bodyBold, color: T.volt }}>
              Not every run stops at {counterSaid}.
            </Text>
            {runsHere.length > 0
              ? ` The next one that does is ${runsHere[0].label}.`
              : slots.length > 0
                ? " None of the runs coming up are, so this goes as a car of its own, at the time you pick below."
                : " None of the runs coming up are."}
          </Text>
        )}

        {/* The estimate used to be said here in full: half an hour either
            way, called when it is at your block. Three lines of small type
            under a headline that already gives a window, on the screen
            where somebody is trying to finish. The window is the estimate. */}

        {/*
            The one thing this card cannot do.
            
            Everything above is the shop's timetable. Somebody who needs it
            in forty minutes, or wants a day that is not on the list, is
            outside it, and whether it can be done at all depends on where
            the car is this minute, which only a person knows. One line
            with the message already written beats letting them read the
            days twice and close the app.
         */}
        {(shop?.shop.whatsapp ?? "") !== "" && (
          <Pressable
            onPress={() =>
              Linking.openURL(
                whatsappTo(
                  shop?.shop.whatsapp ?? "",
                  "Hi Sudu, I need my order on a day that is not on the list."
                )
              )
            }
          >
            <Text
              style={{ color: T.onInkMuted, fontFamily: F.body, fontSize: 13, lineHeight: 19 }}
            >
              Need another day or time?{" "}
              <Text style={{ fontFamily: F.bodyBold, color: T.volt }}>Message us</Text>
            </Text>
          </Pressable>
        )}

        {noRunThere && (
          <Text style={{ color: T.volt, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20 }}>
            No run is going to {farNames} just now, and a car of its own
            cannot get there and back in time. Take {far.length === 1 ? "it" : "those"}{" "}
            out and the rest can come {farSooner || "on the next one"}.
          </Text>
        )}

        {runsHere.length === 0 && far.length === 0 && slots.length === 0 && (
          <Text style={{ color: T.onInkMuted, fontFamily: F.body, fontSize: 14 }}>
            Nothing is going just now. Try again shortly.
          </Text>
        )}
      </View>

      {/* Asked once, on the one form a first order passes through.
          Whoever they name is theirs for life, so there is no second chance
          at it, and "somewhere else" is a real answer: most people are
          nobody's referral.

          Always, now, rather than only where the shop has promoters on its
          books. ChatGPT is on the list wherever it is asked, and the box
          underneath is the answer most people actually have. */}
      <Card style={{ gap: 8 }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>
            Where did you hear about us?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { code: "", name: "Somewhere else" },
                /* Not a person, so it carries a prefix a promoter's code
                   can never have: codes are letters and numbers, and this
                   one has a colon in it. It is filed as the channel they
                   came through and credits nobody, which is the whole
                   difference. */
                { code: "c:chatgpt", name: "ChatGPT" },
                ...(shop.promoters ?? []),
              ].map((one) => (
                <Pressable
                  key={one.code || "none"}
                  onPress={() => setHeardFrom(one.code)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: heardFrom === one.code ? T.ink : T.line,
                    backgroundColor: heardFrom === one.code ? T.ink : T.paper,
                    minHeight: 42,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      color: heardFrom === one.code ? T.paper : T.ink,
                      fontFamily: heardFrom === one.code ? F.bodyBold : F.bodySemi,
                      fontSize: 14,
                    }}
                  >
                    {one.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/*
              Somewhere else, with somewhere to say where.

              Everybody who is nobody's referral landed on "Somewhere else",
              which recorded nothing: the shop asked its best question and
              threw the answer away. Optional, and it says so, because this
              is the last thing between somebody and paying and a question
              you have to answer is a question answered "x".
           */}
          {heardFrom === "" && (
            <>
              <TextInput
                value={heardSaid}
                onChangeText={setHeardSaid}
                maxLength={120}
                placeholder="If you like: a friend, a group chat, a poster"
                placeholderTextColor={T.muted}
                style={{
                  borderWidth: 2,
                  borderColor: T.ink,
                  borderRadius: 12,
                  backgroundColor: T.field,
                  paddingHorizontal: 12,
                  minHeight: 46,
                  fontFamily: F.body,
                  fontSize: 15,
                  color: T.ink,
                }}
              />
              <Text style={{ fontFamily: F.body, fontSize: 12, color: T.muted }}>
                Optional, and it helps us a lot.
              </Text>
            </>
          )}
        </Card>

      {sharing.length > 0 && (
        <Card style={{ gap: 10 }}>
          <Ticket>Group order · {sharing.length + 1} people</Ticket>

          {(
            [
              ["one_payer", "I pay for everything", "Friends pay you back however you like."],
              ["split", "Everyone pays their own", "Each person gets their own order and their own number to pay with."],
            ] as const
          ).map(([value, title, detail]) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={{
                borderWidth: 2,
                borderColor: T.ink,
                backgroundColor: mode === value ? T.ink : T.paper,
                borderRadius: 14,
                padding: 12,
                gap: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: F.bodyBold,
                  fontSize: 15,
                  color: mode === value ? T.shell : T.ink,
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontFamily: F.body,
                  fontSize: 13,
                  lineHeight: 19,
                  color: mode === value ? T.onInkMuted : T.muted,
                }}
              >
                {detail}
              </Text>
            </Pressable>
          ))}

          {sharing.map((friend) => (
            <View key={friend.name} style={{ gap: 8, borderTopWidth: 2, borderTopColor: T.line, paddingTop: 10 }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>
                {friend.name}&apos;s food goes
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(
                  [
                    ["mine", "Where mine goes"],
                    ["theirs", "To them"],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() =>
                      people.update(friend.name, {
                        goesTo: value,
                        ...(value === "mine" ? { phone: "", hostel: "" } : {}),
                      })
                    }
                    style={{
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: friend.goesTo === value ? T.ink : T.line,
                      minHeight: 42,
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      backgroundColor: friend.goesTo === value ? T.brand : T.paper,
                    }}
                  >
                    <Text
                      style={{
                        color: friend.goesTo === value ? T.paper : T.ink,
                        fontFamily: F.bodyBold,
                        fontSize: 14,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {friend.goesTo === "theirs" && (
                <View style={{ gap: 8 }}>
                  <Field
                    label={`${friend.name}'s phone`}
                    value={friend.phone}
                    onChange={(next) => people.update(friend.name, { phone: next })}
                    keyboard="phone-pad"
                  />
                  <Blocks
                    label={`${friend.name}'s block`}
                    value={friend.hostel}
                    onChange={(next) => people.update(friend.name, { hostel: next })}
                    all={hostels}
                  />
                </View>
              )}

              {mode === "split" && (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Text style={{ color: T.muted, fontFamily: F.bodySemi, fontSize: 13 }}>
                    {friend.name} pays by
                  </Text>
                  {(
                    [
                      ["transfer", "Transfer"],
                      ["card", "Card link"],
                    ] as const
                  ).map(([value, label]) => (
                    <Pressable
                      key={value}
                      onPress={() => people.update(friend.name, { pays: value })}
                      style={{
                        borderRadius: 999,
                        borderWidth: 2,
                        borderColor: friend.pays === value ? T.ink : T.line,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: friend.pays === value ? T.ink : T.paper,
                      }}
                    >
                      <Text
                        style={{
                          color: friend.pays === value ? T.paper : T.ink,
                          fontFamily: F.bodyBold,
                          fontSize: 13,
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}

          <Text style={{ color: T.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 }}>
            {collect === "leader"
              ? "Every bag comes to your block, and you hand the rest out."
              : "Each bag goes to the block under its own name. Yours comes to you."}
          </Text>
        </Card>
      )}

      <Step number="02" title={whereHeading} />
      <Card style={{ gap: 10 }}>
        {sharing.length > 0 && !ownFood && !bagsToMe && (
          <Text style={{ color: T.muted, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>
            Nothing in this cart is coming to you, but we still need somebody to call if a
            bag cannot be handed over.
          </Text>
        )}
        <Field label="Your name" value={name} onChange={setName} />
        <Field label="WhatsApp number" value={phone} onChange={setPhone} keyboard="phone-pad" />
        <Blocks label="Hostel or block" value={hostel} onChange={setHostel} all={hostels} />
        <Field
          label="Anything we should know?"
          value={note}
          onChange={setNote}
          placeholder="A room number, a gate, no pepper"
        />

        {/*
            Buying it for somebody else.

            Folded away, because nearly every order is for whoever is
            typing and two more boxes on every checkout is a tax on all of
            them to serve the few. The website has had this since the first
            term and the app had nothing, so a gift bought on a phone
            arrived with the buyer's name on the bag.

            Not inside a group: a group is already several people with
            their own names and blocks, and a gift in one is two answers to
            the same question.
         */}
        {sharing.length === 0 && (
          <>
            <Pressable onPress={() => setGiftOpen((was) => !was)}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: T.brand }}>
                {giftOpen ? "Not a gift after all" : "Sending this to somebody else?"}
              </Text>
            </Pressable>
            {giftOpen && (
              <>
                <Text style={{ fontFamily: F.body, fontSize: 12, color: T.muted, lineHeight: 18 }}>
                  Put their block above. You still pay.
                </Text>
                <Field label="Their name" value={giftName} onChange={setGiftName} />
                <Field
                  label="Their number"
                  value={giftPhone}
                  onChange={setGiftPhone}
                  keyboard="phone-pad"
                />
              </>
            )}
          </>
        )}
      </Card>

      <Step number="03" title="Pay" />
      <Card style={{ gap: 8 }}>
        {(
          [
            ["transfer", "Bank transfer", "Account details on the next screen, with a number to put in the narration."],
            ["card", "Card", "We send the link to your WhatsApp after you order."],
          ] as const
        ).map(([value, title, detail]) => (
          <Pressable
            key={value}
            onPress={() => setMethod(value)}
            style={{
              borderWidth: 2,
              borderColor: T.ink,
              backgroundColor: method === value ? T.ink : T.paper,
              borderRadius: 14,
              padding: 12,
              gap: 2,
            }}
          >
            <Text
              style={{
                fontFamily: F.bodyBold,
                fontSize: 15,
                color: method === value ? T.shell : T.ink,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontFamily: F.body,
                fontSize: 13,
                lineHeight: 19,
                color: method === value ? T.onInkMuted : T.muted,
              }}
            >
              {detail}
            </Text>
          </Pressable>
        ))}
      </Card>

      {/* What the order comes to, for the card link's rough conversion: the
          same number the Total row shows. */}
      {/* A parent in London cannot make a Nigerian transfer. The website has
          asked this on its food checkout all along and the app never did, so
          whoever was paying reached the last screen and found a naira figure
          and an account number they could not use.

          Directly under the question it answers. It used to sit up beside
          the delivery time, which is a different subject entirely: whose
          money this is only makes sense once they have said they are paying
          by card, and appearing anywhere else reads as a question about the
          food. */}
      {method === "card" && (shop.monies ?? []).length > 0 && (
        <Card style={{ gap: 8 }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>
            Is somebody abroad paying?
          </Text>
          <Text style={{ color: T.muted, fontFamily: F.body, fontSize: 13, lineHeight: 19 }}>
            We send a card link in their money. The order is still {naira(owed)};
            the amount on the link is worked out at our rate, so it is close
            rather than exact.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[{ code: "", label: "No, naira" }, ...(shop.monies ?? [])].map((one) => (
              <Pressable
                key={one.code || "naira"}
                onPress={() => setMoney(one.code)}
                style={{
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: T.ink,
                  backgroundColor: money === one.code ? T.volt : T.paper,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: T.ink, fontFamily: F.bodySemi, fontSize: 14 }}>
                  {one.label}
                </Text>
                {"rate" in one && one.rate > 0 && (
                  <Text style={{ color: money === one.code ? T.ink : T.muted, fontFamily: F.mono, fontSize: 11 }}>
                    about {one.symbol}
                    {(Math.ceil((owed / one.rate) * 10) / 10).toFixed(2)}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      <Card style={{ gap: 6 }}>
        <Row label="Food" value={naira(food)} />

        <Row
          label={
            offered
              ? offered.note || "Delivery, on offer"
              : `Delivery (${items} item${items === 1 ? "" : "s"})`
          }
          value={naira(fee)}
        />

        {/* Why the line above says what it says. Four items costing more
            than three looks arbitrary until the whole ladder is there, and a
            fee nobody can account for reads as one that was made up. The
            website has had this since the ladder went in; the app showed the
            number and left them to work it out.

            A promotion is a price rather than a ladder, so there is nothing
            to show, and a share worked out when a group closes is not this
            cart's to explain. */}
        {!offered && fee > 0 && (
          byValue.length > 0 && !picked ? (
            // Two errands on one trip. The rungs are no use here: what the
            // customer wants is the two halves and what they add up to,
            // which is the thing that made seven thousand look like a
            // mistake in the first place.
            <FeeWhy
              rows={[
                ...(marketHalf.length > 0
                  ? [
                      {
                        label: `Market shopping, ${naira(cartTotal(marketHalf))}`,
                        fee: feeForValue(cartTotal(marketHalf), byValue),
                      },
                    ]
                  : []),
                ...(restHalf.length > 0
                  ? [
                      {
                        label: `${countItems(restHalf)} item${
                          countItems(restHalf) === 1 ? "" : "s"
                        } from the kitchens`,
                        fee: feeFrom(countItems(restHalf), runBands, run?.flashFee ?? null),
                      },
                    ]
                  : []),
                ...(area.runExtra > 0
                  ? [{ label: `${area.name} is a longer trip`, fee: area.runExtra }]
                  : []),
                // Its own row rather than folded into the one above, which
                // names a single area and would be quietly wrong about why
                // the number moved.
                ...(secondStop > 0
                  ? [{ label: `A second stop, in ${farNames}`, fee: secondStop }]
                  : []),
              ]}
              here={-1}
              total={{ label: "Delivery", fee }}
              note="Two errands on one trip. The market shopping is priced by what it comes to, because a trip to the market is one trip whether it is two bags or five. The kitchens are priced by how much room the food takes in the car. One fee either way, however many places are in it."
            />
          ) : (
            <FeeWhy
              rows={
                picked
                  ? bandRows(sameDayBands, null)
                  : bandRows(runBands, run?.flashFee ?? null)
              }
              here={bandIndex(
                picked ? sameDayBands : runBands,
                items
              )}
              extra={
                picked && picked.urgent && (shop.sameDay?.urgentExtra ?? 0) > 0
                  ? { label: "Leaving within the hour", fee: shop.sameDay!.urgentExtra }
                  : farExtra > 0
                    ? {
                        label:
                          secondStop > 0
                            ? `Two stops, in ${farNames}`
                            : `${area.name} is a longer trip`,
                        fee: farExtra,
                      }
                    : null
              }
              note={
                picked
                  ? "A car of its own is one order, one driver, one trip, so there is nobody to share the petrol with. A run carries everybody at once, which is why it costs less."
                  : farExtra > 0
                    ? `${secondStop > 0 ? `Your order comes from ${farNames}, which is two stops rather than one` : `${area.name} is a longer trip than Sangotedo`}, so every rung is ${naira(farExtra)} more. One fee for the whole order, however many kitchens are in it: it is the car, not the food, so it goes by how much room your order takes.`
                    : "One fee for the whole order, however many kitchens are in it. It is the car, not the food, so it goes by how much room your order takes."
              }
            />
          )
        )}

        {/* "Pay 2,500 less: Wednesday is 4,000" used to sit here, under
            the fee it undercut. It was money off for somebody who had not
            asked, back when the day was decided for them and this was the
            only way to change it. The row of days at the top is that
            question asked properly. */}

        {applied && <Row label={`Code ${applied.code}`} value={`−${naira(applied.discount)}`} />}
        <View
          style={{
            borderTopWidth: 2,
            borderStyle: "dashed",
            borderColor: T.line,
            marginVertical: 2,
          }}
        />
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
        >
          <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>Total</Text>
          <Display size={34}>{naira(owed)}</Display>
        </View>

        {nearly && (
          <Text
            style={{ color: T.brandDark, fontSize: 13, fontFamily: F.bodySemi, lineHeight: 19 }}
          >
            {nearly.fee === 0
              ? "Delivery would be free"
              : `Delivery would be ${naira(nearly.fee)}`}{" "}
            {nearly.blocking.length <= 2
              ? `without the ${nearly.blocking.join(" and ")}.`
              : `on the ${
                  nearly.qualifying.length <= 2
                    ? nearly.qualifying.join(" and ")
                    : `${nearly.qualifying.length} items it covers`
                } on their own.`}
          </Text>
        )}

        {/* A code is something somebody was given in a group chat, so it is
            typed in rather than carried by a link. Checked here, by the same
            rule that will check it when the order is placed. */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TextInput
            value={code}
            onChangeText={(next) => {
              setCode(next.toUpperCase());
              setCodeError("");
            }}
            placeholder="Discount code"
            placeholderTextColor={T.muted}
            autoCapitalize="characters"
            style={{
              flex: 1,
              borderWidth: 2,
              borderColor: T.ink,
              borderRadius: 12,
              backgroundColor: T.field,
              minHeight: 50,
              paddingHorizontal: 14,
              color: T.ink,
              fontFamily: F.mono,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={async () => {
              setCodeError("");
              try {
                const result = await api.coupon({
                  code,
                  batchId: runId,
                  phone,
                  lines: lines.map((line) => ({
                    menu_item_id: line.itemId,
                    qty: line.qty,
                    option_ids: line.optionIds,
                  })),
                });
                setApplied({ code: code.trim().toUpperCase(), ...result });
              } catch (problem) {
                setApplied(null);
                setCodeError(problem instanceof Error ? problem.message : "That code did not work.");
              }
            }}
            disabled={code.trim() === "" || runId === ""}
            style={{
              borderRadius: 12,
              borderWidth: 2,
              borderColor: T.ink,
              minHeight: 50,
              paddingHorizontal: 18,
              justifyContent: "center",
              backgroundColor: code.trim() === "" ? T.shell : T.ink,
            }}
          >
            <Text
              style={{
                color: code.trim() === "" ? T.muted : T.paper,
                fontFamily: F.bodyBold,
                fontSize: 15,
              }}
            >
              Apply
            </Text>
          </Pressable>
        </View>
        {applied && (
          <Text style={{ color: T.mint, fontFamily: F.bodySemi, fontSize: 14 }}>
            {applied.label} applied.
          </Text>
        )}
        {codeError !== "" && (
          <Text style={{ color: T.brandDark, fontFamily: F.bodySemi, fontSize: 14 }}>
            {codeError}
          </Text>
        )}
      </Card>

      {unresolved.length > 0 && (
        <Text style={{ color: T.brandDark, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20 }}>
          {unresolved[0].goesTo === null
            ? `Say where ${unresolved[0].name}'s food goes.`
            : `${unresolved[0].name} needs a phone number and a block, since the food goes to them.`}
        </Text>
      )}

      {splitNotReady && (
        <Text style={{ color: T.brandDark, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20 }}>
          Splitting needs somebody other than you to have food in the cart. Tap a name under each item.
        </Text>
      )}

      {error !== "" && (
        <Text style={{ color: T.brandDark, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20 }}>
          {error}
        </Text>
      )}

    </ScrollView>

    {/* The total and the button, held where the thumb is rather than at the
        bottom of a form nobody has finished scrolling. */}
    <View
      style={{
        backgroundColor: T.shell,
        borderTopWidth: 2,
        borderTopColor: T.ink,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 28,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View>
        <Ticket>Total</Ticket>
        <Display size={30}>{naira(owed)}</Display>
      </View>

      <View style={{ flex: 1 }}>
        <Pressable
          onPress={place}
          disabled={!ready}
          accessibilityRole="button"
          style={({ pressed }) => ({
            minHeight: 54,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: T.ink,
            backgroundColor: ready ? T.brand : T.line,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [],
          })}
        >
          <Text
            style={{
              color: ready ? T.paper : T.muted,
              fontFamily: F.bodyBold,
              fontSize: 16,
            }}
          >
            {busy ? "Placing…" : `Place order · ${method === "card" ? "Card" : "Transfer"}`}
          </Text>
        </Pressable>
      </View>
    </View>
    </View>
  );
}

/** A numbered step, exactly as the board sets one: the number in the
 *  display face, in Tomato, and the word beside it. */
function Step({ number, title }: { number: string; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 4 }}>
      <Display size={24} colour={T.brand}>
        {number}
      </Display>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>{title}</Text>
    </View>
  );
}

/**
 * The blocks admin delivers to, picked rather than typed.
 *
 * A typed block is misspelt often enough to make a run sheet impossible to
 * sort, which is why the website asks people to pick. With no list set up
 * this is the old text box, so a shop that has not filled one in still works.
 */
function Blocks({
  label,
  value,
  onChange,
  all,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  all: string[];
}) {
  const [open, setOpen] = useState(false);
  if (all.length === 0) return <Field label={label} value={value} onChange={onChange} />;

  // The commonest few in front, as the board draws them, with everything
  // else one tap behind a pill. A picked block that is not in the front few
  // joins them, so what they chose is always on the screen.
  const front = all.slice(0, 8);
  const shown = value !== "" && !front.includes(value) ? [value, ...front.slice(0, 7)] : front;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: T.ink, fontFamily: F.bodySemi, fontSize: 13 }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {shown.map((one) => {
          const on = one === value;
          return (
            <Pressable
              key={one}
              onPress={() => onChange(one)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{
                minHeight: 42,
                justifyContent: "center",
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: on ? T.ink : T.line,
                backgroundColor: on ? T.brand : T.paper,
              }}
            >
              <Text
                style={{
                  color: on ? T.paper : T.ink,
                  fontFamily: on ? F.bodyBold : F.bodySemi,
                  fontSize: 14,
                }}
              >
                {one}
              </Text>
            </Pressable>
          );
        })}

        {all.length > shown.length && (
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Choose from all ${all.length} blocks`}
            style={{
              minHeight: 42,
              justifyContent: "center",
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: T.ink,
            }}
          >
            <Text style={{ color: T.ink, fontFamily: F.bodySemi, fontSize: 14 }}>
              All {all.length} blocks
            </Text>
          </Pressable>
        )}
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(20,17,15,0.45)", justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View
            style={{
              backgroundColor: T.shell,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "70%",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                gap: 8,
                borderBottomWidth: 2,
                borderBottomColor: T.ink,
              }}
            >
              <Display size={26} style={{ flex: 1 }}>
                {label}
              </Display>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={T.ink} />
              </Pressable>
            </View>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
              {all.map((one) => (
                <Pressable
                  key={one}
                  onPress={() => {
                    onChange(one);
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: 1,
                    borderTopColor: T.line,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: one === value ? T.brand : T.ink,
                      fontFamily: one === value ? F.bodyBold : F.body,
                    }}
                  >
                    {one}
                  </Text>
                  {one === value && <Ionicons name="checkmark" size={18} color={T.brand} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  keyboard?: "phone-pad";
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: T.ink, fontFamily: F.bodySemi, fontSize: 13 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        style={{
          borderWidth: 2,
          borderColor: T.ink,
          borderRadius: 12,
          backgroundColor: T.field,
          minHeight: 50,
          paddingHorizontal: 14,
          fontSize: 16,
          fontFamily: F.body,
          color: T.ink,
        }}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: T.ink, fontFamily: F.body, fontSize: 15, flexShrink: 1 }}>{label}</Text>
      <Text style={{ color: T.ink, fontFamily: F.bodySemi, fontSize: 15 }}>{value}</Text>
    </View>
  );
}

function feeFrom(items: number, bands: { maxItems: number | null; fee: number }[], flash: number | null) {
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 4000 }];
  const band =
    ladder.find((step) => step.maxItems !== null && items <= step.maxItems) ?? ladder[ladder.length - 1];
  return flash === null ? band.fee : Math.max(0, flash + (band.fee - ladder[0].fee));
}
