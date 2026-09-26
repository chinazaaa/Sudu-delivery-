import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, feeFor, naira, type Shelf } from "@/lib/api";
import { me, shelf as basket, shelfTotal, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * Paying for skincare.
 *
 * The same three questions as any other order, because it is the same order
 * underneath: who you are, where it goes, how you are paying. What this
 * screen has to say plainly is the one thing that is different, which is
 * that it comes on Saturday and not today.
 */
export default function SkincareCheckout() {
  const router = useRouter();
  const [lines, refresh] = useStored(basket.read, []);
  const [saved] = useStored(me.read, { name: "", phone: "", hostel: "", token: null });
  const [data, setData] = useState<Shelf | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  // Where it goes: a block on campus, or an address anywhere in Lagos. Only
  // skincare asks this. Food is fetched hot and driven straight over, so it
  // goes to PAU and nowhere else; a parcel on a weekly car can go to a house
  // without the day being any different.
  const [inPau, setInPau] = useState(true);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [heard, setHeard] = useState("");
  const [money, setMoney] = useState("");
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api
      .shelf()
      .then(setData)
      .catch((problem: unknown) =>
        setError(problem instanceof Error ? problem.message : "Could not reach the shelf.")
      );
  }, []);

  useEffect(() => {
    setName((was) => was || saved.name);
    setPhone((was) => was || saved.phone);
    setHostel((was) => was || saved.hostel);
  }, [saved.name, saved.phone, saved.hostel]);

  const items = lines.reduce((sum, one) => sum + one.qty, 0);
  const food = shelfTotal(lines);
  const fee = feeFor(items, data?.bands ?? [], null);
  const hostels = data?.hostels ?? [];
  const goesTo = inPau ? hostel : address;

  const place = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await api.placeShelf({
        lines: lines.map((one) => ({ id: one.id, qty: one.qty })),
        name,
        phone,
        hostel: goesTo,
        note,
        heardFrom: heard,
        payCurrency: method === "card" ? money : "",
        paymentMethod: method,
      });
      await me.save({ name, phone, hostel: inPau ? hostel : saved.hostel, token: result.token });
      // Emptied only once there is an order to show for it: a basket cleared
      // by a failed payment is somebody's evening gone.
      await basket.clear();
      refresh();
      router.replace(`/o/${result.orderId}`);
    } catch (problem: unknown) {
      setError(problem instanceof Error ? problem.message : "Could not place that order.");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  if (lines.length === 0) {
    return (
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontWeight: "800", fontSize: 17, color: T.ink }}>
          Nothing in the basket
        </Text>
        <Pressable onPress={() => router.replace("/skincare")}>
          <Text style={{ color: T.brand, fontWeight: "700" }}>Back to the shelf</Text>
        </Pressable>
      </View>
    );
  }

  const ready = name.trim().length > 1 && phone.trim().length > 6 &&
    (inPau ? hostel.trim() !== "" : address.trim().length >= 8);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}>
      <View style={card()}>
        <Text style={{ fontWeight: "800", color: T.ink }}>When it arrives</Text>
        <Text style={{ fontWeight: "800", fontSize: 17, color: T.ink, marginTop: 2 }}>
          {data.when}
        </Text>
        <Text style={{ color: T.muted, marginTop: 4 }}>
          {data.window ? `${data.window}. ` : ""}One car a week. Orders for it
          close at {data.cutOff} that morning, and anything after goes on the
          next one.
        </Text>
      </View>

      <View style={card()}>
        <Text style={{ fontWeight: "800", color: T.ink }}>What you are getting</Text>
        <Text style={{ color: T.muted, marginTop: 2 }}>{data.promise}</Text>

        {lines.map((line) => (
          <View
            key={line.id}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}
          >
            <View
              style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", backgroundColor: T.shell }}
            >
              {line.imageUrl !== "" && (
                <Image source={{ uri: line.imageUrl }} style={{ width: "100%", height: "100%" }} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.ink, fontWeight: "600" }} numberOfLines={2}>
                {line.name}
              </Text>
              <Text style={{ color: T.muted, fontSize: 12 }}>
                {line.brand !== "" ? `${line.brand} · ` : ""}
                {naira(line.price)}
              </Text>
            </View>
            <Pressable onPress={() => void basket.setQty(line.id, line.qty - 1)} hitSlop={8}>
              <Ionicons name="remove-circle-outline" size={24} color={T.ink} />
            </Pressable>
            <Text style={{ fontWeight: "800", color: T.ink, minWidth: 18, textAlign: "center" }}>
              {line.qty}
            </Text>
            <Pressable onPress={() => void basket.setQty(line.id, line.qty + 1)} hitSlop={8}>
              <Ionicons name="add-circle" size={24} color={T.brand} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={card()}>
        <Text style={{ fontWeight: "800", color: T.ink, marginBottom: 8 }}>Where it goes</Text>

        <Field value={name} onChangeText={setName} placeholder="John Doe" />
        <Field value={phone} onChangeText={setPhone} placeholder="0803 123 4567" keyboardType="phone-pad" />

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {[
            { at: true, label: "I am at PAU" },
            { at: false, label: "Elsewhere in Lagos" },
          ].map((one) => (
            <Pressable
              key={one.label}
              onPress={() => setInPau(one.at)}
              style={{
                flex: 1,
                alignItems: "center",
                borderWidth: 1,
                borderRadius: 12,
                paddingVertical: 10,
                borderColor: inPau === one.at ? T.ink : T.line,
                backgroundColor: inPau === one.at ? T.ink : T.paper,
              }}
            >
              <Text style={{ fontWeight: "700", color: inPau === one.at ? T.paper : T.ink }}>
                {one.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {inPau ? (
          hostels.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {hostels.map((one) => (
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
          )
        ) : (
          <>
            <Field
              value={address}
              onChangeText={setAddress}
              placeholder="Street, area, and anything the driver needs"
              multiline
            />
            <Text style={{ color: T.muted, fontSize: 12 }}>
              Anywhere in Lagos. Outside Lagos we cannot bring it, and we would
              rather say so now than take your money and ring you on Saturday.
            </Text>
          </>
        )}

        <Field value={note} onChangeText={setNote} placeholder="Anything we should know? (optional)" />

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
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
      </View>

      {/* The question that pays somebody, and the money a card link is made
          out in. Both were on the website and missing here, so every order
          the app took counted for nobody. */}
      {(data?.promoters ?? []).length > 0 && (
        <View style={card()}>
          <Text style={{ color: T.muted, fontSize: 12 }}>
            Where did you hear about us?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {[{ code: "", name: "Somewhere else" }, ...(data?.promoters ?? [])].map(
              (one) => (
                <Pressable
                  key={one.code || "nobody"}
                  onPress={() => setHeard(one.code)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: heard === one.code ? T.brand : T.line,
                    backgroundColor: heard === one.code ? T.tint : T.paper,
                  }}
                >
                  <Text style={{ color: T.ink, fontWeight: "600" }}>{one.name}</Text>
                </Pressable>
              )
            )}
          </View>
        </View>
      )}

      {method === "card" && (data?.monies ?? []).length > 0 && (
        <View style={card()}>
          <Text style={{ color: T.muted, fontSize: 12 }}>
            Is somebody abroad paying? We send a card link in their money.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {[{ code: "", label: "No, naira" }, ...(data?.monies ?? [])].map((one) => (
              <Pressable
                key={one.code || "naira"}
                onPress={() => setMoney(one.code)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: money === one.code ? T.brand : T.line,
                  backgroundColor: money === one.code ? T.tint : T.paper,
                }}
              >
                <Text style={{ color: T.ink, fontWeight: "600" }}>{one.label}</Text>
                {/* What the link will actually say. A chip reading "Pounds"
                    and nothing else leaves whoever is paying with no idea
                    what they are about to be asked for. */}
                {"rate" in one && one.rate > 0 && (
                  <Text style={{ color: T.muted, fontSize: 12 }}>
                    about {one.symbol}
                    {(Math.ceil(((food + fee) / one.rate) * 10) / 10).toFixed(2)}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={card()}>
        <Row label="What you picked" value={naira(food)} />
        <Row label="Delivery" value={fee === 0 ? "Free" : naira(fee)} />
        <View style={{ height: 1, backgroundColor: T.line, marginVertical: 8 }} />
        <Row label="Total" value={naira(food + fee)} bold />
        <Text style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
          One fee for the whole basket. It is the car, not the cream, so it
          goes by how much room your order takes.
        </Text>
      </View>

      {error !== "" && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>
      )}

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
          {busy ? "Placing…" : `Place order · ${naira(food + fee)}`}
        </Text>
      </Pressable>
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
