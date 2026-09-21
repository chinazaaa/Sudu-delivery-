import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, naira, type Shelf, type ShelfProduct } from "@/lib/api";
import { shelf as basket, shelfCount, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * Skincare: the same shop, a different delivery day.
 *
 * Two thousand products is a wall unless you can cut it down, so the page is
 * not really the products, it is the ways of narrowing them: the brand
 * somebody came for, the shelf they are looking at, and what they want to
 * spend. The handful people use are on the screen and the rest are behind one
 * button, because a row of two hundred is a row nobody reaches the end of.
 */
export default function SkincareScreen() {
  const router = useRouter();
  const [data, setData] = useState<Shelf | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [shelfName, setShelfName] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(false);

  const [lines] = useStored(basket.read, []);
  const count = shelfCount(lines);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    void api
      .shelf({ shelf: shelfName, brand, q: query, sort, page })
      .then((next) => {
        if (alive) setData(next);
      })
      .catch((problem: unknown) => {
        if (alive) setError(problem instanceof Error ? problem.message : "Could not reach the shelf.");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [shelfName, brand, query, sort, page]);

  // Narrowing goes back to the first page, or somebody lands on page four of
  // a list that now has one.
  const narrow = (change: () => void) => {
    change();
    setPage(1);
  };

  if (error !== "") {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>
      </View>
    );
  }

  if (!data) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  if (!data.on) {
    return (
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontWeight: "800", fontSize: 17, color: T.ink }}>
          The skincare shelf is closed
        </Text>
        <Text style={{ color: T.muted }}>The food menu is still open.</Text>
      </View>
    );
  }

  const products = data.products ?? [];
  const pages = Math.max(1, Math.ceil((data.total ?? 0) / (data.perPage ?? 24)));
  const on = [
    shelfName !== "" && { label: shelfName, off: () => narrow(() => setShelfName("")) },
    brand !== "" && { label: brand, off: () => narrow(() => setBrand("")) },
    query !== "" && {
      label: `"${query}"`,
      off: () =>
        narrow(() => {
          setQuery("");
          setTyped("");
        }),
    },
  ].filter(Boolean) as { label: string; off: () => void }[];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={products}
        keyExtractor={(one) => one.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: count > 0 ? 100 : 24, gap: 10 }}
        ListHeaderComponent={
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontWeight: "800", fontSize: 22, color: T.ink }}>{data.name}</Text>
              <Text style={{ color: T.ink }}>Order any day. It comes {data.when}.</Text>
              {/* Where the products come from, said before anybody decides
                  rather than at the checkout. Skincare is the one thing
                  people are right to be careful about. */}
              <Text style={{ color: T.brandDark, fontWeight: "700" }}>
                {data.promise} To PAU, or anywhere in Lagos.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                onSubmitEditing={() => narrow(() => setQuery(typed.trim()))}
                returnKeyType="search"
                placeholder="Search a product or a brand"
                placeholderTextColor={T.muted}
                style={{
                  flex: 1,
                  backgroundColor: T.paper,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: T.ink,
                }}
              />
              <Pressable
                onPress={() => setFilters(true)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  backgroundColor: on.length > 0 ? T.ink : T.paper,
                  borderWidth: 1,
                  borderColor: on.length > 0 ? T.ink : T.line,
                }}
              >
                <Text style={{ fontWeight: "800", color: on.length > 0 ? T.paper : T.ink }}>
                  Filter{on.length > 0 ? ` ${on.length}` : ""}
                </Text>
              </Pressable>
            </View>

            {/* The ones people actually use. The rest are a tap away, which
                is the right way round. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Chip on={shelfName === ""} onPress={() => narrow(() => setShelfName(""))}>
                  Everything
                </Chip>
                {(data.shelves ?? []).slice(0, 10).map((one) => (
                  <Chip
                    key={one.name}
                    on={shelfName === one.name}
                    onPress={() => narrow(() => setShelfName(one.name))}
                  >
                    {one.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>

            {on.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {on.map((one) => (
                  <Pressable
                    key={one.label}
                    onPress={one.off}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: "rgba(255,90,31,0.3)",
                      backgroundColor: T.tint,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: T.brandDark, fontWeight: "700" }}>{one.label} ×</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ flex: 1, color: T.muted }}>
                {data.total} product{data.total === 1 ? "" : "s"}
                {busy ? " · looking" : ""}
              </Text>
              {(
                [
                  ["", "Our order"],
                  ["cheap", "Cheapest"],
                  ["dear", "Dearest"],
                ] as const
              ).map(([value, label]) => (
                <Pressable key={value} onPress={() => narrow(() => setSort(value))}>
                  <Text
                    style={{
                      color: sort === value ? T.brand : T.muted,
                      fontWeight: sort === value ? "800" : "400",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Product
            product={item}
            qty={lines.find((one) => one.id === item.id)?.qty ?? 0}
            onAdd={() =>
              void basket.add({
                id: item.id,
                name: item.name,
                brand: item.brand,
                price: item.price,
                imageUrl: item.imageUrl,
              })
            }
            onQty={(qty) => void basket.setQty(item.id, qty)}
          />
        )}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ color: T.muted }}>
              Nothing matches that. Try a shorter word, or take a filter off.
            </Text>
          </View>
        }
        ListFooterComponent={
          pages > 1 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
              }}
            >
              <Pressable disabled={page <= 1} onPress={() => setPage(page - 1)}>
                <Text style={{ color: page <= 1 ? T.muted : T.brand, fontWeight: "700" }}>
                  Back
                </Text>
              </Pressable>
              <Text style={{ color: T.muted }}>
                Page {page} of {pages}
              </Text>
              <Pressable disabled={page >= pages} onPress={() => setPage(page + 1)}>
                <Text style={{ color: page >= pages ? T.muted : T.brand, fontWeight: "700" }}>
                  More
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />

      {count > 0 && (
        <Pressable
          onPress={() => router.push("/skincare-checkout")}
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            backgroundColor: T.brand,
            borderRadius: T.radius,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.25)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: T.paper, fontWeight: "800" }}>{count}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: T.paper, fontWeight: "800" }}>Checkout</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
              Comes {data.when}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={T.paper} />
        </Pressable>
      )}

      <Filters
        open={filters}
        shelves={data.shelves ?? []}
        brands={data.brands ?? []}
        shelfName={shelfName}
        brand={brand}
        onClose={() => setFilters(false)}
        onShelf={(value) => narrow(() => setShelfName(value))}
        onBrand={(value) => narrow(() => setBrand(value))}
      />
    </View>
  );
}

function Chip({
  on,
  onPress,
  children,
}: {
  on: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? T.ink : T.line,
        backgroundColor: on ? T.ink : T.paper,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: on ? T.paper : T.ink, fontWeight: "700" }}>{children}</Text>
    </Pressable>
  );
}

function Product({
  product,
  qty,
  onAdd,
  onQty,
}: {
  product: ShelfProduct;
  qty: number;
  onAdd: () => void;
  onQty: (qty: number) => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: T.paper,
        borderRadius: T.radius,
        padding: 10,
        gap: 6,
      }}
    >
      <View style={{ aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: T.shell }}>
        {product.imageUrl !== "" && (
          <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: "100%" }} />
        )}
      </View>
      {product.brand !== "" && (
        <Text style={{ color: T.muted, fontSize: 11, fontWeight: "800" }} numberOfLines={1}>
          {product.brand.toUpperCase()}
        </Text>
      )}
      <Text style={{ color: T.ink, fontWeight: "600" }} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={{ color: T.ink, fontWeight: "800" }}>{naira(product.price)}</Text>

      {qty > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => onQty(qty - 1)} hitSlop={8}>
            <Ionicons name="remove-circle-outline" size={26} color={T.ink} />
          </Pressable>
          <Text style={{ fontWeight: "800", color: T.ink }}>{qty}</Text>
          <Pressable onPress={() => onQty(qty + 1)} hitSlop={8}>
            <Ionicons name="add-circle" size={26} color={T.brand} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onAdd}
          style={{
            borderWidth: 1,
            borderColor: T.line,
            borderRadius: 10,
            paddingVertical: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700", color: T.ink }}>Add</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Everything there is to narrow by, in lists you can type into. */
function Filters({
  open,
  shelves,
  brands,
  shelfName,
  brand,
  onClose,
  onShelf,
  onBrand,
}: {
  open: boolean;
  shelves: { name: string; items: number }[];
  brands: { name: string; items: number }[];
  shelfName: string;
  brand: string;
  onClose: () => void;
  onShelf: (value: string) => void;
  onBrand: (value: string) => void;
}) {
  const [findShelf, setFindShelf] = useState("");
  const [findBrand, setFindBrand] = useState("");

  const matching = (list: { name: string; items: number }[], needle: string) => {
    const wanted = needle.trim().toLowerCase();
    return (wanted === "" ? list : list.filter((one) => one.name.toLowerCase().includes(wanted))).slice(0, 40);
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(20,17,15,0.45)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={{
            backgroundColor: T.shell,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "80%",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 8 }}>
            <Text style={{ flex: 1, fontWeight: "800", fontSize: 17, color: T.ink }}>
              Narrow it down
            </Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={T.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 0, gap: 14 }}>
            <Pickable
              title="Brand"
              all="Any brand"
              values={matching(brands, findBrand)}
              total={brands.length}
              chosen={brand}
              find={findBrand}
              onFind={setFindBrand}
              onPick={(value) => {
                onBrand(value);
                onClose();
              }}
            />
            <Pickable
              title="Shelf"
              all="Everything"
              values={matching(shelves, findShelf)}
              total={shelves.length}
              chosen={shelfName}
              find={findShelf}
              onFind={setFindShelf}
              onPick={(value) => {
                onShelf(value);
                onClose();
              }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Pickable({
  title,
  all,
  values,
  total,
  chosen,
  find,
  onFind,
  onPick,
}: {
  title: string;
  all: string;
  values: { name: string; items: number }[];
  total: number;
  chosen: string;
  find: string;
  onFind: (value: string) => void;
  onPick: (value: string) => void;
}) {
  if (total === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ flex: 1, fontWeight: "800", color: T.ink }}>{title}</Text>
        <Text style={{ color: T.muted, fontSize: 12 }}>{total}</Text>
      </View>

      {total > 12 && (
        <TextInput
          value={find}
          onChangeText={onFind}
          placeholder={`Type a ${title.toLowerCase()}`}
          placeholderTextColor={T.muted}
          style={{
            backgroundColor: T.paper,
            borderWidth: 1,
            borderColor: T.line,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: T.ink,
          }}
        />
      )}

      <Pressable
        onPress={() => onPick("")}
        style={{
          backgroundColor: chosen === "" ? T.ink : T.paper,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: chosen === "" ? T.paper : T.ink, fontWeight: chosen === "" ? "800" : "400" }}>
          {all}
        </Text>
      </Pressable>

      {values.map((one) => (
        <Pressable
          key={one.name}
          onPress={() => onPick(one.name)}
          style={{
            flexDirection: "row",
            gap: 10,
            backgroundColor: chosen === one.name ? T.ink : T.paper,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: chosen === one.name ? T.paper : T.ink,
              fontWeight: chosen === one.name ? "800" : "400",
            }}
          >
            {one.name}
          </Text>
          <Text style={{ color: chosen === one.name ? "rgba(255,255,255,0.7)" : T.muted }}>
            {one.items}
          </Text>
        </Pressable>
      ))}

      {values.length === 0 && <Text style={{ color: T.muted }}>Nothing called that.</Text>}
    </View>
  );
}
