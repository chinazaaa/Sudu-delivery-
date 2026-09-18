import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import Track from "@/components/Track";
import { landingFor } from "@/lib/landing";
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

/**
 * A link that opens straight onto an order, from a notification or a message,
 * would otherwise be the whole app: one screen, no tabs, nothing to go back
 * to. Naming the tabs as the route underneath puts the shop behind every such
 * screen, so there is always a way back into it.
 */
export const unstable_settings = { initialRouteName: "(tabs)" };

export default function Layout() {
  const router = useRouter();

  // A notification that goes nowhere is a notification nobody taps twice. The
  // shop puts a path on the message; this is what follows it, both while the
  // app is open and when tapping it is what opened the app.
  useEffect(() => {
    const go = (response: Notifications.NotificationResponse | null) => {
      const path = landingFor(response?.notification.request.content.data?.path);
      if (path) router.push(path as never);
    };

    void Notifications.getLastNotificationResponseAsync().then(go);
    const listener = Notifications.addNotificationResponseReceivedListener(go);
    return () => listener.remove();
  }, [router]);

  return (
    <>
      <StatusBar style="dark" />
      {/* Above the stack, so it sees every screen rather than only the ones
          somebody remembered to add it to. */}
      <Track />
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
