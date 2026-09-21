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
import {
  api,
  lagosToday,
  naira,
  nextArrival,
  type Item,
  type OrderView,
  type Shop,
} from "@/lib/api";
import { mine } from "@/lib/store";
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
  // Only a pull sets this. The first load has its own spinner in the middle
  // of the page, and turning the pull-to-refresh one on as well put two
  // spinners on the screen for the same wait.
  const [pulling, setPulling] = useState(false);
  const [latest, setLatest] = useState<OrderView | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async (fresh = false) => {
    if (fresh) setPulling(true);
    try {
      setShop(await api.shop(fresh));
      setError("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not reach the shop.");
    } finally {
      if (fresh) setPulling(false);
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

  // When something ordered right now would land, by the one rule every way
  // of ordering uses: a run going today while it is taking orders, a car of
  // its own today, a run tomorrow, then tomorrow's first window.
  // One car a week, on a Saturday. Empty when the shelf is switched off,
  // and then the app does not mention it at all.
  const [skincare, setSkincare] = useState("");
  // What is packed and ready, said as the thing itself rather than as a
  // category. The home screen is the only signpost this app has.
  const [occasions, setOccasions] = useState("");

  useEffect(() => {
    void api
      .shelf()
      .then((next) => {
        if (next.on) setSkincare(`Order any day. It comes ${next.when}.`);
      })
      .catch(() => {
        /* The shelf is a door, not the shop. A closed one is no error. */
      });

    // Named by whatever is nearest, because "Match day, Saturday" is a
    // reason to tap and "Occasions" is a filing cabinet.
    void api
      .occasions()
      .then(({ occasions: some }) => {
        if (some.length === 0) return;
        setOccasions(
          some.length === 1
            ? `${some[0].name}. One price, delivery in it.`
            : `${some
                .slice(0, 2)
                .map((one) => one.name)
                .join(", ")} and more. One price, delivery in it.`
        );
      })
      .catch(() => {
        /* Also a door. */
      });
  }, []);

  const arriving =
    nextArrival(
      (shop?.runs ?? []).filter((one) => !one.closed && !one.full),
      shop?.sameDay?.slots ?? [],
      lagosToday()
    )?.said ?? "";
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={() => load(true)} tintColor={T.brand} />
        }
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

        {/* One sentence, and nothing else. Which run or which car it is has
            already been decided, by the same rule the checkout uses, so all
            that is left to say is when the food turns up. The old strip said
            "afternoon batch closes 2:45pm, in 1h 01m": four facts about how
            the shop works and none about dinner. */}
        {arriving !== "" && (
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={{
              borderWidth: 2,
              borderColor: "rgba(255,90,31,0.3)",
              backgroundColor: T.tint,
              borderRadius: T.radius,
              padding: 14,
            }}
          >
            <Text style={{ fontWeight: "800", fontSize: 17, color: T.ink }}>
              Order now, get it {arriving}
            </Text>
          </Pressable>
        )}

        {occasions !== "" && (
          <Pressable
            onPress={() => router.push("/occasions" as never)}
            style={{
              backgroundColor: T.paper,
              borderRadius: T.radius,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: T.ink }}>Ordering for something?</Text>
              <Text style={{ color: T.muted, marginTop: 2 }}>{occasions}</Text>
            </View>
            <Text style={{ color: T.brand, fontWeight: "800" }}>See</Text>
          </Pressable>
        )}

        {/* The other half of the shop. It is not a restaurant and it does not
            come today, so it is a door rather than a card in the row. */}
        {skincare !== "" && (
          <Pressable
            onPress={() => router.push("/skincare")}
            style={{
              backgroundColor: T.paper,
              borderRadius: T.radius,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: T.ink }}>Skincare</Text>
              <Text style={{ color: T.muted, marginTop: 2 }}>{skincare}</Text>
            </View>
            <Text style={{ color: T.brand, fontWeight: "800" }}>Shop</Text>
          </Pressable>
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

                {/* What delivery costs here when a promotion is pricing it.
                    The number is the reason to tap, so it goes on the
                    outside rather than behind the word "offer". */}
                {shop?.offers?.[place.restaurant.id]?.badge ? (
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: T.brand + "55",
                      backgroundColor: T.tint,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ color: T.brandDark, fontWeight: "800", fontSize: 12 }}>
                      {shop.offers[place.restaurant.id].badge}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </Link>
        ))}
      </ScrollView>

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

export function card() {
  return {
    backgroundColor: T.paper,
    borderRadius: T.radius,
    padding: 14,
  } as const;
}
