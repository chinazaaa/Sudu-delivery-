import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { naira, pickApi, type BuilderDish, type BuilderShop, type Item, type ShopDay } from "@/lib/api";
import { cart, cartTotal, countItems, useStored } from "@/lib/store";
import ItemSheet from "@/components/ItemSheet";
import Thumb from "@/components/Thumb";
import { Display } from "@/components/ui";
import { F, T } from "@/lib/theme";

type Offer = "chicken" | "rice" | "soup" | "swallow" | "side";
type Via = "dish" | "more" | "drink";
type Step = "shop" | "dish" | "more" | "drink" | "added";

const UPSELL_KINDS_ASKED = ["chicken", "rice", "soup", "swallow", "side", "burger"];
const OFFER_SAID: Record<Offer, string> = {
  chicken: "chicken",
  rice: "rice",
  soup: "soup",
  swallow: "swallow",
  side: "a side",
};
const DOTS: Step[] = ["shop", "dish", "drink", "added"];

const param = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

/**
 * A few taps from "I do not know" to food in the cart.
 *
 * Which place, then which dish with the most ordered at the top, then the
 * usual sheet for size and drink, then whatever goes with it. Everything it
 * shows comes from the menu, so a new counter or dish appears here with no
 * change to this.
 */
export default function Pick() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    label?: string;
    tile?: string;
    aisle?: string;
    q?: string;
    category?: string;
    everyone?: string;
  }>();
  const tile = param(params.tile);
  const aisle = param(params.aisle);
  const word = param(params.q);
  const category = param(params.category);
  // "Pick another restaurant" lists every restaurant, not only the ones that
  // sell this kind of food. It can also be how this screen is opened.
  const [everyone, setEveryone] = useState(param(params.everyone) === "1");

  const [lines] = useStored(cart.read, []);
  const [shops, setShops] = useState<BuilderShop[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<Step>("shop");
  const [shop, setShop] = useState<BuilderShop | null>(null);
  const [open, setOpen] = useState<{ item: Item; shop: BuilderShop; via: Via } | null>(null);
  // What goes with the dish just added: chicken with rice, rice with chicken.
  const [pairs, setPairs] = useState<Record<string, BuilderShop[]>>({});
  const [offer, setOffer] = useState<Offer | "">("");
  const [drinks, setDrinks] = useState<BuilderShop[]>([]);
  const [loading, setLoading] = useState("");
  const [cheapest, setCheapest] = useState(false);
  // When each counter in the cart next delivers, so a late one can be said.
  const [days, setDays] = useState<Record<string, ShopDay>>({});
  const before = useRef(0);
  const scroller = useRef<ScrollView | null>(null);
  // Counter name to id: a cart line carries the name, the day lookup wants
  // the id.
  const known = useRef<Record<string, string>>({});

  const remember = (found: BuilderShop[]) => {
    for (const one of found) known.current[one.name] = one.id;
  };

  const count = countItems(lines);

  useEffect(() => {
    if (step !== "added") return;
    const ids = [
      ...new Set(
        lines.map((line) => known.current[line.restaurant]).filter((id): id is string => !!id)
      ),
    ];
    if (ids.length === 0) return;
    let live = true;
    pickApi
      .shopDays(ids)
      .then((found) => live && setDays(found))
      .catch(() => {});
    return () => {
      live = false;
    };
    // The cart's own makeup is what matters, not each tick of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lines.length]);

  // Each step opens at its top, not wherever the last one was scrolled to.
  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [step, shop, offer]);

  useEffect(() => {
    let live = true;
    setFailed(false);
    pickApi
      .builder(
        everyone
          ? { all: true }
          : { tile, aisle, q: word, category }
      )
      .then((found) => {
        if (!live) return;
        remember(found);
        setShops(found);
        // One place sells it, so there is nothing to choose between.
        if (found.length === 1) {
          setShop(found[0]);
          setStep("dish");
        }
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [tile, aisle, word, category, everyone]);

  useEffect(() => {
    let live = true;
    for (const kindName of UPSELL_KINDS_ASKED) {
      pickApi
        .builder({ upsell: kindName })
        .then((found) => {
          if (!live) return;
          remember(found);
          setPairs((was) => ({ ...was, [kindName]: found }));
        })
        .catch(() => {});
    }
    // Drinks are offered after the food, so they are fetched while somebody
    // is still choosing it.
    pickApi
      .builder({ aisle: "Drinks" })
      .then((found) => live && setDrinks(found))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/" as never);
  };
  const toCart = () => router.replace("/cart" as never);

  async function pick(dish: BuilderDish, from: BuilderShop, via: Via = "dish") {
    setLoading(dish.id);
    let groups: Item["groups"] = [];
    try {
      groups = await pickApi.choices(dish.id);
    } catch {
      /* A dish with no choices adds in one tap anyway. */
    }
    before.current = countItems(await cart.read());
    setLoading("");
    setOpen({
      via,
      shop: from,
      item: {
        id: dish.id,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        imageUrl: dish.imageUrl,
        available: true,
        categoryId: null,
        containerPct: dish.containerPct,
        groups,
      },
    });
  }

  /** The sheet has closed: if something was added, say what comes next. */
  async function sheetDone() {
    const was = open;
    setOpen(null);
    if (!was) return;
    const now = countItems(await cart.read());
    if (now <= before.current) return;

    const here = was.shop;
    const drinkOn = (drinks.find((one) => one.id === here.id)?.items.length ?? 0) > 0;
    const hasDrink = was.item.groups.some((g) => /drink/i.test(g.name));
    const canDrink = drinkOn && !hasDrink;
    // Chicken with rice, rice with chicken, from the same place, and only
    // once: a combo that already has both is not asked.
    const name = was.item.name.toLowerCase();
    const hasRice = /rice|jollof/.test(name);
    const hasChicken = /chicken/.test(name);
    const inKind = (kind: string) =>
      (pairs[kind] ?? []).some((one) => one.items.some((d) => d.id === was.item.id));
    const asks: Offer | "" =
      was.via !== "dish" || (hasRice && hasChicken)
        ? ""
        : hasRice
          ? "chicken"
          : hasChicken || inKind("chicken")
            ? "rice"
            : inKind("soup")
              ? "swallow"
              : inKind("swallow")
                ? "soup"
                : inKind("burger") && !was.item.groups.some((g) => /side|chips|fries/i.test(g.name))
                  ? "side"
                  : "";
    const food =
      asks !== "" && (pairs[asks]?.find((one) => one.id === here.id)?.items.length ?? 0) > 0;
    if (was.via === "dish" && food) {
      setOffer(asks as Offer);
      setStep("more");
    } else {
      setStep(was.via !== "drink" && canDrink ? "drink" : "added");
    }
  }

  const drinkOn = (from: BuilderShop) =>
    (drinks.find((one) => one.id === from.id)?.items.length ?? 0) > 0;

  const back = () => {
    if (step === "dish") {
      if ((shops?.length ?? 0) === 1) return close();
      setStep("shop");
    } else if (step === "more" || step === "drink" || step === "added") setStep("dish");
  };

  const toEveryone = () => {
    // Only cleared when the list is about to be fetched again: if it is
    // already the list of everyone nothing will refetch it, and clearing it
    // would leave the screen on "Loading" for good.
    if (!everyone) {
      setEveryone(true);
      setShops(null);
    }
    setShop(null);
    setStep("shop");
  };

  const list = shop?.items ?? [];
  const popular = list.filter((d) => d.orderedCount > 0).slice(0, 3);
  const lead = cheapest ? [] : list.filter((d) => d.featured);
  const top = cheapest ? [] : lead.length > 0 ? lead : popular.length > 0 ? popular : list.slice(0, 3);
  // What is most ordered (or what the tile leads with) comes first; the rest
  // follow cheapest first, so the next thing down is always the least to spend.
  const rest = [...list].sort((a, b) => a.price - b.price).filter((d) => !top.includes(d));

  const cardW = Math.floor((width - 32 - 12) / 2);

  const card = (dish: BuilderDish, from: BuilderShop, tag?: string, via: Via = "dish") => (
    <Pressable
      key={dish.id}
      onPress={() => void pick(dish, from, via)}
      disabled={loading !== ""}
      style={{
        width: cardW,
        backgroundColor: T.paper,
        borderWidth: 2,
        borderColor: T.ink,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <Thumb src={dish.imageUrl} name={dish.name} ratio={4 / 3} />
      {tag && (
        <View
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            backgroundColor: T.volt,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: T.ink }}>{tag}</Text>
        </View>
      )}
      <View style={{ padding: 10, gap: 6, alignItems: "flex-start" }}>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.ink }}>{dish.name}</Text>
        <View
          style={{
            backgroundColor: T.brand,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.paper }}>
            {loading === dish.id ? "…" : `${dish.varies ? "from " : ""}${naira(dish.price)}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const quiet = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 50,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: T.ink,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
      }}
    >
      <Text style={{ fontFamily: F.bodyBold, fontSize: 16, color: T.ink }}>{label}</Text>
    </Pressable>
  );

  const grid = { flexDirection: "row", flexWrap: "wrap", gap: 12 } as const;

  // The notice about a counter that only comes on a later day.
  const idOf = (name: string) => known.current[name] ?? "";
  const late = lines.filter((line) => days[idOf(line.restaurant)] && !days[idOf(line.restaurant)].today);
  const early = lines.filter((line) => days[idOf(line.restaurant)]?.today);
  const lateNames = [...new Set(late.map((line) => line.restaurant))];
  const lateSaid =
    lateNames.length <= 1
      ? (lateNames[0] ?? "")
      : `${lateNames.slice(0, -1).join(", ")} and ${lateNames[lateNames.length - 1]}`;
  const lateDay =
    late.length > 0 ? days[idOf(late[0].restaurant)].said.replace("Next delivery ", "") : "";
  const dropLate = () => late.forEach((line) => void cart.setQty(line.key, 0));

  return (
    <View style={{ flex: 1, backgroundColor: T.shell }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 2,
          borderBottomColor: T.ink,
        }}
      >
        <Pressable
          onPress={back}
          disabled={step === "shop"}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[circle(), { opacity: step === "shop" ? 0 : 1 }]}
        >
          <Ionicons name="arrow-back" size={20} color={T.ink} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 6 }}>
          {DOTS.map((one) => (
            <View
              key={one}
              style={{
                height: 8,
                width: one === step || (one === "drink" && step === "more") ? 24 : 8,
                borderRadius: 999,
                backgroundColor:
                  one === step || (one === "drink" && step === "more")
                    ? T.brand
                    : "rgba(21,17,14,0.2)",
              }}
            />
          ))}
        </View>
        {count > 0 && (
          <Pressable
            onPress={toCart}
            accessibilityRole="button"
            accessibilityLabel={`Cart, ${count} items`}
            style={circle()}
          >
            <Ionicons name="bag-outline" size={20} color={T.ink} />
            <View
              style={{
                position: "absolute",
                right: -6,
                top: -6,
                minWidth: 20,
                height: 20,
                paddingHorizontal: 4,
                borderRadius: 10,
                backgroundColor: T.brand,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: T.paper, fontFamily: F.bodyBold, fontSize: 11 }}>{count}</Text>
            </View>
          </Pressable>
        )}
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={circle()}
        >
          <Ionicons name="close" size={20} color={T.ink} />
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom, gap: 12 }}
      >
        {step === "shop" && (
          <>
            <Display size={34}>Where from?</Display>
            {failed && (
              <Text style={{ color: T.brandDark, fontFamily: F.bodyBold }}>
                Could not load. Try again.
              </Text>
            )}
            {shops === null && !failed && <ActivityIndicator color={T.brand} style={{ marginTop: 20 }} />}
            {shops?.length === 0 && (
              <Text style={{ color: T.muted }}>Nothing on sale here right now.</Text>
            )}
            <View style={grid}>
              {shops?.map((one) => (
                <Pressable
                  key={one.id}
                  onPress={() => {
                    setShop(one);
                    setStep("dish");
                  }}
                  style={{
                    width: cardW,
                    alignItems: "center",
                    gap: 8,
                    padding: 14,
                    borderWidth: 2,
                    borderColor: T.ink,
                    borderRadius: 16,
                    backgroundColor: one.brandHex ? `${one.brandHex}22` : T.paper,
                  }}
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      overflow: "hidden",
                      borderWidth: 2,
                      borderColor: T.ink,
                      backgroundColor: T.paper,
                    }}
                  >
                    <Thumb src={one.logoUrl} name={one.name} radius={40} ratio={1} />
                  </View>
                  <Text
                    style={{ fontFamily: F.bodyBold, fontSize: 16, color: T.ink, textAlign: "center" }}
                  >
                    {one.name}
                  </Text>
                  <View
                    style={{
                      backgroundColor: T.brand,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.paper }}>
                      from {naira(one.from)}
                    </Text>
                  </View>
                  <DayPill delivery={one.delivery} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === "dish" && shop && (
          <>
            <Display size={34}>{shop.name}</Display>
            <View style={{ flexDirection: "row" }}>
              <DayPill delivery={shop.delivery} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  [false, "Most ordered"],
                  [true, "Cheapest"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={label}
                  onPress={() => setCheapest(value)}
                  style={{
                    borderWidth: 2,
                    borderColor: T.ink,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: cheapest === value ? T.ink : T.paper,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: F.bodyBold,
                      fontSize: 14,
                      color: cheapest === value ? T.shell : T.ink,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={grid}>
              {top.map((dish) => card(dish, shop, lead.length > 0 ? undefined : "★ Most ordered"))}
              {rest.map((dish) => card(dish, shop))}
            </View>
          </>
        )}

        {step === "more" && shop && offer !== "" && (
          <>
            <Display size={34}>Add {OFFER_SAID[offer]}?</Display>
            <View style={grid}>
              {[...(pairs[offer]?.find((one) => one.id === shop.id)?.items ?? [])]
                .sort((a, b) => a.price - b.price)
                .slice(0, 6)
                .map((dish) => card(dish, shop, undefined, "more"))}
            </View>
            {quiet("No thanks", () => setStep(drinkOn(shop) ? "drink" : "added"))}
          </>
        )}

        {step === "drink" && shop && (
          <>
            <Display size={34}>Add a drink?</Display>
            <View style={grid}>
              {[...(drinks.find((one) => one.id === shop.id)?.items ?? [])]
                .sort((a, b) => a.price - b.price)
                .slice(0, 8)
                .map((dish) => card(dish, shop, undefined, "drink"))}
            </View>
            {quiet("No thanks", () => setStep("added"))}
          </>
        )}

        {step === "added" && (
          <>
            <View
              style={{
                backgroundColor: T.paper,
                borderWidth: 2,
                borderColor: T.ink,
                borderRadius: 16,
                padding: 12,
                gap: 12,
              }}
            >
              {lines.length === 0 && <Text style={{ color: T.muted }}>Your cart is empty.</Text>}
              {lines.map((line) => (
                <View key={line.key} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 48, borderRadius: 8, overflow: "hidden" }}>
                    <Thumb src={line.imageUrl} name={line.name} ratio={1} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.ink }} numberOfLines={1}>
                      {line.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: T.muted }}>
                      {line.restaurant} · {naira(line.unitPrice * line.qty)}
                    </Text>
                    {line.choices.length > 0 && (
                      <Text style={{ fontSize: 12, color: T.muted }}>{line.choices.join(", ")}</Text>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable
                      onPress={() => void cart.setQty(line.key, line.qty - 1)}
                      accessibilityRole="button"
                      accessibilityLabel="One less"
                      style={small(false)}
                    >
                      <Text style={{ fontSize: 18, fontFamily: F.bodyBold, color: T.ink }}>−</Text>
                    </Pressable>
                    <Text style={{ fontFamily: F.bodyBold, minWidth: 16, textAlign: "center" }}>
                      {line.qty}
                    </Text>
                    <Pressable
                      onPress={() => void cart.setQty(line.key, line.qty + 1)}
                      accessibilityRole="button"
                      accessibilityLabel="One more"
                      style={small(true)}
                    >
                      <Text style={{ fontSize: 18, fontFamily: F.bodyBold, color: T.shell }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            {late.length > 0 && early.length > 0 && (
              <View
                style={{
                  backgroundColor: T.tint,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  gap: 6,
                }}
              >
                <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.brandDark }}>
                  {lateSaid} only comes {lateDay}. The rest could come today.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 4 }}>
                  <Pressable onPress={dropLate}>
                    <Text
                      style={{
                        fontFamily: F.bodySemi,
                        fontSize: 14,
                        color: T.brandDark,
                        textDecorationLine: "underline",
                      }}
                    >
                      Take out {lateSaid}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      dropLate();
                      toEveryone();
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: F.bodySemi,
                        fontSize: 14,
                        color: T.brandDark,
                        textDecorationLine: "underline",
                      }}
                    >
                      Switch to another restaurant
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={{ textAlign: "center", fontFamily: F.bodySemi, color: T.muted }}>
              In your cart: {count} {count === 1 ? "item" : "items"} · {naira(cartTotal(lines))}
            </Text>
            <Pressable
              onPress={toCart}
              style={{
                minHeight: 56,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: T.ink,
                backgroundColor: T.brand,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: F.bodyBold, fontSize: 18, color: T.paper }}>Go to cart →</Text>
            </Pressable>
            {quiet(shop ? `+ Add more from ${shop.name}` : "+ Add more", () =>
              setStep(shop ? "dish" : "shop")
            )}
            {/* Every restaurant, not only the ones that sell this kind of
                food, in case they want something different. */}
            {quiet("Pick another restaurant", toEveryone)}
          </>
        )}
      </ScrollView>

      <Modal
        visible={open !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(null)}
      >
        <View
          style={{ flex: 1, backgroundColor: "rgba(20,17,15,0.45)", justifyContent: "flex-end" }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setOpen(null)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          {open && (
            <ItemSheet
              item={open.item}
              restaurant={open.shop.name}
              editing={null}
              onDone={() => void sheetDone()}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

/** When a counter's food arrives: green when it is today, amber when it is not. */
function DayPill({ delivery }: { delivery?: ShopDay }) {
  if (!delivery) return null;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderWidth: 2,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderColor: delivery.today ? "rgba(21,128,61,0.4)" : "rgba(180,83,9,0.4)",
        backgroundColor: delivery.today ? "#dcfce7" : "#fef3c7",
      }}
    >
      <Text
        style={{
          fontFamily: F.bodyBold,
          fontSize: 12,
          color: delivery.today ? "#14532d" : "#78350f",
        }}
      >
        {delivery.said}
      </Text>
    </View>
  );
}

function circle() {
  return {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  } as const;
}

function small(dark: boolean) {
  return {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: T.ink,
    backgroundColor: dark ? T.ink : "transparent",
    alignItems: "center",
    justifyContent: "center",
  } as const;
}
