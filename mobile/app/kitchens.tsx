import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { HOME, type Place } from "@/lib/api";
import { useShop } from "@/lib/use-shop";
import { tileAt } from "@/lib/tiles";
import { Display, Ticket } from "@/components/ui";
import { F, T } from "@/lib/theme";

/**
 * Every kitchen the shop buys from, with a search and the areas.
 *
 * The home screen shows the first handful, because a front page that is
 * thirteen tiles tall is a front page nobody scrolls past. This is the rest
 * of them, and the only place the list is long enough to be worth searching
 * or narrowing by where it is being collected from.
 */
export default function Kitchens() {
  const router = useRouter();
  const shop = useShop();

  const [typed, setTyped] = useState("");
  const [area, setArea] = useState("");

  // Its own memo, so the two below do not see a fresh array every render.
  const menu = useMemo(() => shop?.menu ?? [], [shop]);

  /**
   * The areas the kitchens actually sit in, in the order the shop lists
   * them, and only the ones something is open in. A chip for an area with
   * nothing behind it is a chip that empties the screen.
   */
  const areas = useMemo(() => {
    const where = shop?.areaOf ?? {};
    const live = new Set(menu.map((one) => where[one.restaurant.id] ?? ""));
    return [HOME, ...(shop?.areas ?? [])].filter((one) => live.has(one.id));
  }, [shop, menu]);

  /** What an area's name is, for the line under a kitchen's name. */
  const areaName = (place: Place) => {
    const id = shop?.areaOf?.[place.restaurant.id] ?? "";
    return areas.find((one) => one.id === id)?.name ?? HOME.name;
  };

  const shown = useMemo(() => {
    const asked = typed.trim().toLowerCase();
    const where = shop?.areaOf ?? {};
    return menu.filter((one) => {
      if (area !== "" && (where[one.restaurant.id] ?? "") !== area) return false;
      if (asked === "") return true;
      // The name, and what is on the menu: somebody searching "doughnut"
      // means the kitchen that sells one, not the one called that.
      return (
        one.restaurant.name.toLowerCase().includes(asked) ||
        one.items.some((item) => item.name.toLowerCase().includes(asked))
      );
    });
  }, [menu, typed, area, shop]);

  if (shop === null) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      style={{ backgroundColor: T.shell }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
    >
      <Display size={44}>Kitchens</Display>

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
          placeholder="Search kitchens"
          placeholderTextColor={T.muted}
          style={{ flex: 1, minWidth: 0, fontFamily: F.body, fontSize: 16, color: T.ink }}
        />
      </View>

      {/* Where the food is collected from. Only worth a row at all once
          there is more than one place it comes from. */}
      {areas.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {[{ id: "", name: `All ${menu.length}` }, ...areas].map((one, at) => {
            // The first chip is the one that clears the filter, and shares
            // the empty id with Sangotedo, so it is told apart by position.
            const value = at === 0 ? "" : one.id;
            const on = at === 0 ? area === "" : area === one.id;
            return (
              <Pressable
                key={`${at}-${one.id}`}
                onPress={() => setArea(value)}
                style={{
                  minHeight: 38,
                  paddingHorizontal: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: T.ink,
                  backgroundColor: on ? T.ink : "transparent",
                }}
              >
                <Text
                  style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? T.shell : T.ink }}
                >
                  {one.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {shown.length === 0 ? (
        <Text style={{ fontFamily: F.body, fontSize: 15, color: T.muted, lineHeight: 22 }}>
          Nothing here matches that. Try a shorter word, or tell us below what
          you were after.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {shown.map((place, at) => {
            const tile = tileAt(at);
            return (
              <Link key={place.restaurant.id} href={`/r/${place.restaurant.id}`} asChild>
                <Pressable
                  style={{
                    flexBasis: "48%",
                    flexGrow: 1,
                    minHeight: 92,
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
                    {`${areaName(place)} · ${place.items.length} thing${
                      place.items.length === 1 ? "" : "s"
                    }`}
                  </Ticket>
                </Pressable>
              </Link>
            );
          })}
        </View>
      )}

      {/* The board ends the list with this, and it is the one screen where
          somebody has just looked for a kitchen and not found it. */}
      <Pressable
        onPress={() => router.push("/ask" as never)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: T.tint,
          borderWidth: 2,
          borderColor: T.ink,
          borderRadius: T.radius,
          padding: 14,
          marginTop: 2,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 15.5, color: T.ink }}>
            Somewhere not on here?
          </Text>
          <Text
            style={{ fontFamily: F.body, fontSize: 13, color: T.muted, marginTop: 2, lineHeight: 18 }}
          >
            Tell us and we will try to get it on the next run.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={T.muted} />
      </Pressable>
    </ScrollView>
  );
}
