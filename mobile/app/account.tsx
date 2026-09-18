import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { cart, me, mine, people, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

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
  const [busy, setBusy] = useState(false);

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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <View style={card}>
        <Text style={heading}>
          {saved.phone ? `You order as ${saved.phone}` : "No number on this phone yet"}
        </Text>
        <Text style={body}>
          There are no accounts and no passwords here. Your number is who you are, and
          the four digit PIN we sent on WhatsApp is how you see your own orders again.
        </Text>
      </View>

      <View style={card}>
        <Text style={heading}>What we keep</Text>
        <Text style={body}>
          Your name, number and block, what you ordered and what it cost, your PIN, and
          the notification token for this phone if you allowed notifications.
        </Text>
        <Text style={[body, { marginTop: 6 }]}>
          We never see your card details or your bank login. We do not track your
          location, read your contacts, or use your camera.
        </Text>
        <Link label="Read the full privacy policy" onPress={() => Linking.openURL(`${SITE}/privacy`)} />
      </View>

      <View style={card}>
        <Text style={heading}>Delete everything about you</Text>
        <Text style={body}>
          Your name, number, block and PIN go for good. We keep the bare record of past
          sales with no name on it, because we have to account for money that changed
          hands.
        </Text>
        <Pressable
          onPress={saved.token ? confirm : undefined}
          disabled={!saved.token || busy}
          style={{
            marginTop: 10,
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: saved.token && !busy ? T.brandDark : "rgba(20,17,15,0.12)",
          }}
        >
          <Text style={{ color: saved.token && !busy ? T.paper : T.muted, fontWeight: "800" }}>
            {busy ? "Deleting…" : "Delete my data"}
          </Text>
        </Pressable>
        {!saved.token && (
          <Text style={[body, { marginTop: 8 }]}>
            Sign in on My orders first, so we know whose record to delete. A record is
            only ever deleted by the phone it belongs to.
          </Text>
        )}
      </View>

      {saved.token && (
        <Pressable onPress={signOut} style={{ paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ color: T.muted, fontWeight: "700" }}>
            Sign out of this phone instead
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingTop: 10 }}>
      <Text style={{ color: T.brand, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const card = {
  backgroundColor: T.paper,
  borderRadius: T.radius,
  padding: 16,
} as const;

const heading = { fontSize: 16, fontWeight: "800", color: T.ink } as const;
const body = { color: T.muted, marginTop: 4, lineHeight: 20 } as const;
