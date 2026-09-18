import { useEffect, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { api } from "@/lib/api";
import { me } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * Phone and PIN, for a phone that has not ordered from this app before.
 *
 * Somebody who ordered on the website, or who has a new phone, still has their
 * orders: they are kept against the number, not the handset. The PIN is the
 * four digits sent on WhatsApp with their first order.
 *
 * Under it is a message-us link, already written and already carrying whatever
 * number has been typed, so a lost PIN is asked for from the phone it belongs
 * to. We never hand somebody else's PIN to the person who asks for it.
 */
export default function SignIn({ onDone }: { onDone?: () => void }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    let alive = true;
    void api
      .shop()
      .then((shop) => {
        if (alive) setWhatsapp(shop.shop.whatsapp ?? "");
      })
      .catch(() => {
        /* Without the number the form still works, the link just stays away. */
      });
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await api.signIn(phone, pin);
      // Only what came back: a customer with no name on file keeps whatever
      // this phone already had rather than losing it to an empty string.
      await me.save({
        token: result.token,
        phone: result.phone,
        ...(result.name ? { name: result.name } : {}),
        ...(result.hostel ? { hostel: result.hostel } : {}),
      });
      onDone?.();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  };

  const ask = () => {
    const typed = phone.trim();
    const text =
      "Hi, I cannot find my Sudu PIN." +
      (typed ? ` My number is ${typed}.` : "") +
      " Please send it to me.";
    void Linking.openURL(
      `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`
    );
  };

  return (
    <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: "800", color: T.ink }}>
        Ordered with us before?
      </Text>
      <Text style={{ color: T.muted }}>
        Your orders live against your number. Sign in with your PIN to see them here.
      </Text>

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="0803 123 4567"
        placeholderTextColor={T.muted}
        keyboardType="phone-pad"
        style={field}
      />
      <TextInput
        value={pin}
        onChangeText={setPin}
        placeholder="4 digit PIN"
        placeholderTextColor={T.muted}
        keyboardType="number-pad"
        maxLength={4}
        style={field}
      />

      {error !== "" && <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>}

      <Pressable
        onPress={submit}
        disabled={busy}
        style={{
          backgroundColor: busy ? T.muted : T.brand,
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: T.paper, fontWeight: "800" }}>
          {busy ? "Checking…" : "See my orders"}
        </Text>
      </Pressable>

      {whatsapp !== "" && (
        <Pressable onPress={ask} style={{ paddingVertical: 6, alignItems: "center" }}>
          <Text style={{ color: T.brand, fontWeight: "700" }}>
            Do not have your PIN? Message us
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const field = {
  backgroundColor: T.shell,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: T.ink,
} as const;
