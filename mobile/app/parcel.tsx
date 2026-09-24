import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, naira, type ParcelSetup } from "@/lib/api";
import { me, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * Sending something that is not food.
 *
 * One end of every route is campus, where a block is the whole address
 * anybody needs. The other end is a real one, and which end that is depends
 * on the route, so the two address questions swap as soon as a route is
 * picked rather than asking for both and hoping.
 *
 * The price comes at the end, once the route and the weight are known,
 * because those two are the price.
 */
export default function Parcel() {
  const router = useRouter();
  const [saved] = useStored(me.read, { name: "", phone: "", hostel: "", token: null });
  const [setup, setSetup] = useState<ParcelSetup | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const [routeId, setRouteId] = useState("");
  const [kg, setKg] = useState(0);
  // Today, as the website's date box does it. A day is always chosen, so
  // nobody sends a parcel request that says nothing about when they want it.
  const [wantedOn, setWantedOn] = useState(() => nextDays()[0].value);
  const [item, setItem] = useState("");
  const [shop, setShop] = useState("");
  const [address, setAddress] = useState("");
  const [hostel, setHostel] = useState("");
  const [room, setRoom] = useState("");
  const [worth, setWorth] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [toName, setToName] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    api
      .parcels()
      .then((data) => {
        setSetup(data);
        setRouteId(data.routes[0]?.id ?? "");
        setKg(data.routes[0]?.bands[0]?.upTo ?? 0);
        setWantedOn(data.today);
      })
      .catch((problem: Error) => setError(problem.message));
  }, []);

  useEffect(() => {
    if (saved.name !== "") setName((now) => now || saved.name);
    if (saved.phone !== "") setPhone((now) => now || saved.phone);
    if (saved.hostel !== "") setHostel((now) => now || saved.hostel);
  }, [saved]);

  const route = setup?.routes.find((one) => one.id === routeId) ?? null;
  const toPau = route?.toPau ?? true;
  const bands = route?.bands ?? [];
  // The bands change with the route, so the weight picked may not exist on
  // the new one.
  const picked = bands.some((one) => one.upTo === kg) ? kg : bands[0]?.upTo ?? 0;
  const fee = useMemo(
    () => bands.find((one) => picked <= one.upTo)?.fee ?? null,
    [bands, picked]
  );

  const value = Number(worth.replace(/[^\d]/g, "")) || 0;
  const tooDear = setup !== null && value > setup.maxValue;
  // Half a recipient is worse than none: a name with no number is a bag at a
  // gate with nobody to call.
  const goodNumber = /^0[789]\d{9}$/.test(
    toPhone.replace(/[^\d+]/g, "").replace(/^\+?234/, "0")
  );
  const halfRecipient =
    (toName.trim() !== "" || toPhone.trim() !== "") &&
    (toName.trim() === "" || !goodNumber);

  const send = async () => {
    if (!route || fee === null) return;
    setSending(true);
    setError("");
    try {
      const { orderId } = await api.sendParcel({
        route: route.id,
        kg: picked,
        wantedOn,
        item,
        shop,
        address,
        hostel,
        room,
        value: worth,
        name,
        phone,
        toName,
        toPhone,
        heardFrom,
        note,
        paymentMethod: "transfer",
      });
      await me.save({ name, phone, hostel });
      router.replace(`/order/${orderId}` as never);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (error !== "" && setup === null) {
    return (
      <View style={{ flex: 1, backgroundColor: T.shell, padding: 16 }}>
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>
      </View>
    );
  }

  if (setup === null) {
    return (
      <View style={{ flex: 1, backgroundColor: T.shell, justifyContent: "center" }}>
        <ActivityIndicator color={T.brand} />
      </View>
    );
  }

  if (!setup.on || setup.routes.length === 0) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: T.shell }} contentContainerStyle={{ padding: 16 }}>
        <View style={card()}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: T.ink }}>Parcels</Text>
          <Text style={{ color: T.muted, marginTop: 4 }}>
            We are not carrying parcels just now.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.shell }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={T.ink} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800", color: T.ink }}>Send a parcel</Text>
      </View>

      <View style={card()}>
        <Text style={{ color: T.muted }}>
          {setup.blurb ||
            "Something collected and brought to campus, or taken from campus to where it needs to be. It travels on its own trip, so you tell us where and we agree the day."}
        </Text>
      </View>

      {/* Said before the form rather than under it. Every line is one of the
          ways this goes wrong, and somebody who reads it afterwards has
          already agreed to it. */}
      <View style={card()}>
        <Text style={{ fontWeight: "800", color: T.ink }}>Before you send it</Text>
        {setup.terms.map((line) => (
          <Text key={line} style={{ color: T.muted, marginTop: 6 }}>
            • {line}
          </Text>
        ))}
      </View>

      <View style={[card(), { gap: 12 }]}>
        <Label text="Where is it going?" />
        <Choices
          options={setup.routes.map((one) => ({ value: one.id, label: one.label }))}
          value={routeId}
          onPick={setRouteId}
        />

        <Label text="When would you like it?" />
        {/* Days to tap, not a date to type.
            It was a plain box wanting 2026-09-26, and the column behind it
            is a real date: anything else was thrown away without a word, so
            somebody who wrote "next week thurs" told us nothing at all.
            Lagos days, worked out here rather than from the phone's own
            idea of midnight. */}
        <Choices options={nextDays()} value={wantedOn} onPick={setWantedOn} />
        <Text style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
          We will tell you on WhatsApp whether that day works. If it does not,
          we will agree another one with you before anything moves.
        </Text>

        <Label text="About how heavy is it?" />
        <Choices
          options={bands.map((one, index) => ({
            value: String(one.upTo),
            label:
              index === 0
                ? `Up to ${one.upTo}kg`
                : `${bands[index - 1].upTo}kg to ${one.upTo}kg`,
          }))}
          value={String(picked)}
          onPick={(next) => setKg(Number(next))}
        />

        <Label text="What are we carrying?" />
        <Field value={item} onChangeText={setItem} placeholder="A dress in a paper bag" />

        <Label
          text={toPau ? "Which shop or person are we collecting from?" : "Who is it going to?"}
        />
        <Field
          value={shop}
          onChangeText={setShop}
          placeholder={toPau ? "Bella's Boutique" : "My sister, Ada"}
        />

        <Label
          text={
            toPau ? "The address we are collecting from" : "The address we are delivering to"
          }
        />
        <Field
          value={address}
          onChangeText={setAddress}
          multiline
          placeholder="Street, area, and anything that helps us find it"
        />

        <Label
          text={toPau ? "Which block are we bringing it to?" : "Which block are we collecting from?"}
        />
        {setup.hostels.length > 0 ? (
          <Choices
            options={setup.hostels.map((one) => ({ value: one, label: one }))}
            value={hostel}
            onPick={setHostel}
          />
        ) : (
          <Field value={hostel} onChangeText={setHostel} placeholder="Ikoyi Hall" />
        )}

        <Label text="Room or landmark" />
        <Field value={room} onChangeText={setRoom} placeholder="Room 12, or the porter's desk" />

        <Label text="Roughly what is it worth?" />
        <Field
          value={worth}
          onChangeText={(next) => setWorth(next.replace(/[^\d]/g, ""))}
          keyboardType="number-pad"
          placeholder="15000"
        />
        <Text
          style={{
            color: tooDear ? T.brandDark : T.muted,
            fontSize: 12,
            marginTop: 6,
            fontWeight: tooDear ? "700" : "400",
          }}
        >
          {tooDear
            ? `${naira(value)} is over the ${naira(setup.maxValue)} limit, so we cannot carry it. Message us and we will talk it through.`
            : `Nothing over ${naira(setup.maxValue)}, and no phones, laptops, jewellery or cash. If it is lost or damaged in the car it is on us, which is why there is a limit.`}
        </Text>
      </View>

      <View style={[card(), { gap: 12 }]}>
        <Text style={{ fontWeight: "800", color: T.ink }}>You</Text>
        <Label text="Your name" />
        <Field value={name} onChangeText={setName} />
        <Label text="Your number" />
        <Field
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="0803 123 4567"
        />

        <Label text="Who receives it? (if not you)" />
        <Field value={toName} onChangeText={setToName} />
        <Label text="Their number" />
        <Field
          value={toPhone}
          onChangeText={setToPhone}
          keyboardType="phone-pad"
          placeholder="0803 123 4567"
        />
        <Text
          style={{
            color: halfRecipient ? T.brandDark : T.muted,
            fontSize: 12,
            fontWeight: halfRecipient ? "700" : "400",
          }}
        >
          {halfRecipient
            ? "For somebody else we need both their name and a number that works: eleven digits, starting 070, 080, 081, 090 or 091."
            : "Leave both empty and it comes to you."}
        </Text>

        {setup.promoters.length > 0 && (
          <>
            <Label text="Where did you hear about us?" />
            <Choices
              options={[
                { value: "", label: "Somewhere else" },
                ...setup.promoters.map((one) => ({ value: one.code, label: one.name })),
              ]}
              value={heardFrom}
              onPick={setHeardFrom}
            />
          </>
        )}

        <Label text="Anything else we should know?" />
        <Field value={note} onChangeText={setNote} multiline />
      </View>

      {/* The price at the end, once they have said what it is and how far it
          is going. Those two are the price. */}
      {route && fee !== null && (
        <View style={card()}>
          <Row label={route.label} value={`up to ${picked}kg`} />
          <View style={{ height: 1, backgroundColor: T.line, marginVertical: 8 }} />
          <Row label="Delivery" value={naira(fee)} bold />
          <Text style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
            One trip, yours alone. Nothing is bought on your behalf, so this is
            the whole of it.
          </Text>
        </View>
      )}

      {error !== "" && (
        <View style={[card(), { backgroundColor: "#fdecec" }]}>
          <Text style={{ color: "#b3261e", fontWeight: "700" }}>{error}</Text>
        </View>
      )}

      <Pressable
        onPress={() => void send()}
        disabled={sending || tooDear || halfRecipient}
        style={{
          backgroundColor: sending || tooDear || halfRecipient ? T.muted : T.brand,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
          {sending
            ? "Sending…"
            : tooDear
              ? `Over the ${naira(setup.maxValue)} limit`
              : halfRecipient
                ? "Their name and number, or neither"
                : fee !== null
                  ? `Send it · ${naira(fee)}`
                  : "Send it"}
        </Text>
      </Pressable>
      <Text style={{ color: T.muted, fontSize: 12, textAlign: "center" }}>
        We agree the day with you on WhatsApp once it is paid.
      </Text>
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ fontWeight: "700", color: T.ink }}>{text}</Text>;
}

