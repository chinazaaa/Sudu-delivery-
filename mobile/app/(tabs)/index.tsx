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
  otherWorthSaying,
  type Item,
  type OrderView,
  type Shop,
} from "@/lib/api";
import { mine } from "@/lib/store";
import CutOff from "@/components/CutOff";
import OfferNudge from "@/components/OfferNudge";
import Thumb from "@/components/Thumb";
import AskUs from "@/components/AskUs";
import { Ionicons } from "@expo/vector-icons";
import { F, T } from "@/lib/theme";
import { tileAt } from "@/lib/tiles";
import SeasonDecor from "@/components/SeasonDecor";
import { Display, Stripes, Ticket } from "@/components/ui";
import { KINDS, kindPath } from "@/lib/kinds";

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
  // The other counter, on the same terms: a line only while it is on and
  // there is a shop with something on it.
  const [pharmacy, setPharmacy] = useState("");
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

    void api
      .shelf({}, "pharmacy")
      .then((next) => {
        if (next.on) setPharmacy(`Order any day. It comes ${next.when}.`);
      })
      .catch(() => {
        /* Same again: a counter that is off is not a failure. */
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
  // And only where it is worth taking. A car an hour before the run is a
  // dearer trip for an hour that may not happen; the same two hours the
  // website and the chat use.
  const also = decided ? otherWorthSaying(decided, other) : null;
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
                backgroundColor: T.field,
                borderWidth: 2,
                borderColor: T.ink,
                borderRadius: T.radius,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                fontFamily: F.body,
                color: T.ink,
              }}
            />
            {query !== "" && (
              <Pressable onPress={() => setQuery("")} style={{ paddingHorizontal: 8 }}>
                <Text style={{ color: T.muted, fontFamily: F.bodyBold }}>Clear</Text>
              </Pressable>
            )}
          </View>
        )}

        {found !== null && (
          <View style={{ gap: 10 }}>
            <Display size={22}>
              {found.length} result{found.length === 1 ? "" : "s"}
            </Display>
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
                  borderWidth: 2,
                  borderColor: T.ink,
                  borderRadius: T.radius,
                  padding: 12,
                  opacity: item.available ? 1 : 0.5,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bodyBold, color: T.ink }}>{item.name}</Text>
                  <Text style={{ color: T.muted, marginTop: 2 }}>{restaurant.name}</Text>
                  <Display size={22} style={{ marginTop: 6 }}>
                    {item.groups.length > 0 ? "from " : ""}
                    {naira(item.price)}
                  </Display>
                  {!item.available && (
                    <Text style={{ color: T.muted, fontFamily: F.bodyBold, marginTop: 2 }}>
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
            <Text style={{ color: T.paper, fontFamily: F.bodyBold, flex: 1, lineHeight: 20 }}>
              {shop!.shop.ribbon}
            </Text>
            {(shop?.shop.ribbonTo ?? "") !== "" && (
              <Text style={{ color: T.brand, fontFamily: F.bodyBold }}>See</Text>
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
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: F.bodyBold }}>
              YOUR ORDER {latest.ref}
            </Text>
            <Text style={{ color: T.paper, fontSize: 17, fontFamily: F.bodyBold }}>
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
              <Ticket colour={T.volt}>Next delivery to PAU</Ticket>
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
                    ? `In a hurry? We can be there ${also.said}, for more.`
                    : `Rather pay less? We can be there ${also.said} for less.`}
                </Text>
              )}
            </View>
            <Text style={{ fontFamily: F.bodyBold, color: T.volt }}>Browse</Text>
          </Pressable>
        )}

        {error !== "" && (
          <View style={[card(), { backgroundColor: "#fff4ed" }]}>
            <Text style={{ color: T.brandDark, fontFamily: F.bodyBold }}>{error}</Text>
            <Text style={{ color: T.muted, marginTop: 4 }}>Pull down to try again.</Text>
          </View>
        )}

        {!shop && !error && <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />}



        {/*
          What people come looking for, as a row that scrolls sideways.

          The board puts this between the run and the kitchens, and the app
          had nothing in its place: somebody who wants chicken had to know
          which of thirteen kitchens sells it. The words are the shop's own
          kinds, the same nine the website offers and in the same order.
          Counting the menu's own categories read like the better idea and
          was not: the categories are a filing decision made per counter, so
          the row filled with Drinks, Protein and Bread, which is a stock
          list rather than an answer to what do you fancy, and the two
          things people open the app for and cannot find by name, pizza and
          ice cream, were missing from it.
        */}
        {found === null && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {KINDS.map((kind) => (
              <Pressable
                key={kind.label}
                onPress={() => router.push(kindPath(kind) as never)}
                style={{
                  minHeight: 40,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: T.ink,
                }}
              >
                <Text style={{ fontSize: 16 }}>{kind.emoji}</Text>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: T.ink }}>
                  {kind.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

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
              <Pressable onPress={() => router.push("/kitchens" as never)}>
                <Text style={{ fontFamily: F.bodySemi, color: T.ink }}>
                  See all {shop!.menu.length}
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {/* The first eight, which is four rows. The board shows a
                  handful here and puts the rest behind "See all", because a
                  front page thirteen tiles tall is one nobody scrolls past
                  to the boxes underneath. */}
              {shop!.menu.slice(0, 8).map((place, at) => {
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

        {/*
          Boxes, as the board draws them: a row that scrolls sideways.

          They were full width rows with the word "See" on the right, under a
          black card counting the whole shop. That shape is not on the board
          at all, and the word on the end of each row was being cut off by
          the edge of the card it sat in.

          The first is Tomato and the rest are Ink, so the row has one thing
          leading it rather than four cards of equal weight. The price is the
          only other thing on a card, in Volt on the dark ones, because a box
          is bought on the price and the name.
        */}
        {shelves.length > 0 && (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <Display size={30}>Boxes</Display>
              <Ticket>Delivery included</Ticket>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {shelves.map((one, at) => {
                // The first leads the row, so it is the loud one.
                const lead = at === 0;
                return (
                  <Pressable
                    key={one.slug}
                    onPress={() => router.push(`/occasions/${one.slug}` as never)}
                    style={{
                      width: 170,
                      minHeight: 150,
                      borderRadius: 16,
                      padding: 14,
                      justifyContent: "space-between",
                      backgroundColor: lead ? T.brand : T.ink,
                    }}
                  >
                    <Display size={26} colour={lead ? T.paper : T.shell}>
                      {one.name}
                    </Display>
                    <Text
                      style={{
                        fontFamily: F.bodySemi,
                        fontSize: 14,
                        color: lead ? T.paper : T.volt,
                      }}
                    >
                      {one.from === null
                        ? "One price, delivery in it"
                        : `from ${naira(one.from)}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/*
          The four other ways in, two across.

          Small pills with an icon rather than a row each: they are the ways
          into the shop that are not food, and on the board they take one
          screen's worth of corner between them rather than four full width
          cards. A door admin has switched off is not drawn, which is why
          each one asks before it appears.
        */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Door
            label="Group order"
            glyph="group"
            onPress={() => router.push("/group" as never)}
          />
          {parcels !== "" && (
            <Door
              label="Parcels"
              glyph="parcel"
              onPress={() => router.push("/parcel" as never)}
            />
          )}
          {skincare !== "" && (
            <Door
              label="Skincare"
              glyph="skincare"
              onPress={() => router.push("/skincare" as never)}
            />
          )}
          {pharmacy !== "" && (
            <Door
              label="Pharmacy"
              glyph="pharmacy"
              onPress={() => router.push("/pharmacy" as never)}
            />
          )}
          {/* Named rather than called "Services" or "More", because the
              whole point of this door is that somebody who installed the
              app to order dinner does not know the same shop will collect
              their laundry. A door labelled "More" teaches them nothing
              and they never open it. */}
          {(shop?.services ?? []).length > 0 && (
            <Door
              label="Laundry, printing & more"
              glyph="services"
              onPress={() => router.push("/services" as never)}
            />
          )}
          <Door
            label="Anything else"
            glyph="ask"
            onPress={() => router.push("/ask" as never)}
          />
        </View>
      </ScrollView>

      {/* The pumpkins, when the shop is dressed for them.
          Over the page and deaf to the thumb: a decoration that can swallow
          a tap on the order button is worse than no decoration. Under the
          nudge below it, which is a thing somebody has to be able to press. */}
      <SeasonDecor season={shop?.shop.season} />

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
    borderWidth: 2,
    borderColor: T.ink,
    borderRadius: T.radius,
    padding: 14,
  } as const;
}

/** One door on the front page. They are all the same card. */
/*
 * A door into one part of the shop.
 *
 * Borderless white, which is what every card in the app looked like before
 * the redesign. The hero and the kitchens above were moved over and these
 * were not, so the home screen read as half one design and half the other
 * from the shelves down. The 2px Ink rule is what the rest of the app
 * draws a card with.
 */
const door = () => ({
  backgroundColor: T.paper,
  borderWidth: 2,
  borderColor: T.ink,
  borderRadius: T.radius,
  padding: 14,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
});

/**
 * One of the four small ways into the shop that are not food.
 *
 * The board draws them two across at fifty-six pixels, an icon in Tomato
 * and the word beside it, rather than a full width row each with the action
 * written on the far right. Four of those took a screen and a half to say
 * what these say in two rows.
 */
function Door({
  label,
  glyph,
  onPress,
}: {
  label: string;
  glyph: "group" | "parcel" | "skincare" | "pharmacy" | "services" | "ask";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 56,
        backgroundColor: T.paper,
        borderWidth: 2,
        borderColor: T.ink,
        borderRadius: 14,
        paddingHorizontal: 12,
      }}
    >
      <Glyph kind={glyph} />
      <Text style={{ fontFamily: F.bodyBold, color: T.ink, flexShrink: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The line drawing beside a door, in Tomato.
 *
 * Ionicons, which the app already carries for the checkout, rather than the
 * board's own inline SVG: drawing those would mean react-native-svg, and a
 * native module cannot arrive in an over-the-air update. The shapes are the
 * same four things the board names.
 */
function Glyph({
  kind,
}: {
  kind: "group" | "parcel" | "skincare" | "pharmacy" | "services" | "ask";
}) {
  const name =
    kind === "group"
      ? "people-outline"
      : kind === "parcel"
        ? "cube-outline"
        : kind === "skincare"
          ? "flask-outline"
          : kind === "pharmacy"
            ? "medkit-outline"
            : kind === "services"
              ? "construct-outline"
              : "help-circle-outline";
  return <Ionicons name={name} size={22} color={T.brand} />;
}
