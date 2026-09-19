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
import { cart, countItems, useStored, type Line } from "@/lib/store";
import { T } from "@/lib/theme";
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
        const here = shop.offers?.[id];
        setOffer(here ? { line: here.line, deals: here.deals } : null);
        if (found) {
          navigation.setOptions({ title: found.restaurant.name });
          const asked = wanted ? found.items.find((one) => one.id === wanted) : null;
          if (asked && asked.available) setOpen(asked);
        }
      })
      .catch(() => setPlace(null));
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

  if (!place) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}>
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
            borderRadius: T.radius,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
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
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: on ? T.brand : T.paper,
                  }}
                >
                  <Text style={{ color: on ? T.paper : T.ink, fontWeight: "700" }}>
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
            <Text
              style={{
                fontWeight: "800",
                fontSize: 13,
                letterSpacing: 0.6,
                color: T.muted,
                textTransform: "uppercase",
              }}
            >
              {section.name}
            </Text>
            {section.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => item.available && setOpen(item)}
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
                  {blurbOf(item) !== "" && (
                    <Text numberOfLines={2} style={{ color: T.muted, marginTop: 2 }}>
                      {blurbOf(item)}
                    </Text>
                  )}
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
