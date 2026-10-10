import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { enablePush, pushPermission, pushTokenIfAllowed } from "@/lib/push";
import { cart, me, mine, people, useStored } from "@/lib/store";
import { useShop } from "@/lib/use-shop";
import { Display } from "@/components/ui";
import { F, T } from "@/lib/theme";

const SITE = "https://sudu.store";

/**
 * What we know about you, and how to be rid of us.
 *
 * Nobody has an account here, but we do keep a record against a phone number,
 * and both app stores require a person to be able to delete that from inside
 * the app rather than by asking. So this screen says plainly what is kept,
 * links to the policy, and does the deletion in one tap and one confirmation.
 */
export default function Account() {
  const router = useRouter();
  const [saved] = useStored(me.read, { name: "", phone: "", hostel: "", token: null });
  const [here] = useStored(mine.read, []);
  const shop = useShop();
  const [busy, setBusy] = useState(false);

  /** This phone's push token, once it has allowed notifications at all. Null
   *  means there is nothing to offer a switch over yet. */
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<"granted" | "ask" | "denied">("ask");
  const [deals, setDeals] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const state = await pushPermission();
      if (!alive) return;
      setPermission(state);

      const token = await pushTokenIfAllowed();
      if (!alive || !token) return;
      setPushToken(token);
      try {
        const current = await api.prefs(token);
        if (alive) setDeals(current.deals);
      } catch {
        /* Not knowing means on, which is what the server would say. */
        if (alive) setDeals(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Turning it on is permission to ask, and asking is what happens.
   *
   * Sending somebody to Settings to do what they just asked for is a detour
   * around a box iOS will show for us, and it only becomes the right answer
   * once they have said no, because then the box never appears again.
   */
  const chooseDeals = async (next: boolean) => {
    if (next && !pushToken) {
      if (permission === "denied") {
        void Linking.openSettings();
        return;
      }

      const token = await enablePush(saved.token);
      if (!token) {
        setPermission(await pushPermission());
        Alert.alert(
          "Not switched on",
          "This phone did not allow notifications. You can turn them on in Settings."
        );
        return;
      }
      setPushToken(token);
      setPermission("granted");
    }

    setDeals(next);
    const token = pushToken ?? (await pushTokenIfAllowed());
    if (!token) return;
    try {
      await api.setPrefs(token, next);
    } catch {
      // Put the switch back rather than leave it lying about what we will send.
      setDeals(!next);
      Alert.alert("Could not save that", "Check your connection and try again.");
    }
  };

  const forget = async () => {
    if (!saved.token) return;
    setBusy(true);
    try {
      await api.deleteMe(saved.token);
      await Promise.all([me.save({ name: "", phone: "", hostel: "", token: null }), cart.clear(), people.clear()]);
      Alert.alert(
        "Deleted",
        "Your name, number, block and PIN are gone, along with anything left in this app."
      );
      router.replace("/");
    } catch (problem) {
      Alert.alert(
        "Not deleted",
        problem instanceof Error ? problem.message : "Something went wrong. Message us."
      );
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    Alert.alert(
      "Delete everything about you?",
      "Your name, number, block and PIN go for good, and so does your order " +
        "history in this app. This cannot be undone.",
      [
        { text: "Keep it", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void forget() },
      ]
    );

  const signOut = async () => {
    await me.save({ token: null });
    await mine.clear();
    Alert.alert("Signed out", "This phone no longer shows those orders.");
    router.replace("/");
  };

  const help = shop?.shop.whatsapp ?? "";
  const version = String(Constants.expoConfig?.version ?? "");

  return (
    <ScrollView
      style={{ backgroundColor: T.shell }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
    >
      {/* Who the shop has you down as. No account, no password: the number
          is the name, which is why it is set in the ticket face beside it. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          backgroundColor: T.ink,
          borderRadius: 18,
          padding: 16,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            backgroundColor: T.brand,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Display size={30} colour={T.paper}>
            {(saved.name || saved.phone || "?").slice(0, 1)}
          </Display>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 18, color: T.shell }}>
            {saved.name || "Not ordered yet"}
          </Text>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: T.onInkMuted }}>
            {saved.phone === "" ? "NO NUMBER ON THIS PHONE" : saved.phone}
            {saved.hostel === "" ? "" : ` · ${saved.hostel.toUpperCase()}`}
          </Text>
        </View>
      </View>

      {/* Two facts rather than three: a figure for what splitting has saved
          would have to be invented, and a made-up number on somebody's own
          page is worse than a gap. */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat value={String(here.length)} label="orders on this phone" />
        <Stat value={saved.hostel || "Not set"} label="your block" />
      </View>

      {/* Always here, even before this phone can be notified at all. A
          setting that only appears once it is already relevant is a setting
          nobody finds, and somebody looking for it and seeing nothing decides
          the app has none. */}
      <Section>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            minHeight: 56,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: T.line,
          }}
        >
          <Ionicons name="notifications-outline" size={22} color={T.brand} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: T.ink }}>
              Deals and offers
            </Text>
            <Text style={{ fontFamily: F.body, fontSize: 12, color: T.muted, marginTop: 1 }}>
              New deals, cheaper delivery, discount codes
            </Text>
          </View>
          {/* Live whatever the phone has agreed to so far: turning it on is
              what asks. Only a flat no leaves nothing for a tap to do here. */}
          <Switch
            value={deals && pushToken !== null}
            onValueChange={chooseDeals}
            disabled={permission === "denied" && pushToken === null}
            trackColor={{ true: T.mint }}
            accessibilityLabel="Deals and offers"
          />
        </View>

        <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: T.muted, lineHeight: 19 }}>
            {pushToken === null && permission === "denied"
              ? "This phone has notifications switched off for Sudu, and iOS only asks once. Tap below to turn them on in Settings."
              : pushToken === null
                ? "Turn this on and we will ask this phone for permission. You do not have to have ordered anything: a deal is worth hearing about before a first order, not after it."
                : "News about an order stays on either way: where your food is, and when it has arrived, is not something to have to remember to switch back on."}
          </Text>
          {pushToken === null && permission === "denied" && (
            <Pressable onPress={() => void Linking.openSettings()} style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.brand }}>
                Turn them on in Settings
              </Text>
            </Pressable>
          )}
        </View>
      </Section>

      <Section>
        {help !== "" && (
          <Line
            icon="logo-whatsapp"
            label="Help on WhatsApp"
            note={help}
            onPress={() => Linking.openURL(`https://wa.me/${help.replace(/[^0-9]/g, "")}`)}
          />
        )}
        <Line
          icon="people-outline"
          label="Group orders"
          note="Start or join a run"
          onPress={() => router.push("/group")}
        />
        <Line
          icon="document-text-outline"
          label="What we keep about you"
          note="Name, number, block, PIN, and what you ordered"
          onPress={() => Linking.openURL(`${SITE}/privacy`)}
        />
        <Line
          icon="document-text-outline"
          label="Terms"
          onPress={() => Linking.openURL(`${SITE}/terms`)}
        />
        <Line
          icon="document-text-outline"
          label="Returns and refunds"
          onPress={() => Linking.openURL(`${SITE}/return-policy`)}
        />
        <Line
          icon="help-buoy-outline"
          label="Get help with an order"
          onPress={() => Linking.openURL(`${SITE}/support`)}
          last
        />
      </Section>

      <Section>
        {saved.token && (
          <Line icon="log-out-outline" label="Sign out of this phone" onPress={() => void signOut()} />
        )}
        <Line
          icon="trash-outline"
          label={busy ? "Deleting…" : "Delete my data"}
          note={
            saved.token
              ? "Removes your name, number, block and PIN"
              : "Sign in on My orders first, so we know whose record to delete"
          }
          onPress={saved.token && !busy ? confirm : undefined}
          tone="danger"
          last
        />
      </Section>

      <Text
        style={{
          fontFamily: F.mono,
          fontSize: 11,
          color: T.muted,
          textAlign: "center",
          letterSpacing: 1,
        }}
      >
        SUDU · 速度{version === "" ? "" : ` · VERSION ${version}`}
      </Text>
    </ScrollView>
  );
}

