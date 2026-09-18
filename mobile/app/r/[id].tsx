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
import { api, naira, type Item, type Place } from "@/lib/api";
import { cart, countItems, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/** One restaurant: its menu, and a sheet for the questions a meal asks. */
export default function Restaurant() {
  // `item` arrives when somebody tapped a search result, so the sheet for
  // that dish opens on top of its own menu rather than making them find it.
  const { id, item: wanted } = useLocalSearchParams<{ id: string; item?: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  const [place, setPlace] = useState<Place | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const [query, setQuery] = useState("");
  const [lines] = useStored(cart.read, []);

  useEffect(() => {
    void api
      .shop()
      .then((shop) => {
        const found = shop.menu.find((one) => one.restaurant.id === id) ?? null;
        setPlace(found);
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

  if (!place) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}>
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

        {shown.length === 0 && (
          <Text style={{ color: T.muted, marginTop: 8 }}>
            Nothing on this menu matches that.
          </Text>
        )}

        {shown.map((item) => (
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
              {item.description !== "" && (
                <Text numberOfLines={2} style={{ color: T.muted, marginTop: 2 }}>
                  {item.description}
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

      <Modal visible={open !== null} animationType="slide" onRequestClose={() => setOpen(null)}>
        {open && (
          <ItemSheet item={open} restaurant={place.restaurant.name} onDone={() => setOpen(null)} />
        )}
      </Modal>
    </View>
  );
}

/** The questions a meal asks, and nothing is added until they are answered. */
function ItemSheet({
  item,
  restaurant,
  onDone,
}: {
  item: Item;
  restaurant: string;
  onDone: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

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

    await cart.add(
      {
        itemId: item.id,
        name: item.name,
        restaurant,
        imageUrl: item.imageUrl,
        unitPrice: item.price + extra,
        optionIds: chosen,
        choices: names,
      },
      qty
    );
    onDone();
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.shell }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 14 }}>
        {item.imageUrl !== "" && (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", height: 200, borderRadius: T.radius }}
          />
        )}
        <Text style={{ fontSize: 24, fontWeight: "800", color: T.ink }}>{item.name}</Text>
        {item.description !== "" && <Text style={{ color: T.muted }}>{item.description}</Text>}

        {item.groups.map((group) => (
          <View key={group.id} style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14 }}>
            <Text style={{ fontWeight: "800", color: T.ink }}>{group.name}</Text>
            <Text style={{ color: T.muted, marginBottom: 8 }}>
              {group.maxSelect > 1 ? `Pick up to ${group.maxSelect}` : "Pick one"}
              {group.required ? "" : ", or none"}
            </Text>
            {group.options.map((option) => {
              const on = (picked[group.id] ?? []).includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => choose(group.id, option.id, group.maxSelect)}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: T.line,
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
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
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
