import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, naira } from "@/lib/api";
import { cart, cartTotal, countItems, people, useStored, type Line } from "@/lib/store";
import { T } from "@/lib/theme";

/** What is in the bag, and what it will cost to bring it. */
export default function Cart() {
  const router = useRouter();
  const [lines] = useStored(cart.read, []);
  const [shop] = useStored(() => api.shop().catch(() => null), null);
  const [friends] = useStored(people.read, []);
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
  const fee =
    shop && run ? feeFrom(items, shop.bands, run.flashFee) : null;

  if (lines.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: T.ink }}>Your cart is empty</Text>
        <Text style={{ color: T.muted, textAlign: "center", marginTop: 6 }}>
          Pick a few things and they gather here, ready for the next run.
        </Text>
        <Pressable
          onPress={() => router.replace("/")}
          style={{ marginTop: 16, backgroundColor: T.brand, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: T.paper, fontWeight: "800" }}>Browse the menu</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }}>
        <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "800", color: T.ink }}>
              {friends.length > 0 ? "People in this order" : "Ordering for friends?"}
            </Text>
            {friends.length > 0 && (
              <Pressable onPress={() => people.clear()}>
                <Text style={{ color: T.muted, fontWeight: "700" }}>Turn off</Text>
              </Pressable>
            )}
          </View>
          <Text style={{ color: T.muted }}>
            {friends.length > 0
              ? "Tap a name under each item to say whose it is. Bags are labelled with these names."
              : "Add their names, then tap a name under each item. The delivery fee does not change."}
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {friends.map((friend) => (
              <Pressable
                key={friend.name}
                onPress={() => people.remove(friend.name)}
                style={{
                  flexDirection: "row",
                  gap: 6,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontWeight: "700", color: T.ink }}>{friend.name}</Text>
                <Text style={{ color: T.muted }}>✕</Text>
              </Pressable>
            ))}

            <TextInput
              value={adding}
              onChangeText={setAdding}
              placeholder="Add a name"
              onSubmitEditing={() => {
                void people.add(adding);
                setAdding("");
              }}
              style={{
                borderWidth: 1,
                borderColor: T.line,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 6,
                minWidth: 120,
                color: T.ink,
              }}
            />
            <Pressable
              onPress={() => {
                void people.add(adding);
                setAdding("");
              }}
              style={{
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 7,
                backgroundColor: adding.trim() === "" ? "rgba(20,17,15,0.08)" : T.ink,
              }}
            >
              <Text style={{ color: adding.trim() === "" ? T.muted : T.paper, fontWeight: "800" }}>
                Add
              </Text>
            </Pressable>
          </View>
        </View>

        {blocks.map((block) => (
          <View key={block.person === "" ? "me" : block.person} style={{ gap: 10 }}>
            {friends.length > 0 && (
              <Text
                style={{
                  fontWeight: "800",
                  fontSize: 13,
                  letterSpacing: 0.6,
                  color: T.muted,
                  textTransform: "uppercase",
                  marginTop: 6,
                }}
              >
                {block.person === "" ? "You" : block.person}
              </Text>
            )}
            {block.lines.map((line) => (
              <View key={line.key} style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14 }}>
                {/* The same as the website: the dish in the cart is a way back to
                    the dish itself, for a second look or a second one. */}
                <Pressable
                  onPress={() => {
                    const place = placeOf(line);
                    if (place) router.push(`/r/${place.restaurant.id}?item=${line.itemId}`);
                  }}
                  disabled={placeOf(line) === null}
                  accessibilityRole="link"
                  accessibilityLabel={`${line.name}, open on the ${line.restaurant} menu`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: T.ink }}>{line.name}</Text>
                    <Text style={{ color: T.muted, marginTop: 2 }}>
                      {line.restaurant}
                      {line.choices.length > 0 ? ` · ${line.choices.join(", ")}` : ""}
                    </Text>
                  </View>
                  {placeOf(line) !== null && (
                    <Ionicons name="chevron-forward" size={18} color={T.muted} />
                  )}
                </Pressable>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 12 }}>
                  <Text style={{ fontWeight: "800", flex: 1, color: T.ink }}>
                    {naira(line.unitPrice * line.qty)}
                  </Text>
                  <Pressable onPress={() => cart.setQty(line.key, line.qty - 1)} style={round()}>
                    <Text style={{ fontSize: 18 }}>−</Text>
                  </Pressable>
                  <Text style={{ fontWeight: "800", minWidth: 20, textAlign: "center" }}>{line.qty}</Text>
                  <Pressable onPress={() => cart.setQty(line.key, line.qty + 1)} style={round()}>
                    <Text style={{ fontSize: 18 }}>+</Text>
                  </Pressable>
                </View>

                {friends.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    <Text style={{ color: T.muted, fontWeight: "700", alignSelf: "center" }}>
                      Whose?
                    </Text>
                    {["", ...friends.map((friend) => friend.name)].map((name) => {
                      const on = line.forName === name;
                      return (
                        <Pressable
                          key={name === "" ? "me" : name}
                          onPress={() => cart.setForName(line.key, name)}
                          style={{
                            borderRadius: 999,
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            backgroundColor: on ? T.brand : "rgba(20,17,15,0.06)",
                          }}
                        >
                          <Text style={{ color: on ? T.paper : T.ink, fontWeight: "700", fontSize: 13 }}>
                            {name === "" ? "Me" : name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 6 }}>
          <Row label="Food" value={naira(food)} />
          <Row
            label={`Delivery (${items} item${items === 1 ? "" : "s"})`}
            value={fee === null ? "at checkout" : naira(fee)}
          />
          <View style={{ height: 1, backgroundColor: T.line, marginVertical: 4 }} />
          <Row label="Total" value={naira(food + (fee ?? 0))} strong />
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.push("/checkout")}
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 24,
          backgroundColor: T.brand,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: T.paper, fontWeight: "800", fontSize: 16 }}>Checkout</Text>
      </Pressable>
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

function round() {
  return {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: "center",
    justifyContent: "center",
  } as const;
}

/** Imported lazily to keep this file readable; the rule lives in lib/api. */
function feeFrom(items: number, bands: { maxItems: number | null; fee: number }[], flash: number | null) {
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 4000 }];
  const band =
    ladder.find((step) => step.maxItems !== null && items <= step.maxItems) ?? ladder[ladder.length - 1];
  return flash === null ? band.fee : Math.max(0, flash + (band.fee - ladder[0].fee));
}
