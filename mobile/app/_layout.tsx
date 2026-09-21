import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import Track from "@/components/Track";
import { BASE } from "@/lib/api";
import { handledInApp, landingFor } from "@/lib/landing";
import { T } from "@/lib/theme";

// A notification that lands while somebody is looking at the app should still
// be seen: they are usually in the app because they are waiting for it.
Notifications.setNotificationHandler({
  // "Show it" is two answers now: the banner across the top, and the entry in
  // the notification list behind it. We want both, which is what the single
  // shouldShowAlert used to mean.
  // shouldShowAlert is the old name for the same thing and the installed
  // types still require it, so both are given: the new pair for the runtime
  // that reads them, the old one so this compiles.
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
      if (!path) return;

      // The website grows faster than the app does, and the shop can point a
      // notification at anything on it. Somewhere this app has no screen for
      // opens on the website instead, so whoever tapped gets what they were
      // promised rather than a blank.
      if (handledInApp(path)) router.push(path as never);
      else void Linking.openURL(`${BASE}${path}`);
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
        <Stack.Screen name="finalise" options={{ title: "Put my food in" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Your order" }} />
        {/* The other half of the shop. Its own shelf, its own basket and its
            own day, so it is pushed over the tabs rather than living in
            them: nobody browses skincare and food in the same breath. */}
        {/* Food somebody has already packed. Its own door rather than a
            card in the menu, for the same reason skincare has one. */}
        <Stack.Screen name="occasions/index" options={{ title: "Ordering for something" }} />
        <Stack.Screen name="occasions/[slug]" options={{ title: "" }} />
        <Stack.Screen name="skincare" options={{ title: "Skincare" }} />
        <Stack.Screen name="skincare-checkout" options={{ title: "Checkout" }} />
        {/* A basket somebody was sent. sudu.store/c/<code> opens here rather
            than in a browser, which is the whole reason the app knows about
            links at all. */}
        <Stack.Screen name="c/[code]" options={{ title: "Your order" }} />
      </Stack>
    </>
  );
}
