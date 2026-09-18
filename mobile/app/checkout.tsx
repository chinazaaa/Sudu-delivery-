import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { api, naira, type Shop } from "@/lib/api";
import { cart, cartTotal, countItems, me, mine, useStored } from "@/lib/store";
import { registerForPush } from "@/lib/push";
import { T } from "@/lib/theme";

/** Who it is for, which run, and how they are paying. Nothing else. */
export default function Checkout() {
  const router = useRouter();
  const [lines] = useStored(cart.read, []);
  const [saved] = useStored(me.read, { name: "", phone: "", hostel: "", token: null });

  const [shop, setShop] = useState<Shop | null>(null);
  const [runId, setRunId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [codeError, setCodeError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api
      .shop()
      .then((next) => {
        setShop(next);
        setRunId((was) => was || next.runs[0]?.id || "");
      })
      .catch((problem: unknown) =>
        setError(problem instanceof Error ? problem.message : "Could not reach the shop.")
      );
  }, []);

  // Filled in from the last order on this phone, which is as close to an
  // account as anybody needs.
  useEffect(() => {
    setName((was) => was || saved.name);
    setPhone((was) => was || saved.phone);
    setHostel((was) => was || saved.hostel);
  }, [saved]);

  useEffect(() => {
    setApplied(null);
  }, [runId, lines.length]);

  const items = countItems(lines);
  const food = cartTotal(lines);
  const run = shop?.runs.find((one) => one.id === runId) ?? null;
  const fee = shop && run ? feeFrom(items, shop.bands, run.flashFee) : 0;

  const place = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await api.place({
        batchId: runId,
        name,
        phone,
        hostel,
        lines: lines.map((line) => ({
          menu_item_id: line.itemId,
          qty: line.qty,
          option_ids: line.optionIds,
        })),
        paymentMethod: method,
        coupon: applied?.code ?? "",
      });

      await me.save({ name, phone, hostel, token: result.token });
      await mine.add(result.orderId);
      await cart.clear();

      // Asked for only now, when there is something worth being told about.
      void registerForPush(result.token);

      router.replace(`/order/${result.orderId}`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not place that order.");
    } finally {
      setBusy(false);
    }
  };

  if (!shop) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}>
      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
        <Text style={{ fontWeight: "800", color: T.ink }}>Which run?</Text>
        {shop.runs.map((one) => (
          <Pressable
            key={one.id}
            onPress={() => setRunId(one.id)}
            style={{
              borderWidth: 1,
              borderColor: one.id === runId ? T.brand : T.line,
              backgroundColor: one.id === runId ? T.tint : T.paper,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: "700", color: T.ink }}>{one.label}</Text>
            <Text style={{ color: T.muted }}>{one.deliveryWindow}</Text>
          </Pressable>
        ))}
        {shop.runs.length === 0 && (
          <Text style={{ color: T.muted }}>No run is open right now. Try again later.</Text>
        )}
      </View>

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 10 }}>
        <Text style={{ fontWeight: "800", color: T.ink }}>Where it goes</Text>
        <Field label="Your name" value={name} onChange={setName} />
        <Field label="Phone number" value={phone} onChange={setPhone} keyboard="phone-pad" />
        <Field label="Hostel or block" value={hostel} onChange={setHostel} />
      </View>

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
        <Text style={{ fontWeight: "800", color: T.ink }}>How are you paying?</Text>
        {(
          [
            ["transfer", "Bank transfer", "Account details on the next screen, with a number to put in the narration."],
            ["card", "Card", "We send the link to your WhatsApp after you order."],
          ] as const
        ).map(([value, title, detail]) => (
          <Pressable
            key={value}
            onPress={() => setMethod(value)}
            style={{
              borderWidth: 1,
              borderColor: method === value ? T.brand : T.line,
              backgroundColor: method === value ? T.tint : T.paper,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: "700", color: T.ink }}>{title}</Text>
            <Text style={{ color: T.muted }}>{detail}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 6 }}>
        <Row label="Food" value={naira(food)} />
        <Row label={`Delivery (${items} item${items === 1 ? "" : "s"})`} value={naira(fee)} />
        {applied && <Row label={`Code ${applied.code}`} value={`−${naira(applied.discount)}`} />}
        <View style={{ height: 1, backgroundColor: T.line, marginVertical: 4 }} />
        <Row label="Total" value={naira(Math.max(0, food + fee - (applied?.discount ?? 0)))} strong />

        {/* A code is something somebody was given in a group chat, so it is
            typed in rather than carried by a link. Checked here, by the same
            rule that will check it when the order is placed. */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TextInput
            value={code}
            onChangeText={(next) => {
              setCode(next.toUpperCase());
              setCodeError("");
            }}
            placeholder="Discount code"
            autoCapitalize="characters"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: T.ink,
            }}
          />
          <Pressable
            onPress={async () => {
              setCodeError("");
              try {
                const result = await api.coupon({
                  code,
                  batchId: runId,
                  phone,
                  lines: lines.map((line) => ({
                    menu_item_id: line.itemId,
                    qty: line.qty,
                    option_ids: line.optionIds,
                  })),
                });
                setApplied({ code: code.trim().toUpperCase(), ...result });
              } catch (problem) {
                setApplied(null);
                setCodeError(problem instanceof Error ? problem.message : "That code did not work.");
              }
            }}
            disabled={code.trim() === "" || runId === ""}
            style={{
              borderRadius: 12,
              paddingHorizontal: 18,
              justifyContent: "center",
              backgroundColor: code.trim() === "" ? "rgba(20,17,15,0.08)" : T.ink,
            }}
          >
            <Text style={{ color: code.trim() === "" ? T.muted : T.paper, fontWeight: "800" }}>
              Apply
            </Text>
          </Pressable>
        </View>
        {applied && (
          <Text style={{ color: "#0f9d58", fontWeight: "700" }}>{applied.label} applied.</Text>
        )}
        {codeError !== "" && (
          <Text style={{ color: T.brandDark, fontWeight: "700" }}>{codeError}</Text>
        )}
      </View>

      {error !== "" && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>
      )}

      <Pressable
        onPress={place}
        disabled={busy || runId === "" || lines.length === 0}
        style={{
          backgroundColor: busy ? "rgba(20,17,15,0.2)" : T.brand,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: T.paper, fontWeight: "800", fontSize: 16 }}>
          {busy
            ? "Placing…"
            : `Place order · ${naira(Math.max(0, food + fee - (applied?.discount ?? 0)))}`}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  keyboard?: "phone-pad";
}) {
  return (
    <View>
      <Text style={{ color: T.muted, fontWeight: "700", marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        style={{
          borderWidth: 1,
          borderColor: T.line,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 16,
          color: T.ink,
        }}
      />
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: strong ? T.ink : T.muted, fontWeight: strong ? "800" : "400" }}>
        {label}
      </Text>
      <Text style={{ color: T.ink, fontWeight: strong ? "800" : "600" }}>{value}</Text>
    </View>
  );
}

function feeFrom(items: number, bands: { maxItems: number | null; fee: number }[], flash: number | null) {
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 4000 }];
  const band =
    ladder.find((step) => step.maxItems !== null && items <= step.maxItems) ?? ladder[ladder.length - 1];
  return flash === null ? band.fee : Math.max(0, flash + (band.fee - ladder[0].fee));
}
