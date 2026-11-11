import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import ItemSheet from "@/components/ItemSheet";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, lagosToday, naira, nextArrival, type Item, type Place } from "@/lib/api";
import { cart, cartTotal, countItems, useStored, type Line } from "@/lib/store";
import Thumb from "@/components/Thumb";
import { F, T } from "@/lib/theme";
import { useShop } from "@/lib/use-shop";
import { AddButton, Display, FloatingBar, Stripes, Ticket } from "@/components/ui";
import Deals, { type Deal } from "@/components/Deals";
import DeliveryPill from "@/components/DeliveryPill";
import { useShopDays } from "@/lib/shop-days";

/** One restaurant: its menu, and a sheet for the questions a meal asks. */
export default function Restaurant() {
  // `item` arrives when somebody tapped a search result, so the sheet for
  // that dish opens on top of its own menu rather than making them find it.
  // `category` arrives from a notification about a restaurant's deals, so
  // tapping "new deal at Domino's" opens the deals rather than the whole menu.
  // `line` arrives when the dish was tapped in the cart: that is somebody
  // going back to the thing they already chose, so the sheet opens holding
  // their answers rather than blank, and saving replaces it.
  const { id, item: wanted, category, line: editingKey } = useLocalSearchParams<{
    id: string;
    item?: string;
    category?: string;
    line?: string;
  }>();
  const navigation = useNavigation();
  const router = useRouter();

  const [place, setPlace] = useState<Place | null>(null);
  // Whether the menu has been looked in yet. Without it there is no telling
  // "still arriving" from "asked for, and not there", and a link carrying a
  // counter this app has never heard of spun a wheel for ever.
  const [looked, setLooked] = useState(false);
  // What is on at this kitchen, worked out by the shop rather than guessed
  // at here, so the app and the website never disagree about a price.
  const [offer, setOffer] = useState<{ line: string; deals: Deal[] } | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const [query, setQuery] = useState("");
  /** Which category is being looked at. Empty means the whole menu. */
  const [tab, setTab] = useState(category ?? "");
  const [lines] = useStored(cart.read, []);
  const days = useShopDays(useMemo(() => (id ? [String(id)] : []), [id]));

  useEffect(() => {
    void api
      .shop()
      .then((shop) => {
        const found = shop.menu.find((one) => one.restaurant.id === id) ?? null;
        setPlace(found);
        setLooked(true);
        const here = shop.offers?.[id];
        setOffer(here ? { line: here.line, deals: here.deals } : null);
        if (found) {
          navigation.setOptions({ title: found.restaurant.name });
          const asked = wanted ? found.items.find((one) => one.id === wanted) : null;
          if (asked && asked.available) setOpen(asked);
        }
      })
      .catch(() => {
        setPlace(null);
        setLooked(true);
      });
  }, [id, wanted, navigation]);

  const items = countItems(lines);

  /** The menu, narrowed by whatever has been typed. One letter narrows
   *  nothing worth narrowing, so it waits for two. */
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = place?.items ?? [];
    if (needle.length < 2) return all;
    return all.filter(
      (one) =>
        one.name.toLowerCase().includes(needle) ||
        one.description.toLowerCase().includes(needle)
    );
  }, [place, query]);

  /** The menu under its own headings, in the order admin arranged them.
   *  A hundred and forty dishes in one unbroken list is not a menu. */
  /*
   * The two facts the board heads this screen with: where the kitchen is,
   * and when the next run leaves. Both come off the shop the phone already
   * has, so neither costs a request.
   *
   * Sangotedo unless the shop says otherwise, which is what every kitchen
   * was before there were areas.
   */
  const shop = useShop();
  const where = useMemo(() => {
    const id = shop?.areaOf?.[String(place?.restaurant.id ?? "")] ?? "";
    const named = (shop?.areas ?? []).find((one) => one.id === id)?.name ?? "";
    return named || "Sangotedo";
  }, [shop, place]);
  const arriving = useMemo(() => {
    const runs = (shop?.runs ?? []).filter((one) => !one.closed && !one.full);
    return nextArrival(runs, shop?.sameDay?.slots ?? [], lagosToday())?.said ?? "";
  }, [shop]);

  const sections = useMemo(() => {
    if (!place) return [];
    const only = place.categories.filter((category) => tab === "" || category.id === tab);
    const named = only
      .map((category) => ({
        name: category.name,
        items: shown.filter((one) => one.categoryId === category.id),
      }))
      .filter((section) => section.items.length > 0);

    if (tab !== "") return named;

    const known = new Set(place.categories.map((category) => category.id));
    const rest = shown.filter((one) => one.categoryId === null || !known.has(one.categoryId));
    return rest.length > 0 ? [...named, { name: "More", items: rest }] : named;
  }, [place, shown, tab]);

  if (!place) {
    if (!looked) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;
    // Looked, and it is not there: a counter switched off since the link was
    // made, or a link carrying a name this app cannot turn into a counter.
    // Either way there is a way out of here rather than a wheel.
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Display size={22}>
          That counter is not on
        </Display>
        <Text style={{ color: T.muted, textAlign: "center", marginTop: 6 }}>
          It may have closed for the day, or the link is an old one.
        </Text>
        <Pressable
          onPress={() => router.replace("/products" as never)}
          style={{
            marginTop: 16,
            backgroundColor: T.brand,
            borderRadius: 999,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: T.paper, fontFamily: F.bodyBold }}>See the whole menu</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View
          style={{
            position: "relative",
            overflow: "hidden",
            backgroundColor: T.ink,
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 20,
            gap: 10,
          }}
        >
          <Stripes style={{ right: -10, width: "34%", opacity: 0.85 }} />
          <Display size={72} colour={T.shell}>
            {place.restaurant.name}
          </Display>
          <DeliveryPill day={days[String(id)]} />

          {/* Where it is and when it next goes, as the board draws them:
              two outlined pills on the Ink, before the promise about
              mixing kitchens. Somebody deciding whether to order from here
              is asking both of these questions. */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {where !== "" && <HeroChip icon="location-outline">{where}</HeroChip>}
            {arriving !== "" && (
              <HeroChip icon="time-outline">Next run {arriving}</HeroChip>
            )}
          </View>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: T.volt,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: T.ink }}>
              Mix with any other kitchen, same fee
            </Text>
          </View>
        </View>

      <View style={{ padding: 16, gap: 10 }}>
        {offer && <Deals line={offer.line} deals={offer.deals} />}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${place.restaurant.name}`}
          placeholderTextColor={T.muted}
          returnKeyType="search"
          autoCorrect={false}
          style={{
            backgroundColor: T.paper,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: 999,
            paddingHorizontal: 18,
            minHeight: 50,
            fontSize: 16,
            fontFamily: F.body,
            color: T.ink,
          }}
        />

        {place.categories.length > 0 && query.trim().length < 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 18, paddingVertical: 2 }}
          >
            {[{ id: "", name: "All" }, ...place.categories].map((category) => {
              const on = tab === category.id;
              return (
                <Pressable
                  key={category.id === "" ? "all" : category.id}
                  onPress={() => setTab(category.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={{
                    minHeight: 46,
                    justifyContent: "center",
                    borderBottomWidth: 3,
                    borderBottomColor: on ? T.brand : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: T.ink,
                      fontFamily: on ? F.bodyBold : F.bodyMedium,
                      fontSize: 15,
                    }}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {shown.length === 0 && (
          <Text style={{ color: T.muted, marginTop: 8 }}>
            Nothing on this menu matches that.
          </Text>
        )}

        {sections.map((section) => (
          <View key={section.name} style={{ gap: 10, marginTop: 6 }}>
            <Ticket>{section.name}</Ticket>
            {section.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => item.available && setOpen(item)}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  backgroundColor: T.paper,
                  borderWidth: 2,
                  borderColor: T.ink,
                  borderRadius: 14,
                  overflow: "hidden",
                  opacity: item.available ? 1 : 0.5,
                }}
              >
                {/* Always something. A row with no picture beside a row with
                    one reads as a broken image rather than an item nobody
                    has photographed, and on the Sudu Shop shelf almost
                    nothing is photographed. */}
                <View style={{ width: 96 }}>
                  <Thumb src={item.imageUrl} name={item.name} radius={0} ratio={1} />
                </View>
                <View
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingRight: 12,
                    gap: 8,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ fontFamily: F.bodyBold, fontSize: 16, color: T.ink }}
                  >
                    {item.name}
                  </Text>
                  {!item.available && (
                    <Ticket>Sold out today</Ticket>
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Display size={24}>
                      {item.groups.some((g) => g.options.some((o) => o.priceDelta > 0)) ? "from " : ""}
                      {naira(item.price)}
                    </Display>
                    {item.available && (
                      <AddButton name={item.name} onPress={() => setOpen(item)} />
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      </ScrollView>

      {items > 0 && (
        <FloatingBar
          label={`${items} item${items === 1 ? "" : "s"}`}
          total={naira(cartTotal(lines))}
          action="View cart"
          bottom={24}
          onPress={() => router.push("/cart")}
        />
      )}

      <Modal
        visible={open !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(null)}
      >
        <View
          style={{ flex: 1, backgroundColor: "rgba(20,17,15,0.45)", justifyContent: "flex-end" }}
        >
          {/* The dimmed part is a way out too, the one people try first. */}
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setOpen(null)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          {open && (
            <ItemSheet
              item={open}
              restaurant={place.restaurant.name}
              editing={lines.find((one) => one.key === editingKey) ?? null}
              onDone={() => setOpen(null)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

/**
 * One outlined pill on the Ink hero.
 *
 * A hairline rather than the 2px rule the cards use: these sit on Ink, and
 * a two pixel Ink border on Ink is a border nobody can see. The board draws
 * them in the line between the kitchens' own colour and the dark.
 */
function HeroChip({
  icon,
  children,
}: {
  icon: "location-outline" | "time-outline";
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderWidth: 1,
        borderColor: "#4A423B",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Ionicons name={icon} size={14} color={T.onInk} />
      <Text style={{ fontFamily: F.body, fontSize: 13, color: T.onInk }}>{children}</Text>
    </View>
  );
}
