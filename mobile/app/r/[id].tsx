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
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, naira, type Item, type Place } from "@/lib/api";
import { cart, cartTotal, countItems, useStored, type Line } from "@/lib/store";
import Thumb from "@/components/Thumb";
import { F, T } from "@/lib/theme";
import { AddButton, Display, FloatingBar, Stripes, Ticket } from "@/components/ui";
import Deals, { type Deal } from "@/components/Deals";

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
        <Text style={{ fontSize: 18, fontWeight: "800", color: T.ink }}>
          That counter is not on
        </Text>
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
          <Text style={{ color: T.paper, fontWeight: "800" }}>See the whole menu</Text>
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
          <Display size={60} colour={T.shell}>
            {place.restaurant.name}
          </Display>
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
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
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
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: T.ink,
                    paddingHorizontal: 16,
                    minHeight: 40,
                    justifyContent: "center",
                    backgroundColor: on ? T.ink : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: on ? T.shell : T.ink,
                      fontFamily: F.bodySemi,
                      fontSize: 14,
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
                      {item.groups.length > 0 ? "from " : ""}
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

/** The questions a meal asks, and nothing is added until they are answered. */
function ItemSheet({
  item,
  restaurant,
  editing,
  onDone,
}: {
  item: Item;
  restaurant: string;
  /** The cart line being changed, when this was opened from the cart. */
  editing: Line | null;
  onDone: () => void;
}) {
  // Opened from the cart, the sheet starts where they left it: the same
  // choices ticked and the same number. Starting blank made every visit back
  // to a meal a rebuild, and answering the questions again from scratch is
  // exactly what somebody checking their cart is not doing.
  const [picked, setPicked] = useState<Record<string, string[]>>(() => {
    if (!editing) return {};
    const start: Record<string, string[]> = {};
    for (const group of item.groups) {
      const theirs = group.options
        .filter((option) => editing.optionIds.includes(option.id))
        .map((option) => option.id);
      if (theirs.length > 0) start[group.id] = theirs;
    }
    return start;
  });
  const [qty, setQty] = useState(editing ? editing.qty : 1);

  const chosen = useMemo(() => Object.values(picked).flat(), [picked]);

  const extra = useMemo(
    () =>
      item.groups
        .flatMap((group) => group.options)
        .filter((option) => chosen.includes(option.id))
        .reduce((sum, option) => sum + option.priceDelta, 0),
    [chosen, item.groups]
  );

  const missing = item.groups.filter(
    (group) => group.required && (picked[group.id] ?? []).length === 0
  );

  const choose = (groupId: string, optionId: string, maxSelect: number) => {
    setPicked((was) => {
      const current = was[groupId] ?? [];
      if (current.includes(optionId)) {
        return { ...was, [groupId]: current.filter((one) => one !== optionId) };
      }
      if (maxSelect <= 1) return { ...was, [groupId]: [optionId] };
      if (current.length >= maxSelect) return was;
      return { ...was, [groupId]: [...current, optionId] };
    });
  };

  const add = async () => {
    const names = item.groups
      .flatMap((group) => group.options)
      .filter((option) => chosen.includes(option.id))
      .map((option) => option.name);

    // The old line goes first, or changing the choices on something would
    // leave the original sitting in the cart beside the new one. Whose food
    // it is travels with it: a bag is labelled by name.
    if (editing) await cart.setQty(editing.key, 0);

    await cart.add(
      {
        itemId: item.id,
        name: item.name,
        restaurant,
        imageUrl: item.imageUrl,
        unitPrice: item.price + extra,
        optionIds: chosen,
        choices: names,
        forName: editing?.forName ?? "",
        containerPct: item.containerPct,
      },
      qty
    );
    onDone();
  };

  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: T.shell,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "92%",
        overflow: "hidden",
      }}
    >
      {/* Without this there is no way out of the sheet on an iPhone: a full
          screen modal cannot be swiped away, and only Android has a back. */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 10 }}>
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={round()}
        >
          <Ionicons name="close" size={22} color={T.ink} />
        </Pressable>
      </View>

      {/* Shrinks to what is on it, so a drink with nothing to ask does not
          open a screenful of empty grey. */}
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}
      >
        {item.imageUrl !== "" && (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", height: 200, borderRadius: T.radius }}
          />
        )}
        <Text style={{ fontSize: 24, fontWeight: "800", color: T.ink }}>{item.name}</Text>
        {blurbOf(item) !== "" && <Text style={{ color: T.muted }}>{blurbOf(item)}</Text>}

        {item.groups.map((group) => (
          <View key={group.id} style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14 }}>
            <Text style={{ fontWeight: "800", color: T.ink }}>{group.name}</Text>
            <Text style={{ color: T.muted, marginBottom: 8 }}>
              {group.maxSelect > 1 ? `Pick up to ${group.maxSelect}` : "Pick one"}
              {group.required ? "" : ", or none"}
            </Text>
            {group.options.map((option) => {
              const on = (picked[group.id] ?? []).includes(option.id);
              // A sold out choice is shown but cannot be picked, the same as
              // on the website: knowing it exists is worth the grey line.
              const sold = option.available === false;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => choose(group.id, option.id, group.maxSelect)}
                  disabled={sold}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: T.line,
                    opacity: sold ? 0.4 : 1,
                  }}
                >
                  <Text style={{ color: on ? T.brand : T.ink, fontWeight: on ? "800" : "400" }}>
                    {on ? "● " : "○ "}
                    {option.name}
                  </Text>
                  {option.priceDelta !== 0 && (
                    <Text style={{ color: T.muted }}>+{naira(option.priceDelta)}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          padding: 16,
          paddingBottom: 16 + insets.bottom,
          backgroundColor: T.paper,
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
        }}
      >
        <Pressable onPress={() => setQty((was) => Math.max(1, was - 1))} style={round()}>
          <Text style={{ fontSize: 20 }}>−</Text>
        </Pressable>
        <Text style={{ fontWeight: "800", fontSize: 16 }}>{qty}</Text>
        <Pressable onPress={() => setQty((was) => was + 1)} style={round()}>
          <Text style={{ fontSize: 20 }}>+</Text>
        </Pressable>

        <Pressable
          onPress={add}
          disabled={missing.length > 0}
          style={{
            flex: 1,
            backgroundColor: missing.length > 0 ? "rgba(20,17,15,0.15)" : T.brand,
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: T.paper, fontWeight: "800" }}>
            {missing.length > 0
              ? `Choose ${missing[0].name.toLowerCase()}`
              : `Add · ${naira((item.price + extra) * qty)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The description worth printing: some menus just repeat the name into it,
 *  and saying the same thing twice reads as a mistake. */
function blurbOf(item: Item): string {
  const described = item.description.trim();
  return described.toLowerCase() === item.name.trim().toLowerCase() ? "" : described;
}

function round() {
  return {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: "center",
    justifyContent: "center",
  } as const;
}
