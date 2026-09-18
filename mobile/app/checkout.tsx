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
import { cart, cartTotal, countItems, me, mine, people, useStored } from "@/lib/store";
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
  const [friends] = useStored(people.read, []);
  const [mode, setMode] = useState<"one_payer" | "split">("one_payer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** What this number already has on the chosen run, if anything. */
  const [adding, setAdding] = useState<{ items: number; feeCharged: number }>({
    items: 0,
    feeCharged: 0,
  });

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

  // An order already placed on this run is topped up, not duplicated: only
  // the difference in delivery is charged. Re-asked whenever the run or the
  // number changes, because both decide the answer.
  useEffect(() => {
    let alive = true;
    if (!runId || phone.trim().length < 10) {
      setAdding({ items: 0, feeCharged: 0 });
      return;
    }
    void api
      .adding(runId, phone.trim(), saved.token)
      .then((next) => {
        if (alive) setAdding({ items: next.items, feeCharged: next.feeCharged });
      })
      .catch(() => {
        // Not knowing means the ordinary fee, which is what it would be anyway.
        if (alive) setAdding({ items: 0, feeCharged: 0 });
      });
    return () => {
      alive = false;
    };
  }, [runId, phone, saved.token]);

  // Only the people with food in this cart matter to the order.
  const sharing = friends.filter((friend) =>
    lines.some((line) => line.forName === friend.name)
  );

  // Where the bags go is read off the answers already given, exactly as on
  // the website: one bag going to its owner makes it an each-bag run.
  const collect: "leader" | "each" = sharing.some((friend) => friend.goesTo === "theirs")
    ? "each"
    : "leader";

  const unresolved = sharing.filter(
    (friend) =>
      friend.goesTo === null ||
      (friend.goesTo === "theirs" && (friend.phone.trim() === "" || friend.hostel.trim() === ""))
  );

  const splitNotReady =
    mode === "split" &&
    sharing.length + (lines.some((line) => line.forName === "") ? 1 : 0) < 2;

  const items = countItems(lines);
  const food = cartTotal(lines);
  const run = shop?.runs.find((one) => one.id === runId) ?? null;
  // Delivery is priced on everything travelling for this number on this run,
  // less whatever the earlier order already paid for it.
  const fee =
    shop && run
      ? Math.max(0, feeFrom(items + adding.items, shop.bands, run.flashFee) - adding.feeCharged)
      : 0;

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
          for_name: line.forName || null,
        })),
        paymentMethod: method,
        coupon: applied?.code ?? "",
        groupMode: sharing.length > 0 ? mode : null,
        collectMode: collect,
        people: sharing.map((friend) => ({
          name: friend.name,
          phone: friend.goesTo === "theirs" ? friend.phone : "",
          hostel: friend.goesTo === "theirs" ? friend.hostel : "",
          pays: friend.pays,
        })),
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

      {sharing.length > 0 && (
        <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 10 }}>
          <Text style={{ fontWeight: "800", color: T.ink }}>
            Group order · {sharing.length + 1} people
          </Text>

          {(
            [
              ["one_payer", "I pay for everything", "Friends pay you back however you like."],
              ["split", "Everyone pays their own", "Each person gets their own order and their own number to pay with."],
            ] as const
          ).map(([value, title, detail]) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={{
                borderWidth: 1,
                borderColor: mode === value ? T.brand : T.line,
                backgroundColor: mode === value ? T.tint : T.paper,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ fontWeight: "700", color: T.ink }}>{title}</Text>
              <Text style={{ color: T.muted }}>{detail}</Text>
            </Pressable>
          ))}

          {sharing.map((friend) => (
            <View key={friend.name} style={{ gap: 8, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10 }}>
              <Text style={{ fontWeight: "800", color: T.ink }}>{friend.name}&apos;s food goes</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(
                  [
                    ["mine", "Where mine goes"],
                    ["theirs", "To them"],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() =>
                      people.update(friend.name, {
                        goesTo: value,
                        ...(value === "mine" ? { phone: "", hostel: "" } : {}),
                      })
                    }
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      backgroundColor: friend.goesTo === value ? T.ink : "rgba(20,17,15,0.06)",
                    }}
                  >
                    <Text style={{ color: friend.goesTo === value ? T.paper : T.ink, fontWeight: "700" }}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {friend.goesTo === "theirs" && (
                <View style={{ gap: 8 }}>
                  <Field
                    label={`${friend.name}'s phone`}
                    value={friend.phone}
                    onChange={(next) => people.update(friend.name, { phone: next })}
                    keyboard="phone-pad"
                  />
                  <Field
                    label={`${friend.name}'s block`}
                    value={friend.hostel}
                    onChange={(next) => people.update(friend.name, { hostel: next })}
                  />
                </View>
              )}

              {mode === "split" && (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Text style={{ color: T.muted, fontWeight: "700" }}>{friend.name} pays by</Text>
                  {(
                    [
                      ["transfer", "Transfer"],
                      ["card", "Card link"],
                    ] as const
                  ).map(([value, label]) => (
                    <Pressable
                      key={value}
                      onPress={() => people.update(friend.name, { pays: value })}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: friend.pays === value ? T.ink : "rgba(20,17,15,0.06)",
                      }}
                    >
                      <Text style={{ color: friend.pays === value ? T.paper : T.ink, fontWeight: "700", fontSize: 13 }}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}

          <Text style={{ color: T.muted, fontSize: 13 }}>
            {collect === "leader"
              ? "Every bag comes to your block, and you hand the rest out."
              : "Each bag goes to the block under its own name. Yours comes to you."}
          </Text>
        </View>
      )}

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 10 }}>
        <Text style={{ fontWeight: "800", color: T.ink }}>
          {sharing.length > 0 ? "Where your own food goes" : "Where it goes"}
        </Text>
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

      {adding.items > 0 && (
        <View style={{ backgroundColor: T.tint, borderRadius: T.radius, padding: 14 }}>
          <Text style={{ fontWeight: "800", color: T.brandDark }}>
            Adding to the order you already have on this run
          </Text>
          <Text style={{ color: T.ink, marginTop: 2 }}>
            You already have {adding.items} item{adding.items === 1 ? "" : "s"} coming. This goes
            in the same delivery, so you only pay the difference, never a second delivery fee.
          </Text>
        </View>
      )}

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 6 }}>
        <Row label="Food" value={naira(food)} />
        <Row
          label={
            adding.items > 0
              ? `Delivery top-up (${items + adding.items} items)`
              : `Delivery (${items} item${items === 1 ? "" : "s"})`
          }
          value={naira(fee)}
        />
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

      {unresolved.length > 0 && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>
          {unresolved[0].goesTo === null
            ? `Say where ${unresolved[0].name}'s food goes.`
            : `${unresolved[0].name} needs a phone number and a block, since the food goes to them.`}
        </Text>
      )}

      {splitNotReady && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>
          Splitting needs two people with food in the cart. Tap a name under each item.
        </Text>
      )}

      {error !== "" && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>{error}</Text>
      )}

      <Pressable
        onPress={place}
        disabled={
          busy || runId === "" || lines.length === 0 || unresolved.length > 0 || splitNotReady
        }
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
