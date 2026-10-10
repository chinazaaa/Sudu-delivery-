import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  api,
  bandIndex,
  feeAcross,
  feeFor,
  lagosToday,
  naira,
  nextArrival,
  pricesByValue,
  sameDayFeeFor,
  valueLadderFor,
} from "@/lib/api";
import { cart, cartTotal, countItems, party, people, useStored, type Line } from "@/lib/store";
import { useShop } from "@/lib/use-shop";
import Thumb from "@/components/Thumb";
import { Button, Card, Display, FloatingBar, Stepper, Ticket } from "@/components/ui";
import { F, T } from "@/lib/theme";

/** What is in the bag, and what it will cost to bring it. */
export default function Cart() {
  const router = useRouter();
  const [lines] = useStored(cart.read, []);
  // From the copy on the phone first, so the delivery fee is a number the
  // moment the cart opens rather than "at checkout" for as long as the
  // network takes and then a figure that appears from nowhere.
  const shop = useShop();
  const [friends] = useStored(people.read, []);
  // In a car, this cart is their part of it: it is finalised into the group
  // rather than checked out, and nobody has a delivery fee until it closes.
  const [seated] = useStored(party.read, null);
  const [adding, setAdding] = useState("");

  const items = countItems(lines);
  const food = cartTotal(lines);
  const run = shop?.runs[0] ?? null;

  /** One block per person, in the order the names were added, exactly as the
   *  website stacks them: everything of mine, then everything of Bola's. */
  const blocks = (() => {
    const names = friends.map((friend) => friend.name);
    const strays = [
      ...new Set(lines.map((line) => line.forName).filter((name) => name !== "" && !names.includes(name))),
    ];
    return ["", ...names, ...strays]
      .map((person) => ({ person, lines: lines.filter((line) => line.forName === person) }))
      .filter((block) => block.lines.length > 0);
  })();

  /** The menu a line came off, found by the dish rather than by the name of
   *  the restaurant, so renaming one in admin does not break the link. */
  const placeOf = (line: Line) =>
    shop?.menu.find((place) => place.items.some((one) => one.id === line.itemId)) ?? null;
  // What an offer does to this cart, asked of the shop because that is where
  // the rules live. Null until it answers, and null for a cart no offer
  // touches, and then the ladder is the right figure.
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
    if (lines.length === 0 || !run) {
      setPriced(null);
      return;
    }
    let alive = true;
    void api
      .offerOn({
        batchId: run.id,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          restaurantId: placeOf(line)?.restaurant.id ?? "",
          name: line.name,
          choices: line.choices,
        })),
      })
      .then((answer) => {
        if (alive) setPriced(answer);
      })
      .catch(() => {
        // The order prices the offer either way, so there is nothing to say.
        if (alive) setPriced(null);
      });
    return () => {
      alive = false;
    };
  }, [lines, run?.id, shop]);

  const offered = priced?.offer ?? null;

  if (lines.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: T.shell,
        }}
      >
        <Ticket>Nothing in the car yet</Ticket>
        <Display size={44} style={{ textAlign: "center", marginTop: 6 }}>
          Your cart is empty
        </Display>
        <Text
          style={{
            color: T.muted,
            textAlign: "center",
            marginTop: 8,
            fontFamily: F.body,
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          Pick a few things and they gather here, ready for the next run.
        </Text>
        <Button onPress={() => router.replace("/")} style={{ marginTop: 18 }}>
          Browse the menu
        </Button>
      </View>
    );
  }

  // What sharing a delivery would actually save them, on the food they have
  // actually chosen. "Split one delivery" is an idea; two real numbers is an
  // argument, and this is the moment it stops being abstract.
  // Only where the ladder is what they would pay. Under an offer this number
  // is not what ordering alone costs, and the whole point of the line is that
  // the two figures are real.
  // Which kitchens this cart touches, found the same way the checkout finds
  // them: a line carries the counter's name, not its id.
  const kitchenOf = (line: { itemId: string }) =>
    shop?.menu.find((one) => one.items.some((item) => item.id === line.itemId))
      ?.restaurant.id ?? "";
  const kitchensIn = [
    ...new Set(lines.map((line) => kitchenOf(line))),
  ].filter(Boolean);
  const decided = shop
    ? nextArrival(
        shop.runs.filter((one) => !one.closed && !one.full),
        shop.sameDay?.slots ?? [],
        lagosToday()
      )
    : null;
  const soon =
    decided && !decided.onARun
      ? (shop?.sameDay?.slots ?? []).find((one) => one.at === decided.at) ?? null
      : null;

  // What this cart costs to bring, worked out once.
  //
  // It used to be worked out twice: the summary at the bottom took the
  // container ladder across the whole cart, and the group card took the two
  // errands properly. A cart with market shopping and a restaurant in it
  // then said seven thousand at the top and six at the bottom, and only one
  // of those was what the checkout was going to charge. The cart is allowed
  // one number, and it is the checkout's.
  //
  // Priced the way the food is actually going, not the way it usually goes.
  // With no run inside the days people can order ahead, the soonest thing is
  // a car of its own, and quoting the run ladder here had the cart promising
  // four thousand over a checkout about to charge six and a half.
  const byValue = shop ? valueLadderFor(shop, kitchensIn) : [];
  const carFee =
    shop && items > 0
      ? soon && (shop.sameDay?.bands?.length ?? 0) > 0
        ? sameDayFeeFor(items, soon.urgent, shop.sameDay!.bands, shop.sameDay!.urgentExtra ?? 0)
        : byValue.length > 0
          ? // Two errands, two fees. The market half pays by what the
            // shopping comes to and the restaurant half by how much of the
            // car it fills, and the bill is the two added.
            feeAcross({
              marketFood: cartTotal(
                lines.filter((line) => pricesByValue(shop, kitchenOf(line)))
              ),
              // The container count floors at one, which is right for a cart
              // and wrong for half of one: no restaurant lines must mean no
              // restaurant fee, not the price of a container nobody ordered.
              restaurantFee: (() => {
                const rest = lines.filter((line) => !pricesByValue(shop, kitchenOf(line)));
                return rest.length === 0
                  ? 0
                  : feeFor(countItems(rest), shop.bands, run?.flashFee ?? null);
              })(),
              bands: byValue,
            })
          : feeFor(items, shop.bands, run?.flashFee ?? null)
      : 0;

  // An offer prices delivery outright, so there is no ladder left to beat
  // and nothing for the group card to compare against.
  const fee = offered ? offered.fee : shop && (run || soon) ? carFee : null;
  const alone = offered ? 0 : carFee;

  // An offer this cart nearly has. From the inside, a qualifying dish with
  // something else beside it looks like the offer simply not working, so it
  // says which is which and leaves the choice to them.
  const nearly = priced?.nearly ?? null;

  // The meter at the top: how full the car is, and how much more fits before
  // the fee goes up a rung. It only tells the truth where the fee is the
  // container ladder, so shopping priced by what it comes to, a picked time
  // and an offer each leave it out rather than draw a number that is wrong.
  const onTheLadder = !offered && byValue.length === 0 && soon === null && shop !== null;
  const ladder = shop && shop.bands.length > 0 ? shop.bands : [];
  const rung = onTheLadder && shop ? bandIndex(shop.bands, items) : -1;
  const cap = rung >= 0 ? ladder[rung]?.maxItems ?? null : null;
  const tier =
    cap === null ? "" : `up to ${cap} item${cap === 1 ? "" : "s"}`;
  const room = cap === null ? null : cap - items;
  const hint =
    fee === null
      ? "The fee lands with the next run."
      : room === null
        ? offered
          ? offered.note || "Delivery is on offer for this cart."
          : `Delivery on this cart is ${naira(fee)}.`
        : room > 0
          ? `${room} more item${room === 1 ? "" : "s"} ${
              room === 1 ? "fits" : "fit"
            } in ${naira(fee)}, from any kitchen.`
          : `This car is full at ${naira(fee)}.`;

  const countLabel = `${items} item${items === 1 ? "" : "s"}${
    tier === "" ? "" : ` · ${tier}`
  }`;

  return (
    <View style={{ flex: 1, backgroundColor: T.shell }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 150, gap: 14 }}>
        {/* How full the car is. The first thing on the screen, because the
            fee is the one number people are deciding about. */}
        <View
          style={{
            backgroundColor: T.ink,
            borderRadius: T.radius,
            paddingVertical: 14,
            paddingHorizontal: 16,
            gap: 10,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}
          >
            <Ticket colour={T.volt}>Fee for this car</Ticket>
            {tier !== "" && (
              <Text style={{ fontFamily: F.mono, fontSize: 11, color: T.onInkMuted }}>
                {tier.toUpperCase()}
              </Text>
            )}
          </View>

          {cap !== null && cap <= 14 && (
            <View style={{ flexDirection: "row", gap: 4 }}>
              {Array.from({ length: cap }, (_, at) => (
                <View
                  key={at}
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: at < items ? T.brand : T.inkLine,
                  }}
                />
              ))}
            </View>
          )}

          <Text style={{ fontFamily: F.body, fontSize: 13, color: T.onInk, lineHeight: 19 }}>
            {hint}
          </Text>
        </View>

        {nearly && (
          <View
            style={{
              backgroundColor: T.tint,
              borderRadius: T.radius,
              borderWidth: 2,
              borderColor: T.ink,
              padding: 14,
              gap: 4,
            }}
          >
            <Text style={{ fontFamily: F.bodyBold, color: T.brandDark, fontSize: 15 }}>
              {nearly.fee === 0
                ? "Delivery would be free"
                : `Delivery would be ${naira(nearly.fee)}`}
            </Text>
            <Text style={{ fontFamily: F.body, color: T.ink, fontSize: 14, lineHeight: 20 }}>
              {nearly.note || "An offer"} is on for part of this cart.{" "}
              {nearly.blocking.length <= 2
                ? `${nearly.blocking.join(" and ")} ${
                    nearly.blocking.length === 1 ? "is" : "are"
                  } not in it, so it does not apply.`
                : nearly.qualifying.length <= 2
                  ? `Only the ${nearly.qualifying.join(" and ")} ${
                      nearly.qualifying.length === 1 ? "is" : "are"
                    } in it, so everything else would have to come out.`
                  : `Only ${nearly.qualifying.length} of your items are in it, and the other ${nearly.blocking.length} would have to come out.`}
            </Text>
          </View>
        )}

        {/* Everything in the cart, in one drawn card, with a hairline
            between the rows and the way to add more at the bottom of it. */}
        <View
          style={{
            backgroundColor: T.paper,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: T.radius,
            overflow: "hidden",
          }}
        >
          {blocks.map((block) => (
            <View key={block.person === "" ? "me" : block.person}>
              {friends.length > 0 && (
                <View
                  style={{
                    backgroundColor: T.shell,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderBottomWidth: 1,
                    borderBottomColor: T.line,
                  }}
                >
                  <Ticket>{block.person === "" ? "You" : block.person}</Ticket>
                </View>
              )}

              {block.lines.map((line) => (
                <View
                  key={line.key}
                  style={{ borderBottomWidth: 1, borderBottomColor: T.line, padding: 12 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        overflow: "hidden",
                        backgroundColor: T.tint,
                      }}
                    >
                      <Thumb src={line.imageUrl} name={line.name} ratio={1} />
                    </View>

                    {/* The same as the website: the dish in the cart is a way
                        back to the dish itself, for a second look or a
                        second one. */}
                    <Pressable
                      onPress={() => {
                        const place = placeOf(line);
                        // The line, not just the dish: tapping something in
                        // the cart is going back to what you chose, so the
                        // sheet opens holding your choices and saving
                        // replaces it.
                        if (place)
                          router.push(
                            `/r/${place.restaurant.id}?item=${line.itemId}` +
                              `&line=${encodeURIComponent(line.key)}`
                          );
                      }}
                      disabled={placeOf(line) === null}
                      accessibilityRole="link"
                      accessibilityLabel={`${line.name}, open on the ${line.restaurant} menu`}
                      style={{ flex: 1, minWidth: 0, gap: 2 }}
                    >
                      <Text
                        style={{
                          fontFamily: F.bodyBold,
                          fontSize: 15,
                          lineHeight: 19,
                          color: T.ink,
                        }}
                      >
                        {line.name}
                      </Text>
                      <Text style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>
                        {line.restaurant} · {naira(line.unitPrice * line.qty)}
                      </Text>
                      {line.choices.length > 0 && (
                        <Text style={{ fontFamily: F.body, fontSize: 12, color: T.muted }}>
                          {line.choices.join(", ")}
                        </Text>
                      )}
                    </Pressable>

                    <Stepper
                      qty={line.qty}
                      name={line.name}
                      tone="chalk"
                      onLess={() => cart.setQty(line.key, line.qty - 1)}
                      onMore={() => cart.setQty(line.key, line.qty + 1)}
                    />
                  </View>

                  {/* Taking something out had no button of its own: the only
                      way was to press minus until the row went, which
                      somebody who does not already know reads as a cart that
                      will not let them delete anything. */}
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 6,
                      marginTop: friends.length > 0 ? 10 : 8,
                      paddingLeft: 64,
                    }}
                  >
                    <Pressable
                      onPress={() => cart.setQty(line.key, 0)}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${line.name} from the cart`}
                    >
                      <Text
                        style={{
                          fontFamily: F.bodySemi,
                          fontSize: 12,
                          color: T.muted,
                          textDecorationLine: "underline",
                        }}
                      >
                        Remove
                      </Text>
                    </Pressable>

                    {friends.length > 0 &&
                      ["", ...friends.map((friend) => friend.name)].map((name) => {
                        const on = line.forName === name;
                        return (
                          <Pressable
                            key={name === "" ? "me" : name}
                            onPress={() => cart.setForName(line.key, name)}
                            style={{
                              borderRadius: 999,
                              borderWidth: 2,
                              borderColor: on ? T.ink : T.line,
                              paddingHorizontal: 11,
                              paddingVertical: 4,
                              backgroundColor: on ? T.ink : T.paper,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: F.bodySemi,
                                fontSize: 12,
                                color: on ? T.paper : T.ink,
                              }}
                            >
                              {name === "" ? "Me" : name}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                </View>
              ))}
            </View>
          ))}

          <Pressable
            onPress={() => router.push("/")}
            accessibilityRole="link"
            style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14 }}
          >
            <Ionicons name="add" size={18} color={T.brandDark} />
            <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.brandDark }}>
              Add from another kitchen, same car
            </Text>
          </Pressable>
        </View>

        {/* The bill. The total in the display face, because it is the line
            everybody scrolls down here to read. */}
        <Card style={{ gap: 8 }}>
          <Row label="Subtotal" value={naira(food)} />
          <Row
            label={
              offered
                ? offered.note || "Delivery, on offer"
                : tier === ""
                  ? "Delivery"
                  : `Delivery (${tier})`
            }
            value={fee === null ? "at checkout" : naira(fee)}
          />
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
            <Display size={34}>{naira(food + (fee ?? 0))}</Display>
          </View>
        </Card>

        {/* Groups live on the website: the link somebody is sent is a web
            address, and everybody in a car has to see the same page. Rather
            than pretend the app can do it, this hands over to the thing that
            can, with the food already in their cart waiting for them. */}
        {alone > 0 && (
          <Pressable
            onPress={() => router.push("/group")}
            accessibilityRole="link"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: T.tint,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
            }}
          >
            <Ionicons name="people-outline" size={22} color={T.brand} />
            <Text
              style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: T.ink, lineHeight: 20 }}
            >
              <Text style={{ fontFamily: F.bodyBold }}>Ordering with friends? </Text>
              Share this run and split the {naira(alone)}.
            </Text>
            <Ionicons name="chevron-forward" size={18} color={T.ink} />
          </Pressable>
        )}

        {/* Names on the bags. Not on the board, because the board draws one
            person's cart, but the fee does not move and the labels do. */}
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Ticket>{friends.length > 0 ? "People in this order" : "Ordering for friends?"}</Ticket>
            {friends.length > 0 && (
              <Pressable onPress={() => people.clear()}>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: T.muted }}>
                  Turn off
                </Text>
              </Pressable>
            )}
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: T.muted, lineHeight: 20 }}>
            {friends.length > 0
              ? "Tap a name under each item to say whose it is. Bags are labelled with these names."
              : "Add their names, then tap a name under each item. The delivery fee does not change."}
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {friends.map((friend) => (
              <Pressable
                key={friend.name}
                onPress={() => people.remove(friend.name)}
                accessibilityLabel={`Take ${friend.name} out of this order`}
                style={{
                  flexDirection: "row",
                  gap: 6,
                  borderWidth: 2,
                  borderColor: T.ink,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: T.ink }}>
                  {friend.name}
                </Text>
                <Text style={{ color: T.muted }}>✕</Text>
              </Pressable>
            ))}

            <TextInput
              value={adding}
              onChangeText={setAdding}
              placeholder="Add a name"
              placeholderTextColor={T.muted}
              onSubmitEditing={() => {
                void people.add(adding);
                setAdding("");
              }}
              style={{
                borderWidth: 2,
                borderColor: T.ink,
                borderRadius: 999,
                backgroundColor: T.field,
                paddingHorizontal: 14,
                paddingVertical: 7,
                minWidth: 130,
                color: T.ink,
                fontFamily: F.body,
                fontSize: 15,
              }}
            />
            <Pressable
              onPress={() => {
                void people.add(adding);
                setAdding("");
              }}
              style={{
                borderRadius: 999,
                borderWidth: 2,
                borderColor: T.ink,
                paddingHorizontal: 16,
                paddingVertical: 7,
                backgroundColor: adding.trim() === "" ? T.shell : T.ink,
              }}
            >
              <Text
                style={{
                  fontFamily: F.bodyBold,
                  fontSize: 14,
                  color: adding.trim() === "" ? T.muted : T.paper,
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      <FloatingBar
        label={countLabel}
        total={naira(food + (fee ?? 0))}
        action={seated ? "Finalise" : "Checkout"}
        onPress={() => router.push(seated ? "/finalise" : "/checkout")}
        bottom={24}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ fontFamily: F.body, fontSize: 15, color: T.ink, flexShrink: 1 }}>{label}</Text>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: T.ink }}>{value}</Text>
    </View>
  );
}
