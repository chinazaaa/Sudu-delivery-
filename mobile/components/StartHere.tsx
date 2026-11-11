import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { naira, pickApi, type HomeTileView, type HomeView } from "@/lib/api";
import Thumb from "@/components/Thumb";
import { Display } from "@/components/ui";
import { whatsappTo } from "@/lib/whatsapp";
import { F, T } from "@/lib/theme";

/**
 * Where somebody who does not know what to order starts.
 *
 * Four photo tiles, a bot and a person to ask, then a row of other things.
 * Everything here comes from the same tiles the website opens on. If the
 * shop cannot be reached it draws nothing, and the rest of the home carries on.
 */
export default function StartHere() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [home, setHome] = useState<HomeView | null>(null);

  useEffect(() => {
    let live = true;
    pickApi
      .home()
      .then((found) => live && setHome(found))
      .catch(() => {
        /* A front row that cannot load is no row, never an error. */
      });
    return () => {
      live = false;
    };
  }, []);

  if (!home || home.tiles.length === 0) return null;

  const tileW = Math.floor((width - 32 - 8) / 2);
  const moreW = Math.floor((width - 32) * 0.42);

  const open = (one: HomeTileView, kind: "tile" | "aisle") =>
    router.push({
      pathname: "/pick",
      params: kind === "tile" ? { label: one.label, tile: one.label } : { label: one.label, aisle: one.label },
    } as never);

  const message = () => {
    const link = home.whatsapp.startsWith("http")
      ? home.whatsapp
      : whatsappTo(home.whatsapp, "Hi Sudu, I'm not sure what to order");
    if (link === "") router.push("/ask" as never);
    else void Linking.openURL(link).catch(() => {});
  };

  const tile = (one: HomeTileView, kind: "tile" | "aisle", w: number) => (
    <Pressable
      key={one.label}
      onPress={() => open(one, kind)}
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
      <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }} numberOfLines={1}>
        {one.label}
      </Text>
      <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: T.brand }}>
        from {naira(one.from)} →
      </Text>
    </Pressable>
  );

  const button = (label: string, onPress: () => void, loud: boolean) => (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 50,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: T.ink,
        backgroundColor: loud ? T.brand : "transparent",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
      }}
    >
      <Text
        style={{ fontFamily: F.bodyBold, fontSize: 15, color: loud ? T.paper : T.ink }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Display size={28}>Start from here</Display>
        {home.arriving !== "" && (
          <View
            style={{
              backgroundColor: T.ink,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: T.shell }} numberOfLines={1}>
              {home.arriving}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {home.tiles.map((one) => tile(one, "tile", tileW))}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {button("Chat with our bot", () => router.push("/ask" as never), true)}
        {button("Message us", message, false)}
      </View>

      {(home.more.length > 0 || home.featured) && (
        <View style={{ gap: 8, marginTop: 6 }}>
          <Display size={22}>Something else?</Display>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {home.featured && (
              <Pressable
                onPress={() => router.push(`/occasions/${home.featured?.slug}` as never)}
                style={{
                  width: moreW,
                  gap: 4,
                  padding: 8,
                  backgroundColor: T.paper,
                  borderWidth: 2,
                  borderColor: T.ink,
                  borderRadius: 16,
                }}
              >
                <Thumb src={home.featured.image} name={home.featured.label} radius={8} ratio={16 / 9} />
                <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }} numberOfLines={1}>
                  {home.featured.label}
                </Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: T.brand }}>
                  {home.featured.from > 0 ? `from ${naira(home.featured.from)} →` : "→"}
                </Text>
              </Pressable>
            )}
            {home.more.map((one) => tile(one, "aisle", moreW))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
