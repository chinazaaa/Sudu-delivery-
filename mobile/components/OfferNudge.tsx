import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Nudge } from "@/lib/api";
import { T } from "@/lib/theme";

/** Waved away for good, one key per offer. */
const SEEN = "sudu.offer.seen";
/** Put down for now. Cleared when the app is next opened from cold. */
let aside = false;

/**
 * One small card, saying what is on offer today.
 *
 * The website has shown this in the corner since automatic offers went in
 * and the app never did, so the phone was the one place somebody could be
 * sitting on a free delivery and never hear about it.
 *
 * Tapping through is not the same answer as tapping the cross. The website
 * treated them alike and somebody who was interested, went to look, and did
 * not order that minute had quietly opted out of ever being told again.
 * Here the cross is final and the offer is only put down for this sitting.
 */
export default function OfferNudge({ nudge }: { nudge: Nudge | null }) {
  const router = useRouter();
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (!nudge || aside) return;
    let alive = true;

    void (async () => {
      let seen = "";
      try {
        seen = (await AsyncStorage.getItem(SEEN)) ?? "";
      } catch {
        // Nothing to remember it with. Show it; the cross still works.
      }
      if (!alive || seen === nudge.code) return;
      // A beat after the page settles, so it reads as an offer rather than
      // as something in the way of the page loading.
      setTimeout(() => alive && setShowing(true), 1200);
    })();

    return () => {
      alive = false;
    };
  }, [nudge?.code]);

  if (!nudge || !showing) return null;

  const dismiss = () => {
    setShowing(false);
    void AsyncStorage.setItem(SEEN, nudge.code).catch(() => {});
  };

  const followed = (href: string) => {
    aside = true;
    setShowing(false);
    router.push(href as never);
  };

  return (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 24,
        backgroundColor: T.paper,
        borderRadius: T.radius,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <Text style={{ flex: 1, fontWeight: "800", fontSize: 16, color: T.ink }}>
          {nudge.badge}
          {nudge.where !== "" && (
            <Text style={{ fontWeight: "700" }}> from {nudge.where}</Text>
          )}
        </Text>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Close">
          <Text style={{ fontSize: 20, lineHeight: 20, color: T.muted }}>×</Text>
        </Pressable>
      </View>

      <Text style={{ color: T.muted, marginTop: 4, fontSize: 13 }}>{nudge.detail}</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12 }}>
        {nudge.go.slice(0, 3).map((one) => (
          <Pressable
            key={one.href}
            onPress={() => followed(one.href)}
            style={{
              backgroundColor: T.brand,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: T.paper, fontWeight: "800", fontSize: 13 }}>{one.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={dismiss} hitSlop={8}>
          <Text
            style={{
              color: T.muted,
              fontWeight: "600",
              fontSize: 13,
              textDecorationLine: "underline",
            }}
          >
            Not interested
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
