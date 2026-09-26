import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  pricesByValue,
  valueLadderFor,
  aroundPhrase,
  canGoSameDay,
  dearestArea,
  ESTIMATE_NOTE,
  lagosToday,
  naira,
  nextArrival,
  runCarries,
  runCovers,
  sameDayFeeFor,
  withExtra,
  type Shop,
  type Slot,
} from "@/lib/api";
import { cart, cartTotal, countItems, me, mine, people, useStored } from "@/lib/store";
import KeepCart from "@/components/KeepCart";
import { registerForPush } from "@/lib/push";
import { T } from "@/lib/theme";

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

  /** What this number already has on the chosen run, if anything. */
  const [adding, setAdding] = useState<{ items: number; feeCharged: number }>({
    items: 0,
    feeCharged: 0,
  });

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

  // An order already placed on this run is topped up, not duplicated: only
  // the difference in delivery is charged. Re-asked whenever the run or the
  // number changes, because both decide the answer.
  useEffect(() => {
    let alive = true;
    if (!runId || phone.trim().length < 10) {
      setAdding({ items: 0, feeCharged: 0 });
      return;
    }
    void api
      .adding(runId, phone.trim(), saved.token)
      .then((next) => {
        if (alive) setAdding({ items: next.items, feeCharged: next.feeCharged });
      })
      .catch(() => {
        // Not knowing means the ordinary fee, which is what it would be anyway.
        if (alive) setAdding({ items: 0, feeCharged: 0 });
      });
    return () => {
      alive = false;
    };
  }, [runId, phone, saved.token]);

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
  const marketHalf = lines.filter((line) => pricesByValue(shop, kitchenOf(line)));
  const restHalf = lines.filter((line) => !pricesByValue(shop, kitchenOf(line)));
  const area = dearestArea(shop, kitchens);
  const runBands = withExtra(shop?.bands ?? [], area.runExtra);
  const sameDayBands = withExtra(shop?.sameDay?.bands ?? [], area.sameDayExtra);

  const runsHere = (shop?.runs ?? []).filter(
    (one) => !one.closed && !one.full && runCovers(one, cartAreas) && runCarries(one, kitchens)
  );
  // One thing from a far area makes the whole order a run: a car cannot be
  // in two places in three hours.
  const slots = canGoSameDay(cartAreas) ? (shop?.sameDay?.slots ?? []) : [];

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

  const arriving = picked
    ? `${aroundPhrase(picked.at)} ${picked.day}`
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

  const ladder = byValue.length > 0 && !picked
    ? // Nothing but market shopping is charged by what the shopping comes
      // to. Mix a restaurant in and the dearer of the two measures comes
      // back, so a pepper added to twelve pizzas cannot drop the whole
      // order onto the market's ladder.
      feeAcross({
        marketFood: cartTotal(marketHalf),
        // The container count floors at one, which is right for a cart and
        // wrong for half of one: no restaurant lines must mean no restaurant
        // fee, not the price of a container nobody ordered.
        restaurantFee: (() => {
          const containers =
            (restHalf.length === 0 ? 0 : countItems(restHalf)) + adding.items;
          return containers === 0 ? 0 : feeFrom(containers, runBands, run?.flashFee ?? null);
        })(),
        bands: byValue,
      }) + area.runExtra
    : picked
    ? sameDayFeeFor(items, picked.urgent, sameDayBands, shop?.sameDay?.urgentExtra ?? 0)
    : shop && run
      ? Math.max(0, feeFrom(items + adding.items, runBands, run.flashFee) - adding.feeCharged)
      : 0;

  /*
   * The one alternative worth a sentence.
   *
   * Only where the fee comes from the container ladder on both sides: a
   * market is priced by what the shopping comes to, and a promotion is a
   * price rather than a ladder, so there is nothing to compare.
   */
  const otherWay = (() => {
    if (byValue.length > 0 || items === 0) return null;

    const runFee = run
      ? Math.max(0, feeFrom(items + adding.items, runBands, run.flashFee) - adding.feeCharged)
      : 0;

    if (picked) {
      // On a car of its own. Name the run whether or not it is cheaper: a
      // run that prices level is still the answer to when else you could
      // get this.
      const soonest = runsHere[0];
      if (!soonest) return null;
      const fee = Math.max(
        0,
        feeFrom(items + adding.items, runBands, soonest.flashFee) - adding.feeCharged
      );
      const now = sameDayFeeFor(items, picked.urgent, sameDayBands, shop?.sameDay?.urgentExtra ?? 0);
      return {
        runId: soonest.id,
        at: "",
        said: `${soonest.deliveryWindow.charAt(0).toLowerCase()}${soonest.deliveryWindow.slice(1)} ${soonest.label.split(" · ")[0]}`,
        fee,
        saving: Math.max(0, now - fee),
      };
    }

    // On a run. Only worth saying a car exists at all, and only when it
    // costs more, because a cheaper one would already have been chosen.
    const soon = slots[0];
    if (!soon) return null;
    const fee = sameDayFeeFor(items, soon.urgent, sameDayBands, shop?.sameDay?.urgentExtra ?? 0);
    return fee > runFee
      ? { runId: "", at: soon.at, said: `${aroundPhrase(soon.at)} ${soon.day}`, fee, saving: 0 }
      : null;
  })();

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
        heardFrom,
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}>
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
      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
        <Text style={{ fontWeight: "800", fontSize: 17, color: T.ink }}>
          Order now, get it {arriving}
        </Text>

        <Text style={{ color: T.muted }}>
          {picked
            ? "A car of its own, because no run is going in time for this."
            : "Everybody's food in one car, which is why it costs less."}
        </Text>

        {/* One line, because three paragraphs about Lekki is three
            paragraphs nobody reads. Why it waits for a run, and the way out
            where waiting is the wrong trade. */}
        {far.length > 0 && !noRunThere && (
          <Text style={{ color: T.brandDark }}>
            <Text style={{ fontWeight: "700" }}>{farNames} goes out on a run only.</Text>
            {farSooner !== ""
              ? ` Take ${far.length === 1 ? "it" : "those"} out and the rest can come ${farSooner}.`
              : " Everything here travels together, so there is one delivery fee."}
          </Text>
        )}

        {/* A run kept to one counter, said before somebody wonders where the
            usual runs went. The line above already names when this cart can
            come; this says why it is not sooner. */}
        {wrongCounter.length > 0 && (
          <Text style={{ color: T.brandDark }}>
            <Text style={{ fontWeight: "700" }}>
              Not every run stops at {counterSaid}.
            </Text>
            {runsHere.length > 0
              ? ` The next one that does is ${runsHere[0].label}.`
              : slots.length > 0
                ? " None of the runs coming up are, so this goes as a car of its own, at the time you pick below."
                : " None of the runs coming up are."}
          </Text>
        )}

        {/* An estimate, and said to be one: four o'clock to the minute is a
            promise nobody can keep in Lagos traffic. */}
        <Text style={{ color: T.muted }}>{ESTIMATE_NOTE}</Text>

        {/* The other way of getting it here, and a way to take it. A car of
            its own can be two and a half thousand dearer than waiting for a
            run, and nobody should pay that without being told there was
            another way. It reads as a button because it is one: a sentence
            people cannot tell is tappable is a sentence they never tap. */}
        {otherWay && (
          <Pressable
            onPress={() => {
              if (picked) {
                setDeliverAt("");
                setRunId(otherWay.runId);
              } else {
                setDeliverAt(otherWay.at);
              }
            }}
            style={{
              backgroundColor: T.tint,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: T.brandDark, fontWeight: "700" }}>
              {picked
                ? `Rather pay less? ${otherWay.said} for ${naira(otherWay.fee)}` +
                  (otherWay.saving > 0 ? `, ${naira(otherWay.saving)} less.` : ".")
                : `Need it sooner? A car of its own can be there ${otherWay.said}, for ${naira(otherWay.fee)}.`}
              <Text style={{ textDecorationLine: "underline" }}> Tap for that.</Text>
            </Text>
          </Pressable>
        )}

        {noRunThere && (
          <Text style={{ color: T.brandDark, fontWeight: "700" }}>
            No run is going to {farNames} just now, and a car of its own
            cannot get there and back in time. Take {far.length === 1 ? "it" : "those"}{" "}
            out and the rest can come {farSooner || "on the next one"}.
          </Text>
        )}

        {runsHere.length === 0 && far.length === 0 && slots.length === 0 && (
          <Text style={{ color: T.muted }}>
            Nothing is going just now. Try again shortly.
          </Text>
        )}
      </View>

      {(shop.promoters ?? []).length > 0 && (
        <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
          {/* Asked once, on the one form a first order passes through.
              Whoever they name is theirs for life, so there is no second
              chance at it, and "somewhere else" is a real answer: most
              people are nobody's referral. */}
          <Text style={{ fontWeight: "800", color: T.ink }}>
            Where did you hear about us?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[{ code: "", name: "Somewhere else" }, ...(shop.promoters ?? [])].map((one) => (
                <Pressable
                  key={one.code || "none"}
                  onPress={() => setHeardFrom(one.code)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: heardFrom === one.code ? T.brand : T.line,
                    backgroundColor: heardFrom === one.code ? T.tint : T.paper,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: T.ink, fontWeight: heardFrom === one.code ? "800" : "400" }}>
                    {one.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {sharing.length > 0 && (
        <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 10 }}>
          <Text style={{ fontWeight: "800", color: T.ink }}>
            Group order · {sharing.length + 1} people
          </Text>

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
                borderWidth: 1,
                borderColor: mode === value ? T.brand : T.line,
                backgroundColor: mode === value ? T.tint : T.paper,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ fontWeight: "700", color: T.ink }}>{title}</Text>
              <Text style={{ color: T.muted }}>{detail}</Text>
            </Pressable>
          ))}

          {sharing.map((friend) => (
            <View key={friend.name} style={{ gap: 8, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10 }}>
              <Text style={{ fontWeight: "800", color: T.ink }}>{friend.name}&apos;s food goes</Text>
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
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      backgroundColor: friend.goesTo === value ? T.ink : "rgba(20,17,15,0.06)",
                    }}
                  >
                    <Text style={{ color: friend.goesTo === value ? T.paper : T.ink, fontWeight: "700" }}>
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
                  <Text style={{ color: T.muted, fontWeight: "700" }}>{friend.name} pays by</Text>
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
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: friend.pays === value ? T.ink : "rgba(20,17,15,0.06)",
                      }}
                    >
                      <Text style={{ color: friend.pays === value ? T.paper : T.ink, fontWeight: "700", fontSize: 13 }}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}

          <Text style={{ color: T.muted, fontSize: 13 }}>
            {collect === "leader"
              ? "Every bag comes to your block, and you hand the rest out."
              : "Each bag goes to the block under its own name. Yours comes to you."}
          </Text>
        </View>
      )}

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 10 }}>
        <Text style={{ fontWeight: "800", color: T.ink }}>{whereHeading}</Text>
        {sharing.length > 0 && !ownFood && !bagsToMe && (
          <Text style={{ color: T.muted }}>
            Nothing in this cart is coming to you, but we still need somebody to call if a
            bag cannot be handed over.
          </Text>
        )}
        <Field label="Your name" value={name} onChange={setName} />
        <Field label="Phone number" value={phone} onChange={setPhone} keyboard="phone-pad" />
        <Blocks label="Hostel or block" value={hostel} onChange={setHostel} all={hostels} />
      </View>

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
        <Text style={{ fontWeight: "800", color: T.ink }}>How are you paying?</Text>
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
              borderWidth: 1,
              borderColor: method === value ? T.brand : T.line,
              backgroundColor: method === value ? T.tint : T.paper,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: "700", color: T.ink }}>{title}</Text>
            <Text style={{ color: T.muted }}>{detail}</Text>
          </Pressable>
        ))}
      </View>

      {adding.items > 0 && picked === null && (
        <View style={{ backgroundColor: T.tint, borderRadius: T.radius, padding: 14 }}>
          <Text style={{ fontWeight: "800", color: T.brandDark }}>
            Adding to the order you already have on this run
          </Text>
          <Text style={{ color: T.ink, marginTop: 2 }}>
            You already have {adding.items} item{adding.items === 1 ? "" : "s"} coming. This goes
            in the same delivery, so you only pay the difference, never a second delivery fee.
          </Text>
        </View>
      )}

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 6 }}>
        <Row label="Food" value={naira(food)} />

        <Row
          label={
            offered
              ? offered.note || "Delivery, on offer"
              : adding.items > 0
                ? `Delivery top-up (${items + adding.items} items)`
                : `Delivery (${items} item${items === 1 ? "" : "s"})`
          }
          value={naira(fee)}
        />
        {applied && <Row label={`Code ${applied.code}`} value={`−${naira(applied.discount)}`} />}
        <View style={{ height: 1, backgroundColor: T.line, marginVertical: 4 }} />
        <Row label="Total" value={naira(Math.max(0, food + fee - (applied?.discount ?? 0)))} strong />

        {nearly && (
          <Text style={{ color: T.brandDark, fontSize: 13, fontWeight: "700" }}>
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
            autoCapitalize="characters"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: T.ink,
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
              paddingHorizontal: 18,
              justifyContent: "center",
              backgroundColor: code.trim() === "" ? "rgba(20,17,15,0.08)" : T.ink,
            }}
          >
            <Text style={{ color: code.trim() === "" ? T.muted : T.paper, fontWeight: "800" }}>
              Apply
            </Text>
          </Pressable>
        </View>
        {applied && (
          <Text style={{ color: "#0f9d58", fontWeight: "700" }}>{applied.label} applied.</Text>
        )}
        {codeError !== "" && (
          <Text style={{ color: T.brandDark, fontWeight: "700" }}>{codeError}</Text>
        )}
      </View>

      {unresolved.length > 0 && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>
          {unresolved[0].goesTo === null
            ? `Say where ${unresolved[0].name}'s food goes.`
            : `${unresolved[0].name} needs a phone number and a block, since the food goes to them.`}
        </Text>
      )}

      {splitNotReady && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>
          Splitting needs somebody other than you to have food in the cart. Tap a name under each item.
        </Text>
      )}

      {error !== "" && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>
      )}

      <Pressable
        onPress={place}
        disabled={
          busy ||
          (picked === null && runId === "") ||
          lines.length === 0 ||
          unresolved.length > 0 ||
          splitNotReady
        }
        style={{
          backgroundColor: busy ? "rgba(20,17,15,0.2)" : T.brand,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: T.paper, fontWeight: "800", fontSize: 16 }}>
          {busy
            ? "Placing…"
            : `Place order · ${naira(Math.max(0, food + fee - (applied?.discount ?? 0)))}`}
        </Text>
      </Pressable>
    </ScrollView>
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

  return (
    <View>
      <Text style={{ color: T.muted, fontWeight: "700", marginBottom: 4 }}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={value === "" ? `Choose ${label.toLowerCase()}` : value}
        style={{
          borderWidth: 1,
          borderColor: T.line,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text style={{ flex: 1, fontSize: 16, color: value === "" ? T.muted : T.ink }}>
          {value === "" ? "Choose yours" : value}
        </Text>
        <Ionicons name="chevron-down" size={18} color={T.muted} />
      </Pressable>

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
            <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 8 }}>
              <Text style={{ flex: 1, fontWeight: "800", fontSize: 17, color: T.ink }}>{label}</Text>
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
                      fontWeight: one === value ? "800" : "400",
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
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  keyboard?: "phone-pad";
}) {
  return (
    <View>
      <Text style={{ color: T.muted, fontWeight: "700", marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        style={{
          borderWidth: 1,
          borderColor: T.line,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 16,
          color: T.ink,
        }}
      />
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: strong ? T.ink : T.muted, fontWeight: strong ? "800" : "400" }}>
        {label}
      </Text>
      <Text style={{ color: T.ink, fontWeight: strong ? "800" : "600" }}>{value}</Text>
    </View>
  );
}

function feeFrom(items: number, bands: { maxItems: number | null; fee: number }[], flash: number | null) {
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 4000 }];
  const band =
    ladder.find((step) => step.maxItems !== null && items <= step.maxItems) ?? ladder[ladder.length - 1];
  return flash === null ? band.fee : Math.max(0, flash + (band.fee - ladder[0].fee));
}
