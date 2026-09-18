import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { T } from "@/lib/theme";

// A notification that lands while somebody is looking at the app should still
// be seen: they are usually in the app because they are waiting for it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Layout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: T.paper },
          headerTitleStyle: { fontWeight: "800", color: T.ink },
          headerTintColor: T.brand,
          contentStyle: { backgroundColor: T.shell },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Sudu" }} />
        <Stack.Screen name="r/[id]" options={{ title: "" }} />
        <Stack.Screen name="cart" options={{ title: "Your cart" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Your order" }} />
      </Stack>
    </>
  );
}
