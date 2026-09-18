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
