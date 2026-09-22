import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { api, naira, type Product } from "@/lib/api";
import { T } from "@/lib/theme";

/**
 * Everything, in one list.
 *
 * The menu tab is a row of restaurants, which suits somebody who has decided
 * where they want food from and is no use at all to somebody who has decided
 * what they want to eat. Wings are wings whoever fried them.
 *
 * A page at a time, off the same two functions the website uses, so the two
 * cannot drift into showing different things.
 */
export default function ProductsScreen() {
  const router = useRouter();

  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState("");
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
      .products({ q: query, place, category, sort, page })
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
  }, [query, place, category, sort, page]);

  const start = (change: () => void) => {
    change();
    setPage(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.shell }}>
      <View style={{ padding: 16, gap: 10 }}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          onSubmitEditing={() => start(() => setQuery(typed))}
          returnKeyType="search"
          placeholder="Search wings, pizza, rice…"
          placeholderTextColor={T.muted}
          style={{
            backgroundColor: T.paper,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: T.ink,
          }}
        />

        {/* Chips rather than a menu, because a filter you can see is one
            people use and a filter behind a tap is one they never find. */}
        <Chips
          label="Where from"
          options={[{ id: "", name: "Everywhere" }, ...places]}
          picked={place}
          onPick={(id) =>
            start(() => {
              setPlace(id);
              // A category the new restaurant has never heard of has to go.
              setCategory("");
            })
          }
        />

        {categories.length > 0 && (
          <Chips
            label="What kind"
            options={[
              { id: "", name: "Anything" },
              ...categories.map((one) => ({ id: one, name: one })),
            ]}
            picked={category}
            onPick={(id) => start(() => setCategory(id))}
          />
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: T.muted, flex: 1 }}>
            {busy && page === 1 ? "…" : total === 0 ? "Nothing matches that." : `${total} things`}
          </Text>
          {(
            [
              ["", "A to Z"],
              ["cheap", "Cheapest"],
              ["dear", "Dearest"],
            ] as const
          ).map(([value, label]) => (
            <Pressable key={value || "az"} onPress={() => start(() => setSort(value))}>
              <Text
                style={{
                  color: sort === value ? T.brandDark : T.muted,
                  fontWeight: sort === value ? "800" : "600",
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error !== "" && (
        <Text style={{ color: T.brandDark, paddingHorizontal: 16 }}>{error}</Text>
      )}

      <FlatList
        data={rows}
        keyExtractor={(one) => one.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!busy && rows.length < total) setPage((was) => was + 1);
        }}
        ListFooterComponent={
          busy ? <ActivityIndicator color={T.brand} style={{ marginTop: 12 }} /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/r/${item.restaurantId}?item=${item.id}` as never)}
            style={{
              flex: 1,
              backgroundColor: T.paper,
              borderRadius: T.radius,
              overflow: "hidden",
            }}
          >
            {item.imageUrl !== "" ? (
              <Image source={{ uri: item.imageUrl }} style={{ width: "100%", aspectRatio: 4 / 3 }} />
            ) : (
              <View style={{ width: "100%", aspectRatio: 4 / 3, backgroundColor: T.tint }} />
            )}
            <View style={{ padding: 10 }}>
              <Text style={{ fontWeight: "700", color: T.ink }} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{item.restaurant}</Text>
              <Text style={{ fontWeight: "800", color: T.ink, marginTop: 4 }}>
                {naira(item.price)}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function Chips({
  label,
  options,
  picked,
  onPick,
}: {
  label: string;
  options: { id: string; name: string }[];
  picked: string;
  onPick: (id: string) => void;
}) {
  return (
    <View>
      <Text style={{ color: T.muted, fontSize: 12, fontWeight: "600", marginBottom: 4 }}>
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {options.map((one) => (
            <Pressable
              key={one.id || "any"}
              onPress={() => onPick(one.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: picked === one.id ? T.brand : T.line,
                backgroundColor: picked === one.id ? T.tint : T.paper,
              }}
            >
              <Text
                style={{
                  color: picked === one.id ? T.brandDark : T.ink,
                  fontWeight: picked === one.id ? "800" : "500",
                  fontSize: 13,
                }}
              >
                {one.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
