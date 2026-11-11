import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, naira, pickApi, type MenuTilesView, type Product } from "@/lib/api";
import Thumb from "@/components/Thumb";
import AskUs from "@/components/AskUs";
import { F, T } from "@/lib/theme";
import { Display } from "@/components/ui";

/**
 * Everything, in one list.
 *
 * The menu tab is a row of restaurants, which suits somebody who has decided
 * where they want food from and is no use at all to somebody who has decided
 * what they want to eat. Wings are wings whoever fried them.
 *
 * A page at a time, off the same two functions the website uses, so the two
 * cannot drift into showing different things.
 *
 * The board draws this as a column of wide rows rather than a grid: a dish
 * is read by its name and the kitchen under it, and a name is the one thing
 * a two-up grid has no room for.
 */
export default function ProductsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  /*
   * What the home screen was tapped for, if it was.
   *
   * The row of kinds sends a word, a category or an aisle, and the screen
   * used to read only the category: a tap on Chicken or on Ice cream
   * opened the whole menu, which reads as a chip that does nothing. Only
   * the first value of each, because a screen opened twice carries its
   * parameters twice.
   */
  const asked = useLocalSearchParams<{
    category?: string | string[];
    q?: string | string[];
    aisle?: string | string[];
  }>();
  const once = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const [category, setCategory] = useState(once(asked.category));
  /*
   * And by a word, or by one of the shop's aisles.
   *
   * The row of kinds narrows three ways, because no single one of them
   * works for all of it: "chicken" is a word, small chops are a counter's
   * category, and pizza and ice cream are aisles, since Cold Stone names
   * every tub "... Ice Cream" and Scoop'd names them "Padi (1 Scoop)".
   * The screen took only the category, so two of the nine chips opened the
   * whole menu.
   */
  const aisle = once(asked.aisle);

  const [view, setView] = useState<"food" | "kitchens">("food");
  const [menuTiles, setMenuTiles] = useState<MenuTilesView | null>(null);
  useEffect(() => {
    let live = true;
    pickApi
      .menuTiles()
      .then((found) => live && setMenuTiles(found))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const [typed, setTyped] = useState(once(asked.q));
  const [query, setQuery] = useState(once(asked.q));
  const [place, setPlace] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setBusy(true);
    api
      .products({ q: query, place, category, aisle, sort, page })
      .then((data) => {
        // Paging adds to the list rather than replacing it, because a phone
        // is scrolled and not paged. Anything else starts again.
        setRows((was) => (page === 1 ? data.products : [...was, ...data.products]));
        setTotal(data.total);
        setPlaces(data.places);
        setCategories(data.categories);
        setError("");
      })
      .catch((why) => setError(why instanceof Error ? why.message : "Could not load."))
      .finally(() => setBusy(false));
  }, [query, place, category, aisle, sort, page]);

  const start = (change: () => void) => {
    change();
    setPage(1);
  };

  // How many kitchens the list covers, which is the half of the board's
  // count line that says the order can be mixed. Counted off what has
  // loaded, so it grows as the list does rather than claiming a number
  // nothing on screen backs up.
  const kitchens = useMemo(
    () => new Set(rows.map((one) => one.restaurant)).size,
    [rows]
  );

  // Nothing asked yet: open on the same tiles the website's menu does.
  const fresh = query === "" && category === "" && aisle === "" && place === "";
  if (fresh && menuTiles) {
    const w = Math.floor((width - 32 - 8) / 2);
    const cards: { key: string; label: string; from: number; image: string; go: () => void }[] =
      view === "kitchens"
        ? menuTiles.kitchens.map((one) => ({
            key: one.id,
            label: one.name,
            from: one.from,
            image: one.image,
            go: () => router.push(`/r/${one.id}` as never),
          }))
        : (() => {
            const all = [
              ...menuTiles.tiles.map((one) => ({
                key: `t-${one.label}`,
                label: one.label,
                from: one.from,
                image: one.image,
                go: () =>
                  router.push({ pathname: "/pick", params: { label: one.label, tile: one.label } } as never),
              })),
              ...menuTiles.more.map((one) => ({
                key: `a-${one.label}`,
                label: one.label,
                from: one.from,
                image: one.image,
                go: () =>
                  router.push({ pathname: "/pick", params: { label: one.label, aisle: one.label } } as never),
              })),
            ];
            if (menuTiles.featured) {
              const f = menuTiles.featured;
              all.splice(Math.max(0, all.length - 2), 0, {
                key: "featured",
                label: f.label,
                from: f.from,
                image: f.image,
                go: () => router.push(`/occasions/${f.slug}` as never),
              });
            }
            return all;
          })();
    return (
      <ScrollView
        style={{ backgroundColor: T.shell }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Display size={28}>{view === "kitchens" ? "Restaurants" : "What are you having?"}</Display>
          <View
            style={{
              flexDirection: "row",
              borderWidth: 2,
              borderColor: T.ink,
              borderRadius: 999,
              padding: 2,
              backgroundColor: T.paper,
            }}
          >
            {(["food", "kitchens"] as const).map((one) => (
              <Pressable
                key={one}
                onPress={() => setView(one)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: view === one ? T.ink : "transparent",
                }}
              >
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: view === one ? T.shell : T.ink }}>
                  {one === "food" ? "Food" : "Restaurants"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {cards.map((one) => (
            <Pressable
              key={one.key}
              onPress={one.go}
              style={{
                width: w,
                gap: 4,
                padding: 8,
                backgroundColor: T.paper,
                borderWidth: 2,
                borderColor: T.ink,
                borderRadius: 16,
              }}
            >
              <Thumb src={one.image} name={one.label} radius={8} ratio={16 / 9} />
              <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }} numberOfLines={2}>
                {one.label}
              </Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: T.brand }}>
                {one.from > 0 ? `from ${naira(one.from)} →` : "→"}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.shell }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
        {/* The board heads the screen with the thing being looked at, in the
            display face, rather than a navigation bar title: a category
            opened from the home screen should say so in letters that size. */}
        <Display size={44}>{category === "" ? "Menu" : category}</Display>

        {/* The board's search: a pill with the glass in it, not a boxed
            field, because this one is a search and not a form. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: T.paper,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: 999,
            paddingHorizontal: 16,
            minHeight: 50,
          }}
        >
          <Ionicons name="search" size={18} color={T.ink} />
          <TextInput
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={() => start(() => setQuery(typed))}
            returnKeyType="search"
            placeholder="Search wings, pizza, rice…"
            placeholderTextColor={T.muted}
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: F.body,
              fontSize: 16,
              color: T.ink,
            }}
          />
        </View>

        {/* What the list is, in one line, and how to reorder it. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text
            style={{
              flex: 1,
              minWidth: 0,
              color: T.muted,
              fontFamily: F.body,
              fontSize: 13,
            }}
          >
            {busy && page === 1
              ? "…"
              : total === 0
                ? "Nothing matches that."
                : `${total} dish${total === 1 ? "" : "es"}${
                    kitchens > 1 ? ` · ${kitchens} kitchens` : ""
                  } · all on the next run`}
          </Text>
        </View>
      </View>

      {error !== "" && (
        <Text style={{ color: T.brandDark, paddingHorizontal: 16 }}>{error}</Text>
      )}

      <FlatList
        data={rows}
        keyExtractor={(one) => one.id}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 32 }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!busy && rows.length < total) setPage((was) => was + 1);
        }}
        ListFooterComponent={
          busy ? (
            <ActivityIndicator color={T.brand} style={{ marginTop: 12 }} />
          ) : total === 0 ? (
            // The one moment somebody has said exactly what they want and
            // been told we have not got it.
            <AskUs q={query} />
          ) : (
            <Text
              style={{
                color: T.muted,
                fontFamily: F.body,
                fontSize: 13,
                lineHeight: 19,
                marginTop: 10,
              }}
            >
              Mix kitchens freely. It is still one delivery fee for the whole
              order.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/r/${item.restaurantId}?item=${item.id}` as never)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: T.paper,
              borderWidth: 2,
              borderColor: T.ink,
              borderRadius: T.radius,
              padding: 12,
            }}
          >
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: T.ink,
                overflow: "hidden",
              }}
            >
              <Thumb src={item.imageUrl} name={item.name} ratio={1} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: F.bodyBold,
                  fontSize: 15.5,
                  lineHeight: 20,
                  color: T.ink,
                }}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text
                style={{ color: T.muted, fontFamily: F.body, fontSize: 13, marginTop: 2 }}
                numberOfLines={1}
              >
                {item.restaurant}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 5 }}>
              <Text style={{ fontFamily: F.mono, fontSize: 15, color: T.ink }}>
                {naira(item.price)}
              </Text>
              {/* Part of the row rather than a button of its own: a dish can
                  want a size or a side picked, so the only honest thing one
                  tap can do is open it. */}
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  backgroundColor: T.brand,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={20} color={T.paper} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

/** One row of the board's filter pills: Ink when it is the one you are on. */
function Chips({
  options,
  picked,
  onPick,
}: {
  options: { id: string; name: string }[];
  picked: string;
  onPick: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: "row", gap: 8 }}
    >
      {options.map((one) => {
        const on = picked === one.id;
        return (
          <Pressable
            key={one.id || "any"}
            onPress={() => onPick(one.id)}
            style={{
              minHeight: 40,
              paddingHorizontal: 16,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              borderWidth: 2,
              borderColor: T.ink,
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
              {one.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
