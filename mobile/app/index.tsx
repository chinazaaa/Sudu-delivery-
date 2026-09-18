import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { api, naira, type OrderView, type Shop } from "@/lib/api";
import { cart, countItems, mine, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * The shop, and above it whatever is happening with the last order.
 *
 * Somebody who has ordered opens this app to find out where their food is,
 * not to browse. So that answer is the first thing on the screen, and the
 * menu carries on underneath it.
 */
export default function Home() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines] = useStored(cart.read, []);
  const [latest, setLatest] = useState<OrderView | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setShop(await api.shop());
      setError("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not reach the shop.");
    } finally {
      setBusy(false);
    }

    try {
      const ids = await mine.read();
      setLatest(ids[0] ? await api.order(ids[0]) : null);
    } catch {
      setLatest(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Coming back from checkout should show the new order straight away.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const run = shop?.runs[0] ?? null;
  const items = countItems(lines);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={T.brand} />}
      >
        {latest && (
          <Pressable
            onPress={() => router.push(`/order/${latest.id}`)}
            style={{
              backgroundColor: T.ink,
              borderRadius: T.radius,
              padding: 14,
              gap: 4,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700" }}>
              YOUR ORDER {latest.ref}
            </Text>
            <Text style={{ color: T.paper, fontSize: 17, fontWeight: "800" }}>
              {statusLine(latest)}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)" }}>
              {latest.run.label} · {latest.run.window}
            </Text>
          </Pressable>
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => router.push("/orders")}
            style={{
              flex: 1,
              backgroundColor: T.paper,
              borderRadius: T.radius,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800", color: T.ink }}>My orders</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/cart")}
            style={{
              flex: 1,
              backgroundColor: T.paper,
              borderRadius: T.radius,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800", color: T.ink }}>
              Cart{items > 0 ? ` · ${items}` : ""}
            </Text>
          </Pressable>
        </View>

        {run && (
          <View style={card()}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: T.ink }}>
              {run.label} closes {clock(run.cutOffISO)}
            </Text>
            <Text style={{ color: T.muted, marginTop: 2 }}>{run.deliveryWindow}</Text>
          </View>
        )}

        {error !== "" && (
          <View style={[card(), { backgroundColor: "#fff4ed" }]}>
            <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>
            <Text style={{ color: T.muted, marginTop: 4 }}>Pull down to try again.</Text>
          </View>
        )}

        {!shop && !error && <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />}

        {shop?.menu.map((place) => (
          <Link key={place.restaurant.id} href={`/r/${place.restaurant.id}`} asChild>
            <Pressable style={{ borderRadius: T.radius, overflow: "hidden", backgroundColor: T.paper }}>
              {place.restaurant.bannerUrl !== "" && (
                <Image
                  source={{ uri: place.restaurant.bannerUrl }}
                  style={{ width: "100%", height: 140 }}
                  resizeMode="cover"
                />
              )}
              <View style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                {place.restaurant.logoUrl !== "" && (
                  <Image
                    source={{ uri: place.restaurant.logoUrl }}
                    style={{ width: 44, height: 44, borderRadius: 12 }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", fontSize: 17, color: T.ink }}>
                    {place.restaurant.name}
                  </Text>
                  <Text style={{ color: T.muted }}>
                    {place.items.length} item{place.items.length === 1 ? "" : "s"} on the menu
                  </Text>
                </View>
              </View>
            </Pressable>
          </Link>
        ))}
      </ScrollView>

      {items > 0 && (
        <Pressable
          onPress={() => router.push("/cart")}
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
          <Text style={{ color: T.paper, fontWeight: "800", fontSize: 16 }}>
            View cart · {items} item{items === 1 ? "" : "s"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** What the black strip says, in the words the customer is waiting for. */
function statusLine(order: OrderView): string {
  if (order.status === "pending") return `Not paid yet · ${naira(order.total)}`;
  if (order.status === "refunded") return "Refunded";
  if (order.stage === "delivered") return "Delivered. Enjoy.";
  if (order.stage === "on_the_way") return "On the way to you";
  if (order.stage === "collected") return "Food collected, heading over";
  if (order.stage === "ordering") return "Paid. Waiting for the run to close";
  return "Paid. We are at the restaurants";
}

function clock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "soon";
  }
}

export function card() {
  return {
    backgroundColor: T.paper,
    borderRadius: T.radius,
    padding: 14,
  } as const;
}
