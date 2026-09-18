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
        {/* The tabs carry their own headers, so this one would be a second.
            The title is still wanted: iOS labels the back button with it, and
            without one it says "(tabs)" at people. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Sudu" }} />
        {/* Pushed over the tabs: each of these is somewhere you came from
            somewhere, and leaving is going back rather than sideways. */}
        <Stack.Screen name="r/[id]" options={{ title: "" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Your order" }} />
      </Stack>
    </>
  );
}
