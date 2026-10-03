import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { me, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * "We have not got it. Shall we go and find it?"
 *
 * The website has had this since the beginning and the app never did, so a
 * search that found nothing was the end of the road on a phone: the one
 * moment somebody has told us exactly what they want, in their own words,
 * and been told we have not got it.
 *
 * Whatever they searched for arrives as the first line, because retyping it
 * is the quickest way to make somebody give up.
 */
export default function AskScreen() {
  const router = useRouter();
  const asked = useLocalSearchParams<{ q?: string }>();
  const [saved] = useStored(me.read, { name: "", phone: "", hostel: "", token: null });

  const [wanted, setWanted] = useState(String(asked.q ?? ""));
  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Filled in from the last order on this phone, which is as close to an
  // account as anybody here needs. Only where they have not typed over it.
  const theName = name || saved.name;
  const thePhone = phone || saved.phone;
  const theHostel = hostel || saved.hostel;

  async function send() {
    setError("");
    setBusy(true);
    try {
      await api.ask({
        wanted,
        budget,
        name: theName,
        phone: thePhone,
        hostel: theHostel,
        note,
      });
      await me.save({ name: theName, phone: thePhone, hostel: theHostel });
      setSent(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <>
        <Stack.Screen options={{ title: "Asked" }} />
        <View style={{ flex: 1, backgroundColor: T.shell, padding: 16, gap: 12 }}>
          <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: T.ink }}>
              We are on it
            </Text>
            <Text style={{ color: T.muted, lineHeight: 21 }}>
              We will find it, price it, and message you on WhatsApp with what
              it comes to. Nothing is owed until you say yes.
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: T.brand,
              borderRadius: 999,
              paddingVertical: 15,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Back to the menu
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  const ready = wanted.trim().length >= 4 && theName.trim() !== "" && thePhone.trim() !== "";

  return (
    <>
      <Stack.Screen options={{ title: "Ask us to get it" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: T.shell }}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: T.muted, lineHeight: 21 }}>
            Anything from Sangotedo or the market. Tell us what you are looking
            for and we will find it, price it, and bring it to your block.
          </Text>

          <Field label="What are you looking for">
            <TextInput
              value={wanted}
              onChangeText={setWanted}
              placeholder="A 32 in 1 pack of sanitary pads"
              placeholderTextColor={T.muted}
              multiline
              style={[box, { minHeight: 76, textAlignVertical: "top" }]}
            />
          </Field>

          <Field label="What would you pay for it">
            <TextInput
              value={budget}
              onChangeText={setBudget}
              placeholder="Roughly, so we know what to look at"
              placeholderTextColor={T.muted}
              style={box}
            />
          </Field>

          <Field label="Your name">
            <TextInput
              value={theName}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={T.muted}
              style={box}
            />
          </Field>

          <Field label="Your number">
            <TextInput
              value={thePhone}
              onChangeText={setPhone}
              placeholder="0803 000 0000"
              placeholderTextColor={T.muted}
              keyboardType="phone-pad"
              style={box}
            />
          </Field>

          <Field label="Your block">
            <TextInput
              value={theHostel}
              onChangeText={setHostel}
              placeholder="Queen Mary, or wherever it goes"
              placeholderTextColor={T.muted}
              style={box}
            />
          </Field>

          <Field label="Anything else">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="When you need it by, a brand, a size"
              placeholderTextColor={T.muted}
              multiline
              style={[box, { minHeight: 64, textAlignVertical: "top" }]}
            />
          </Field>

          {error !== "" && (
            <Text style={{ color: T.brand, fontWeight: "700" }}>{error}</Text>
          )}

          <Pressable
            disabled={!ready || busy}
            onPress={send}
            style={{
              backgroundColor: ready && !busy ? T.brand : T.line,
              borderRadius: 999,
              paddingVertical: 15,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              {busy ? "Sending…" : "Ask us to get it"}
            </Text>
          </Pressable>

          <Text style={{ color: T.muted, fontSize: 12, lineHeight: 18 }}>
            Nothing is charged now. We message you on WhatsApp with what it
            comes to, and you decide then.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const box = {
  backgroundColor: T.paper,
  borderRadius: T.radius,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: T.ink,
} as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700", color: T.ink }}>{label}</Text>
      {children}
    </View>
  );
}
