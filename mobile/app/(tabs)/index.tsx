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
  // Every shelf by its own name, with its own price. A door saying
  // "Ordering for something?" is a filing cabinet, and nobody opens a filing
  // cabinet to find out the shop does care packages.
  const [shelves, setShelves] = useState<
    { slug: string; name: string; from: number | null; kind: string; image: string }[]
  >([]);
  // Empty when parcels are off, and then the page does not mention them.
  const [parcels, setParcels] = useState("");

  useEffect(() => {
    void api
      .shelf()
      .then((next) => {
        if (next.on) setSkincare(`Order any day. It comes ${next.when}.`);
      })
      .catch(() => {
        /* The shelf is a door, not the shop. A closed one is no error. */
      });

    // Named by where it goes rather than called "Parcels": nobody is looking
    // for a parcel service, they have a dress sitting in a shop in Lekki.
    void api
      .parcels()
      .then((setup) => {
        if (!setup.on || setup.routes.length === 0) return;
        // The places, not the first two routes. Listing routes read
        // "Sangotedo to PAU, PAU to Sangotedo and more", which names one
        // town twice and makes a service covering Lekki to Ikorodu look
        // like a Sangotedo errand. A route is named for where it is not
        // PAU, so both directions of one road collapse into one place.
        const places: string[] = [];
        for (const route of setup.routes) {
          const place = route.label
            .replace(/\s*to\s+PAU\s*$/i, "")
            .replace(/^\s*PAU\s+to\s*/i, "")
            .trim();
          if (place !== "" && !places.includes(place)) places.push(place);
        }
        const named =
          places.length > 1
            ? `${places.slice(0, -1).join(", ")} and ${places[places.length - 1]}`
            : places[0] ?? "";
        setParcels(`${named}, to PAU and back. Its own trip, on a day we agree.`);
      })
      .catch(() => {
        /* Parcels are an extra. The menu is the page. */
      });

    void api
      .occasions()
      .then(({ occasions: some }) => {
        setShelves(
          some.slice(0, 8).map((one) => ({
            slug: one.slug,
            name: one.name,
            from: one.from,
            kind: one.kind ?? "collection",
            image: one.image ?? "",
          }))
        );
      })
      .catch(() => {
        /* Also a door. */
      });
  }, []);

  const runs = (shop?.runs ?? []).filter((one) => !one.closed && !one.full);
  const slots = shop?.sameDay?.slots ?? [];
  const decided = nextArrival(runs, slots, lagosToday());
  const arriving = decided?.said ?? "";

  // The other way, for whoever the headline does not suit. Somebody who
  // wants dinner tonight and somebody who wants it cheap both open this,
  // and one sentence naming a run five days out sends the first of them
  // away. Asked of the same rule twice, once with only runs and once with
  // only cars, so the wording cannot drift from it.
  const other = decided
    ? decided.onARun
      ? nextArrival([], slots, lagosToday())
      : nextArrival(runs, [], lagosToday())
    : null;
  const also = other && other.said !== decided?.said ? other : null;
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
            /* It used to go to the cart, which is where somebody goes when
               they have already chosen. This is the top of the page: they
               have not. */
            onPress={() => router.push("/products" as never)}
            style={{
              borderWidth: 2,
              borderColor: "rgba(255,90,31,0.3)",
              backgroundColor: T.tint,
              borderRadius: T.radius,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", fontSize: 17, color: T.ink }}>
                Order now, get it {arriving}
              </Text>
              {also && (
                <Text style={{ color: T.ink, opacity: 0.75, marginTop: 4 }}>
                  {decided?.onARun
                    ? `In a hurry? A car of its own can be there ${also.said}, for more.`
                    : `Rather pay less? A run gets it to you ${also.said}.`}
                </Text>
              )}
            </View>
            <Text style={{ color: T.brand, fontWeight: "800" }}>Browse</Text>
          </Pressable>
        )}

        {/* Nobody is looking for a parcel service. They have a dress sitting
            in a shop in Lekki, so the line says both ends of the trip.

            The line was being read from the shop and then never shown: the
            door was built and left off the page. */}
        {parcels !== "" && (
          <Pressable
            onPress={() => router.push("/parcel" as never)}
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
              <Text style={{ fontWeight: "800", color: T.ink }}>Send a parcel</Text>
              <Text style={{ color: T.muted, marginTop: 2 }}>{parcels}</Text>
            </View>
            <Text style={{ color: T.brand, fontWeight: "800" }}>Send</Text>
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

        {/* One card each, by name, with the price on it. "Care package,
            from ₦23,400" is a reason to tap. */}
        {shelves.map((one) => (
          <Pressable
            key={one.slug}
            onPress={() => router.push(`/occasions/${one.slug}` as never)}
            style={{
              backgroundColor: T.paper,
              borderRadius: T.radius,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            {one.image !== "" && (
              <Image
                source={{ uri: one.image }}
                style={{ width: 64, height: 64, borderRadius: 12 }}
                // Cover, because these are photographs of food now. Contain
                // would letterbox a wide shot of a pizza inside a square and
                // leave two grey bars where the appetite should be.
                resizeMode="cover"
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: T.ink }}>{one.name}</Text>
              <Text style={{ color: T.muted, marginTop: 2 }}>
                {one.from === null
                  ? "One price, delivery in it"
                  : `From ${naira(one.from)}, delivery in it`}
              </Text>
            </View>
            <Text style={{ color: T.brand, fontWeight: "800" }}>See</Text>
          </Pressable>
        ))}

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