/** A row of taps rather than a dropdown: a phone has no good select. */
/**
 * The next fortnight, as days somebody can tap.
 *
 * Lagos is an hour ahead of UTC and a phone can be set to anywhere, so the
 * day is worked out against that offset rather than the device's clock.
 * Otherwise somebody ordering at half past eleven at night is offered
 * yesterday.
 */
function nextDays(): { value: string; label: string }[] {
  const LAGOS = 60 * 60_000;
  const out: { value: string; label: string }[] = [];
  const now = new Date(Date.now() + LAGOS);
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (let i = 0; i < 14; i += 1) {
    const day = new Date(start + i * 86400_000);
    const value = day.toISOString().slice(0, 10);
    const said = new Intl.DateTimeFormat("en-NG", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(day);
    out.push({ value, label: i === 0 ? `Today, ${said}` : i === 1 ? `Tomorrow, ${said}` : said });
  }
  return out;
}

function Choices({
  options,
  value,
  onPick,
}: {
  options: { value: string; label: string }[];
  value: string;
  onPick: (next: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {options.map((one) => {
        const on = one.value === value;
        return (
          <Pressable
            key={one.value || "none"}
            onPress={() => onPick(one.value)}
            style={{
              backgroundColor: on ? T.brand : T.shell,
              borderWidth: 1,
              borderColor: on ? T.brand : T.line,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: on ? "#fff" : T.ink, fontWeight: on ? "800" : "500" }}>
              {one.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
        minHeight: props.multiline ? 72 : undefined,
        textAlignVertical: props.multiline ? "top" : "center",
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
