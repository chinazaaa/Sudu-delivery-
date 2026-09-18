import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { cart, countItems, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * The four places worth going, along the bottom where a thumb already is.
 *
 * The cart carries its count as a badge rather than a word, because the
 * number is the only thing anybody checks it for.
 */
export default function TabsLayout() {
  const [lines] = useStored(cart.read, []);
  const items = countItems(lines);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: T.paper },
        headerTitleStyle: { fontWeight: "800", color: T.ink },
        headerTintColor: T.brand,
        sceneStyle: { backgroundColor: T.shell },
        tabBarActiveTintColor: T.brand,
        tabBarInactiveTintColor: T.muted,
        tabBarStyle: { backgroundColor: T.paper, borderTopColor: T.line },
        tabBarLabelStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Sudu",
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
        name="cart"
        options={{
          title: "Your cart",
          tabBarLabel: "Cart",
          tabBarBadge: items > 0 ? items : undefined,
          tabBarBadgeStyle: { backgroundColor: T.brand, color: T.paper, fontWeight: "800" },
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
