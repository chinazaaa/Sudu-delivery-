import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { cart, countItems, me, shelf, shelfCount, useStored } from "@/lib/store";
import { F, T } from "@/lib/theme";

/**
 * The four places worth going, along the bottom where a thumb already is.
 *
 * The cart carries its count as a badge rather than a word, because the
 * number is the only thing anybody checks it for.
 */
export default function TabsLayout() {
  const [lines] = useStored(cart.read, []);
  const [shelfLines] = useStored(shelf.read, []);
  // Both baskets. They are two orders and two days, but one badge: a
  // skincare basket nobody can see from the menu is one nobody remembers
  // they have.
  const items = countItems(lines) + shelfCount(shelfLines);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: T.shell },
        headerTitleStyle: { fontFamily: F.bodyBold, color: T.ink },
        headerTintColor: T.ink,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: T.shell },
        // The board's bar: Chalk with a hairline over it, the tab you are
        // on in Tomato and the rest in a quiet brown.
        tabBarActiveTintColor: T.brand,
        tabBarInactiveTintColor: "#7a716a",
        tabBarStyle: { backgroundColor: T.shell, borderTopColor: T.line },
        tabBarLabelStyle: { fontFamily: F.bodySemi, fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Sudu",
          /*
           * Where it is going on the left, the shop's name on the right.
           *
           * The board heads the home screen with the block the food is
           * coming to, because that is the one thing about an order the
           * customer changes and the one thing they check. The wordmark
           * moves to the right to make room for it, which is where the
           * board has it. Nothing is centred any more, so the title is
           * emptied rather than left to fight for the middle.
           */
          headerTitle: () => null,
          headerLeft: () => <DeliverTo />,
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 16 }}>
              <Image
                source={require("@/assets/icon.png")}
                style={{ width: 26, height: 26, borderRadius: 7 }}
              />
              <Text
                style={{
                  fontFamily: F.display,
                  fontSize: 28,
                  color: T.ink,
                  transform: [{ skewX: "-10deg" }],
                }}
              >
                SUDU
              </Text>
            </View>
          ),
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "My orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          title: "Ordering together",
          tabBarLabel: "Group",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Your cart",
          tabBarLabel: "Cart",
          tabBarBadge: items > 0 ? items : undefined,
          tabBarBadgeStyle: {
            backgroundColor: T.brand,
            color: T.paper,
            fontFamily: F.mono,
            fontSize: 11,
          },
          tabBarIcon: ({ color, size }) => <Ionicons name="bag-handle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Your data",
          tabBarLabel: "You",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

/**
 * Where the food is going, at the top of the home screen.
 *
 * The board leads with it because it is the one thing about an order a
 * customer changes and the one thing they check before ordering. It shows
 * the block they last had delivered to, and opens the account screen, which
 * is where a block is saved.
 *
 * Nothing saved yet says "Pick a block" rather than a blank: an empty line
 * under DELIVER TO reads as something that failed to load.
 */
function DeliverTo() {
  const router = useRouter();
  const [block, setBlock] = useState("");

  useEffect(() => {
    void me.read().then((one) => setBlock(one.hostel ?? ""));
  }, []);

  return (
    <Pressable
      onPress={() => router.push("/account" as never)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 44,
        paddingLeft: 16,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          backgroundColor: T.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="location" size={18} color={T.volt} />
      </View>
      <View>
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 10,
            letterSpacing: 0.8,
            color: T.muted,
          }}
        >
          DELIVER TO
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 16, color: T.ink }}>
            {block.trim() === "" ? "Pick a block" : block}
          </Text>
          <Ionicons name="chevron-down" size={14} color={T.ink} />
        </View>
      </View>
    </Pressable>
  );
}
