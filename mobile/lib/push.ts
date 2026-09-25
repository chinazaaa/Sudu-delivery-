import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

/**
 * Asking for notifications, and telling the shop where to send them.
 *
 * Asked once, after somebody has actually ordered something, because a
 * permission box on the first screen is the fastest way to be told no.
 */
/**
 * Whether this phone can be asked, has already said yes, or has said no.
 *
 * iOS only ever shows its permission box once. After a no, asking again does
 * nothing at all, and the only way back is Settings, so it matters which of
 * the two we offer somebody.
 */
export async function pushPermission(): Promise<"granted" | "ask" | "denied"> {
  try {
    if (!Device.isDevice) return "denied";
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return "granted";
    return existing.canAskAgain ? "ask" : "denied";
  } catch {
    return "denied";
  }
}

/**
 * Asking now, because somebody asked for it.
 *
 * The app also asks after a first order, but somebody who came to the
 * settings and turned deals on has said what they want more plainly than any
 * prompt we could choose the moment for. Waiting for them to order first
 * would be holding a deal back from the person most likely to use it.
 */
export async function enablePush(token: string | null): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.granted || (existing.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
    if (!granted) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Orders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const push = await Notifications.getExpoPushTokenAsync();
    await api.registerPush(push.data, Platform.OS, token);
    return push.data;
  } catch {
    return null;
  }
}

/**
 * This phone's Expo token, when it has already been allowed to notify.
 *
 * Asks for nothing: a permission box that opens because somebody looked at a
 * settings screen is the same ambush as one on the first screen.
 */
export async function pushTokenIfAllowed(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const existing = await Notifications.getPermissionsAsync();
    if (!existing.granted) return null;
    return (await Notifications.getExpoPushTokenAsync()).data;
  } catch {
    return null;
  }
}

/**
 * Says hello again, without ever asking anything.
 *
 * Run on every launch. A token is registered once, when somebody allows
 * notifications, and never mentioned again: the row it wrote kept the date
 * of that first day for ever, so there was no way to tell a phone that still
 * has the app from one that deleted it the same evening. It also carries the
 * signed-in number, which is how a notification about somebody's own order
 * finds them, and a phone that allowed notifications before signing in had
 * no number on it at all.
 *
 * Silent by design: it reads the permission rather than asking for it, so a
 * launch never puts a box in front of anybody. The asking happens after a
 * first order, which is where it belongs.
 */
export async function greetPush(token: string | null): Promise<void> {
  try {
    const push = await pushTokenIfAllowed();
    if (!push) return;
    await api.registerPush(push, Platform.OS, token);
  } catch {
    /* Saying hello is not worth a crash on start. */
  }
}

export async function registerForPush(token: string | null): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.granted ||
      (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Orders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const push = await Notifications.getExpoPushTokenAsync();
    await api.registerPush(push.data, Platform.OS, token);
  } catch {
    /* No notifications is a smaller problem than a crash on start. */
  }
}
