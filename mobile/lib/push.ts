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
