import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, naira, type LinkView } from "@/lib/api";
import { me, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * Ordering off a link somebody sent.
 *
 * Everything that can be decided already has been: the food, the car, the
 * price. What is left is who they are, where it goes and how they are paying,
 * which is the least anybody can be asked and still get dinner.
 *
 * It is its own basket and it never touches the cart. Adding something to the
 * cart afterwards does not change the link, and ordering off the link does
 * not empty the cart: two different things that happen to be about food.
 */
export default function LinkScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [saved] = useStored(me.read, { name: "", phone: "", hostel: "", token: null });

  const [view, setView] = useState<LinkView | null>(null);
  const [gone, setGone] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  /** Which of them they are having. Nought is the basket the link came with. */
  const [having, setHaving] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    void api
      .link(String(code))
      .then(setView)
      .catch((problem: unknown) =>
        setGone(problem instanceof Error ? problem.message : "Could not read that link.")
      );
  }, [code]);

  useEffect(() => {
    setName((was) => was || saved.name);
    setPhone((was) => was || saved.phone);
    setHostel((was) => was || saved.hostel);
  }, [saved.name, saved.phone, saved.hostel]);

  if (gone !== "") {
    return (
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontWeight: "800", fontSize: 17, color: T.ink }}>{gone}</Text>
        <Text style={{ color: T.muted }}>
          Nothing was charged. The same food is on the menu.
        </Text>
        <Pressable onPress={() => router.replace("/(tabs)")}>
          <Text style={{ color: T.brand, fontWeight: "700" }}>See what is on</Text>
        </Pressable>
      </View>
    );
  }

  if (!view) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  // What they are having, and what it costs. A swap is the same money or
  // less, so this only ever falls, and every figure follows it.
  const chosen = view.instead.find((one) => one.index + 1 === having) ?? null;
  const food = having === 0 ? view.food : (chosen?.food ?? view.food);
  const items =
    having === 0
      ? view.lines.reduce((sum, line) => sum + line.qty, 0)
      : (chosen?.items ?? 1);

  const place = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await api.placeLink(view.code, {
        name,
        phone,
        hostel,
        note,
        paymentMethod: method,
        // Nought is what the link came with; anything else is one of the
        // swaps, which the server checks for itself.
        instead: having,
      });
      await me.save({ name, phone, hostel, token: result.token });
      // The cart is left exactly as it is. A link is its own basket and has
      // nothing to do with whatever they are collecting for the next run.
      router.replace(`/o/${result.orderId}`);
    } catch (problem: unknown) {
      setError(problem instanceof Error ? problem.message : "Could not place that order.");
    } finally {
      setBusy(false);
    }
  };

  const ready = name.trim().length > 1 && phone.trim().length > 6 && hostel.trim() !== "";

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}>
      <View style={card()}>
        <Text style={{ color: T.brandDark, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 }}>
          {view.title.toUpperCase()}
        </Text>
        <Text style={{ fontWeight: "800", fontSize: 22, color: T.ink, marginTop: 2 }}>
          {items} item{items === 1 ? "" : "s"} · {naira(food)}
        </Text>
        {view.when !== "" && <Text style={{ color: T.ink, marginTop: 4 }}>{view.when}</Text>}
        <Text style={{ color: T.muted, marginTop: 2 }}>{view.estimate}</Text>
        {view.note !== "" && <Text style={{ color: T.muted, marginTop: 6 }}>{view.note}</Text>}
      </View>

      <View style={card()}>
        <Text style={{ fontWeight: "800", color: T.ink, marginBottom: 8 }}>
          What you are getting
        </Text>

        {view.instead.length > 0 ? (
          <View style={{ gap: 8 }}>
            {[
              {
                index: 0,
                name: view.lines.map((line) => `${line.qty}× ${line.name}`).join(", "),
                restaurant: view.lines[0]?.restaurant ?? "",
                choices: view.lines.flatMap((line) => line.choices),
                food: view.food,
              },
              ...view.instead.map((one) => ({ ...one, index: one.index + 1 })),
            ].map((one) => {
              const on = having === one.index;
              return (
                <Pressable
                  key={one.index}
                  onPress={() => setHaving(one.index)}
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    borderColor: on ? T.brand : T.line,
                    backgroundColor: on ? T.tint : T.paper,
                  }}
                >
                  <Ionicons
                    name={on ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={on ? T.brand : T.line}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: T.ink, fontWeight: "700" }}>{one.name}</Text>
                    <Text style={{ color: T.muted, fontSize: 12 }}>
                      {[one.restaurant, ...one.choices].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <Text style={{ color: T.ink, fontWeight: "800" }}>{naira(one.food)}</Text>
                </Pressable>
              );
            })}
            <Text style={{ color: T.muted, fontSize: 12 }}>
              {view.instead.every((one) => one.food === view.food)
                ? "Whichever you pick, it is the same money."
                : "Nothing here costs more than what the link came with."}
            </Text>
          </View>
        ) : (
          view.lines.map((line, index) => (
            <View
              key={`${line.name}-${index}`}
              style={{ flexDirection: "row", gap: 10, paddingVertical: 6 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: T.ink, fontWeight: "700" }}>
                  {line.qty}× {line.name}
                </Text>
                <Text style={{ color: T.muted, fontSize: 12 }}>
                  {[line.restaurant, ...line.choices].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <Text style={{ color: T.ink, fontWeight: "800" }}>{naira(line.total)}</Text>
            </View>
          ))
        )}

        <View style={{ height: 1, backgroundColor: T.line, marginVertical: 10 }} />
        <Row label="Food" value={naira(food)} />
        <Row
          label="Delivery"
          value={view.fee === null ? "worked out on the order" : naira(view.fee)}
        />
        <Row
          label="Total"
          value={view.fee === null ? `${naira(food)} + delivery` : naira(food + view.fee)}
          bold
        />
      </View>

      <View style={card()}>
        <Text style={{ fontWeight: "800", color: T.ink }}>Where does it go?</Text>

        <Field value={name} onChangeText={setName} placeholder="John Doe" />
        <Field value={phone} onChangeText={setPhone} placeholder="0803 123 4567" keyboardType="phone-pad" />

        {view.hostels.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {view.hostels.map((one) => (
                <Pressable
                  key={one}
                  onPress={() => setHostel(one)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: hostel === one ? T.brand : T.line,
                    backgroundColor: hostel === one ? T.tint : T.paper,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: T.ink, fontWeight: hostel === one ? "800" : "400" }}>
                    {one}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Field value={hostel} onChangeText={setHostel} placeholder="Your hostel or block" />
        )}

        <Field
          value={note}
          onChangeText={setNote}
          placeholder={
            view.swaps.length > 0
              ? `Prefer ${view.swaps[0].others[0]}? Say it here`
              : "Anything we should know? (optional)"
          }
        />

        {/* Nobody asks for a change they have not been told they can have. */}
        {view.swaps.map((swap) => (
          <Text key={swap.name} style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
            {swap.chosen !== ""
              ? `${swap.name} is ${swap.chosen}. Want ${swap.others.join(" or ")} instead? It costs the same, so say so in the note.`
              : `${swap.name} is yours to pick: ${swap.others.join(" or ")}, same price either way.`}
          </Text>
        ))}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {(
            [
              ["transfer", "Bank transfer"],
              ["card", "Card link"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setMethod(value)}
              style={{
                flex: 1,
                alignItems: "center",
                borderWidth: 1,
                borderRadius: 12,
                paddingVertical: 10,
                borderColor: method === value ? T.brand : T.line,
                backgroundColor: method === value ? T.tint : T.paper,
              }}
            >
              <Text style={{ fontWeight: "700", color: T.ink }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {method === "card" && view.hasCardLink && (
          <Text style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
            The card link is on your order the moment you place it.
          </Text>
        )}
      </View>

      {error !== "" && <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>}

      <Pressable
        onPress={place}
        disabled={busy || !ready}
        style={{
          backgroundColor: busy || !ready ? T.line : T.brand,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: T.paper, fontWeight: "800", fontSize: 16 }}>
          {busy ? "Placing…" : "Place my order"}
        </Text>
      </Pressable>

      {view.askUs !== "" && (
        <Pressable onPress={() => void Linking.openURL(view.askUs)} style={{ alignItems: "center" }}>
          <Text style={{ color: T.brand, fontWeight: "700" }}>Ask us to change something</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={T.muted}
      style={{
        backgroundColor: T.shell,
        borderWidth: 1,
        borderColor: T.line,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: T.ink,
        marginTop: 8,
      }}
    />
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ color: bold ? T.ink : T.muted, fontWeight: bold ? "800" : "400" }}>
        {label}
      </Text>
      <Text style={{ color: T.ink, fontWeight: bold ? "800" : "400" }}>{value}</Text>
    </View>
  );
}

function card() {
  return { backgroundColor: T.paper, borderRadius: T.radius, padding: 14 } as const;
}