/** One number worth knowing, in a drawn tile. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: T.paper,
        borderWidth: 2,
        borderColor: T.ink,
        borderRadius: 14,
        padding: 10,
        gap: 2,
      }}
    >
      <Display size={28} style={{ lineHeight: 28 }}>
        {value}
      </Display>
      <Text style={{ fontFamily: F.body, fontSize: 12, color: T.muted }}>{label}</Text>
    </View>
  );
}

/** A drawn card that holds a list of rows, clipped so they meet its edge. */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: T.paper,
        borderWidth: 2,
        borderColor: T.ink,
        borderRadius: T.radius,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

/** A row in one of those cards: an icon, a label, and a way onward. */
function Line({
  icon,
  label,
  note,
  onPress,
  tone = "plain",
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  note?: string;
  onPress?: () => void;
  /** "danger" for the one row that destroys something. */
  tone?: "plain" | "danger";
  last?: boolean;
}) {
  const colour = tone === "danger" ? T.brandDark : T.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 56,
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: onPress === undefined ? 0.5 : 1,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: T.line,
      }}
    >
      <Ionicons name={icon} size={22} color={tone === "danger" ? T.brandDark : T.brand} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: colour }}>{label}</Text>
        {note !== undefined && note !== "" && (
          <Text style={{ fontFamily: F.body, fontSize: 12, color: T.muted, marginTop: 1 }}>
            {note}
          </Text>
        )}
      </View>
      {onPress !== undefined && <Ionicons name="chevron-forward" size={18} color={T.muted} />}
    </Pressable>
  );
}
