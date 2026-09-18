import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, naira } from "@/lib/api";
import { cart, cartTotal, countItems, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/** What is in the bag, and what it will cost to bring it. */
export default function Cart() {
  const router = useRouter();
  const [lines] = useStored(cart.read, []);
  const [shop] = useStored(() => api.shop().catch(() => null), null);

  const items = countItems(lines);
  const food = cartTotal(lines);
  const run = shop?.runs[0] ?? null;
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
        {lines.map((line) => (
          <View key={line.key} style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14 }}>
            <Text style={{ fontWeight: "800", color: T.ink }}>{line.name}</Text>
            <Text style={{ color: T.muted, marginTop: 2 }}>
              {line.restaurant}
              {line.choices.length > 0 ? ` · ${line.choices.join(", ")}` : ""}
            </Text>
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
