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
  keptShop,
  lagosToday,
  naira,
  nextArrival,
  type Item,
  type OrderView,
  type Shop,
} from "@/lib/api";
import { mine } from "@/lib/store";
import CutOff from "@/components/CutOff";
import OfferNudge from "@/components/OfferNudge";
import Thumb from "@/components/Thumb";
import AskUs from "@/components/AskUs";
import { F, T } from "@/lib/theme";
import { tileAt } from "@/lib/tiles";
import { Display, Stripes, Ticket } from "@/components/ui";

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
  /** Whether the shop itself has answered, as opposed to the copy kept on
   *  the phone having been drawn while we wait. */
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState("");
  // Only a pull sets this. The first load has its own spinner in the middle
  // of the page, and turning the pull-to-refresh one on as well put two
  // spinners on the screen for the same wait.
  const [pulling, setPulling] = useState(false);
  const [latest, setLatest] = useState<OrderView | null>(null);
  const [query, setQuery] = useState("");

  // What the phone saw last time, drawn at once so the page arrives whole.
  // The real answer replaces it a second or two later, and until then the
  // banner says what it said last time rather than nothing: the doors used
  // to appear first and the banner drop in afterwards, which reads as the
  // page being assembled in front of you.
  useEffect(() => {
    let alive = true;
    void keptShop().then((kept) => {
      // Only if the real one has not already beaten it here.
      if (alive && kept) setShop((now) => now ?? kept);
    });
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async (fresh = false) => {
    if (fresh) setPulling(true);
    try {
      setShop(await api.shop(fresh));
      setError("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not reach the shop.");
    } finally {
      if (fresh) setPulling(false);
      // Whatever came of it, the shop has now been asked. Until then the
      // page cannot honestly say there is no run going, only that it does
      // not know yet, and the two look very different on a phone.
      setSettled(true);
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

  // The order of the doors, as the website has it. An older server sends
  // none, and then the app keeps the order both of them ship with.
  const doors = shop?.homeOrder ?? ["food", "shelves", "parcel", "skincare"];

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
        {/* First, and above every banner.

            It sat under the ribbon, the last order and the order card, so on
            a phone it was most of a screen down and tapping it put the
            keyboard straight over it: you could not see what you were
            typing. Those three arrive at their own speed as well, so the box
            moved under your thumb as you reached for it. */}
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
              <View style={{ gap: 10 }}>
                <Text style={{ color: T.muted }}>
                  Nothing matches that. Try a shorter word, like chicken or
                  pizza.
                </Text>
                <AskUs q={query} />
              </View>
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
                {/* Always something. A row with no picture beside a row with
                    one reads as a broken image rather than an item nobody
                    has photographed, and on the Sudu Shop shelf almost
                    nothing is photographed. */}
                <View style={{ width: 92 }}>
                  <Thumb src={item.imageUrl} name={item.name} radius={12} ratio={1} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Whatever is true today, written in admin, the same line the
            website carries along its top. The app had no way to announce
            anything at all: a new shelf opened and the only people who knew
            were the ones who happened to scroll past it. Above the order
            card, because an announcement below the fold is a leaflet in a
            drawer. */}
        {(shop?.shop.ribbon ?? "") !== "" && (
          <Pressable
            onPress={() => {
              const to = shop?.shop.ribbonTo ?? "";
              if (to !== "") router.push(to as never);
            }}
            // Not pressable when there is nowhere to go, so a claim like
            // "since 2018" does not look like a door that is broken.
            disabled={(shop?.shop.ribbonTo ?? "") === ""}
            style={{
              backgroundColor: T.ink,
              borderRadius: T.radius,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text style={{ color: T.paper, fontWeight: "700", flex: 1, lineHeight: 20 }}>
              {shop!.shop.ribbon}
            </Text>
            {(shop?.shop.ribbonTo ?? "") !== "" && (
              <Text style={{ color: T.brand, fontWeight: "800" }}>See</Text>
            )}
          </Pressable>
        )}

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
        {/* Drawn as soon as there is a menu to draw it from, even while the
            arrival line is still unknown.

            The copy kept on the phone is up to a day old, and a run whose cut
            off has passed is stripped out of it, so a cached menu routinely
            has no live run and this card was simply absent. Then the real
            menu landed and it appeared, shoving everything below it down the
            screen: the banner that turns up after the page has finished
            loading. The card holds its place and fills itself in. */}
        {(arriving !== "" || (shop !== null && !settled)) && (
          <Pressable
            /* It used to go to the cart, which is where somebody goes when
               they have already chosen. This is the top of the page: they
               have not. */
            onPress={() => router.push("/products" as never)}
            style={{
              position: "relative",
              overflow: "hidden",
              backgroundColor: T.ink,
              borderRadius: 18,
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* The speed stripes down the right, the way the board draws
                this ticket. */}
            <Stripes style={{ right: -10, width: "34%", opacity: 0.8 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <Ticket colour={T.volt}>Next run to PAU</Ticket>
              <Display size={34} colour={T.shell}>
                {arriving !== "" ? arriving : "Working out when…"}
              </Display>
              {/* Holds the line the arrival sentence will take, so filling it
                  in does not move the page under somebody's thumb. */}

              {/* The deadline, between the promise and the alternative,
                  exactly where the website puts it. Only a run has a queue
                  to make: a car of its own is three hours from whenever it
                  is asked for, so there is nothing to be late for. */}
              {decided?.onARun && (
                <CutOff
                  tone="light"
                  at={
                    (shop?.runs ?? []).find((one) => one.id === decided.runId)?.cutOffISO ?? ""
                  }
                />
              )}

              {also && (
                <Text style={{ color: T.onInk, marginTop: 2 }}>
                  {decided?.onARun
                    ? `In a hurry? A car of its own can be there ${also.said}, for more.`
                    : `Rather pay less? A run gets it to you ${also.said}.`}
                </Text>
              )}
            </View>
            <Text style={{ fontFamily: F.bodyBold, color: T.volt }}>Browse</Text>
          </Pressable>
        )}

        {error !== "" && (
          <View style={[card(), { backgroundColor: "#fff4ed" }]}>
            <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>
            <Text style={{ color: T.muted, marginTop: 4 }}>Pull down to try again.</Text>
          </View>
        )}

        {!shop && !error && <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />}



        {/* The kitchens, as the board's tiles: two to a row, the name as
            big as the tile allows, and our own colours rotating through
            them. Never the restaurant's: a tile in KFC's red with KFC's
            name on it is a shop claiming a relationship it does not have,
            and we are a courier rather than a franchise. */}
        {found === null && (shop?.menu.length ?? 0) > 0 && (
          <View style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <Display size={30}>Kitchens</Display>
              <Pressable onPress={() => router.push("/products" as never)}>
                <Text style={{ fontFamily: F.bodySemi, color: T.ink }}>
                  See all {shop!.menu.length}
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {shop!.menu.map((place, at) => {
                const tile = tileAt(at);
                const badge = shop?.offers?.[place.restaurant.id]?.badge ?? "";
                return (
                  <Link
                    key={place.restaurant.id}
                    href={`/r/${place.restaurant.id}`}
                    asChild
                  >
                    <Pressable
                      style={{
                        flexBasis: "48%",
                        flexGrow: 1,
                        minHeight: 86,
                        borderWidth: 2,
                        borderColor: T.ink,
                        borderRadius: 14,
                        backgroundColor: tile.bg,
                        padding: 12,
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <Display size={22} colour={tile.text}>
                        {place.restaurant.name}
                      </Display>
                      <Ticket colour={tile.text}>
                        {badge !== ""
                          ? badge
                          : `${place.items.length} thing${place.items.length === 1 ? "" : "s"}`}
                      </Ticket>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          </View>
        )}

        {/* The doors, under the food rather than over it.

            They were above the restaurants, so the first thing on a shop was
            four cards naming categories and the first photograph of anything
            to eat was a screen and a half down. Nobody opens a food app
            wanting a category. The website was fixed the same way and for
            the same reason, and the two should read alike. Under the search
            results too, where they are the answer to "not that, then"
            rather than something in the way.

            Their order is the one admin set on the website. The app used to
            hold its own opinion — food, then parcels, then skincare, then
            the shelves — so the two drifted the moment anybody moved a card.
            Both read the same line now, and a door switched off in admin is
            off in both. */}
        {doors.map((key) => {
          if (key === "food") {
            return (
              <Pressable
                key="food"
                onPress={() => router.push("/products" as never)}
                style={door()}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: T.ink }}>Food</Text>
                  <Text style={{ color: T.muted, marginTop: 2 }}>
                    {shop
                      ? `${shop.menu.length} restaurant${shop.menu.length === 1 ? "" : "s"} in one list`
                      : "Every restaurant in one list"}
                  </Text>
                </View>
                <Text style={{ color: T.brand, fontWeight: "800" }}>Browse</Text>
              </Pressable>
            );
          }

          // Nobody is looking for a parcel service. They have a dress sitting
          // in a shop in Lekki, so the line says every place it goes.
          if (key === "parcel") {
            if (parcels === "") return null;
            return (
              <Pressable
                key="parcel"
                onPress={() => router.push("/parcel" as never)}
                style={door()}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: T.ink }}>Send a parcel</Text>
                  <Text style={{ color: T.muted, marginTop: 2 }}>{parcels}</Text>
                </View>
                <Text style={{ color: T.brand, fontWeight: "800" }}>Send</Text>
              </Pressable>
            );
          }

          // The other half of the shop. It is not a restaurant and it does
          // not come today, so it is a door rather than a card in the row.
          if (key === "skincare") {
            if (skincare === "") return null;
            return (
              <Pressable key="skincare" onPress={() => router.push("/skincare")} style={door()}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: T.ink }}>Skincare</Text>
                  <Text style={{ color: T.muted, marginTop: 2 }}>{skincare}</Text>
                </View>
                <Text style={{ color: T.brand, fontWeight: "800" }}>Shop</Text>
              </Pressable>
            );
          }

          // One card each, by name, with the price on it. "Care package,
          // from N23,400" is a reason to tap.
          if (key === "shelves") {
            return shelves.map((one) => (
              <Pressable
                key={one.slug}
                onPress={() => router.push(`/occasions/${one.slug}` as never)}
                style={door()}
              >
                {one.image !== "" && (
                  <Image
                    source={{ uri: one.image }}
                    style={{ width: 64, height: 64, borderRadius: 12 }}
                    // Cover, because these are photographs of food. Contain
                    // would letterbox a wide shot of a pizza inside a square
                    // and leave two grey bars where the appetite should be.
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
            ));
          }

          // "custom" and "group" are doors on the website and tabs down the
          // bottom here, so the app does not draw them twice.
          return null;
        })}
      </ScrollView>

      {/* Over the page rather than in it: the page carries on underneath and
          one tap on the cross ends it. Outside the ScrollView so it stays
          put while somebody reads past it. */}
      <OfferNudge nudge={shop?.nudge ?? null} />
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

/** One door on the front page. They are all the same card. */
const door = () => ({
  backgroundColor: T.paper,
  borderRadius: T.radius,
  padding: 14,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
});
