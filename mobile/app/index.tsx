import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { api, naira, type Item, type OrderView, type Shop } from "@/lib/api";
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
  const [query, setQuery] = useState("");

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

  /** Every dish on every menu that matches, the way the website searches.
   *  One letter matches too much to be worth showing, so it waits for two. */
  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2 || !shop) return null;
    return shop.menu.flatMap((place) =>
      place.items
        .filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle) ||
            place.restaurant.name.toLowerCase().includes(needle)
        )
        .map((item) => ({ item, restaurant: place.restaurant }))
    );
  }, [shop, query]);

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
          {/* On the home screen rather than behind a menu: deleting your own
              record has to be somewhere a person can actually find it. */}
          <Pressable
            onPress={() => router.push("/account")}
            accessibilityLabel="Your data and privacy"
            style={{
              backgroundColor: T.paper,
              borderRadius: T.radius,
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800", color: T.ink }}>You</Text>
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

        {shop && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search chicken, pizza, wings…"
              placeholderTextColor={T.muted}
              returnKeyType="search"
              autoCorrect={false}
              style={{
                flex: 1,
                backgroundColor: T.paper,
                borderRadius: T.radius,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: T.ink,
              }}
            />
            {query !== "" && (
              <Pressable onPress={() => setQuery("")} style={{ paddingHorizontal: 8 }}>
                <Text style={{ color: T.muted, fontWeight: "800" }}>Clear</Text>
              </Pressable>
            )}
          </View>
        )}

        {found !== null && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: T.ink }}>
              {found.length} result{found.length === 1 ? "" : "s"}
            </Text>
            {found.length === 0 && (
              <Text style={{ color: T.muted }}>
                Nothing matches that. Try a shorter word, like chicken or pizza.
              </Text>
            )}
            {found.map(({ item, restaurant }) => (
              <Pressable
                key={item.id}
                // Straight to the dish on its own menu, where the sheet asks
                // whatever the meal asks before anything joins the cart.
                onPress={() => router.push(`/r/${restaurant.id}?item=${item.id}`)}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  backgroundColor: T.paper,
                  borderRadius: T.radius,
                  padding: 12,
                  opacity: item.available ? 1 : 0.5,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: T.ink }}>{item.name}</Text>
                  <Text style={{ color: T.muted, marginTop: 2 }}>{restaurant.name}</Text>
                  <Text style={{ fontWeight: "800", marginTop: 6, color: T.ink }}>
                    {item.groups.length > 0 ? "from " : ""}
                    {naira(item.price)}
                  </Text>
                  {!item.available && (
                    <Text style={{ color: T.muted, fontWeight: "700", marginTop: 2 }}>
                      Sold out today
                    </Text>
                  )}
                </View>
                {item.imageUrl !== "" && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 92, height: 92, borderRadius: 12 }}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {found === null &&
          shop?.menu.map((place) => (
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
