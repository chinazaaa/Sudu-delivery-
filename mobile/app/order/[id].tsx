import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, naira, type OrderView } from "@/lib/api";
import { me, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

/** One order: where to pay, what was ordered, and where it has got to. */
export default function Order() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [chosen, setChosen] = useState(0);
  const [copied, setCopied] = useState("");
  // Moving an order needs the runs and the token that proves it is theirs.
  const [shop] = useStored(() => api.shop().catch(() => null), null);
  const [saved] = useStored(me.read, { name: "", phone: "", hostel: "", token: null });
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState("");

  const load = useCallback(async () => {
    try {
      setOrder(await api.order(String(id)));
    } catch {
      setOrder(null);
    }
  }, [id]);

  useEffect(() => {
    void load();
    // While somebody is waiting, the screen should keep up on its own.
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const move = async (batchId: string) => {
    if (!saved.token) {
      setMoving("Sign in on the Account tab first, so we know it is your order.");
      return;
    }
    setMoving("");
    setBusy(true);
    try {
      const result = await api.move(String(id), batchId, saved.token);
      router.replace(`/order/${result.orderId}`);
    } catch (problem) {
      setMoving(problem instanceof Error ? problem.message : "Could not move that.");
    } finally {
      setBusy(false);
    }
  };

  if (!order) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  const account = order.accounts[chosen] ?? order.accounts[0];
  const copy = async (value: string, what: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(what);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>
      <View style={{ backgroundColor: T.ink, borderRadius: T.radius, padding: 16 }}>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 12 }}>
          ORDER {order.ref}
        </Text>
        <Text style={{ color: T.paper, fontSize: 20, fontWeight: "800", marginTop: 2 }}>
          {order.status !== "pending"
            ? "Paid. You are on the run."
            : order.payable
              ? `Pay ${naira(order.total)}`
              : "This run has gone"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
          {order.run.sameDay
            ? `Going out ${order.run.window}`
            : `${order.run.label} · ${order.run.window}`}
        </Text>
      </View>

      {/* A run that has been shopped for cannot take money: paying into it
          now is a refund waiting to happen, so the details come off and the
          screen says so. */}
      {order.status === "pending" && !order.payable && (
        <View style={{ backgroundColor: T.tint, borderRadius: T.radius, padding: 14, gap: 8 }}>
          <Text style={{ fontWeight: "800", color: T.ink }}>Do not pay this one</Text>
          <Text style={{ color: T.muted }}>
            Nothing was charged. This run has been bought for already, so put your
            food on another one and it is yours again, priced on today's menu.
          </Text>

          {moving !== "" && <Text style={{ color: T.brandDark, fontWeight: "700" }}>{moving}</Text>}

          {(shop?.runs ?? [])
            .filter((one) => !one.closed && !one.full && one.id !== order.runId)
            .map((one) => (
              <Pressable
                key={one.id}
                onPress={() => void move(one.id)}
                disabled={busy}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  backgroundColor: T.paper,
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: T.ink }}>{one.label}</Text>
                  <Text style={{ color: T.muted, fontSize: 13 }}>{one.deliveryWindow}</Text>
                </View>
                <Text style={{ color: T.brand, fontWeight: "800" }}>
                  {busy ? "…" : "Move"}
                </Text>
              </Pressable>
            ))}
        </View>
      )}

      {order.status === "pending" && order.payable && order.paymentMethod === "transfer" && account && (
        <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
          <Row label="Bank" value={account.bank} />
          <Row label="Account name" value={account.name} />
          <Row label="Account number" value={account.number} strong />

          {/* Out of the list and onto its own panel, exactly as on the website.
              As one row among four it read the same as the bank name, and
              transfers were arriving without it. */}
          <View
            style={{
              borderWidth: 2,
              borderColor: "rgba(255,90,31,0.4)",
              backgroundColor: T.tint,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 12,
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 0.6,
                color: T.brandDark,
                textTransform: "uppercase",
              }}
            >
              Type this in the narration
            </Text>
            <Text
              style={{
                fontSize: 34,
                fontWeight: "800",
                letterSpacing: 2,
                color: T.brandDark,
                marginTop: 2,
              }}
            >
              {order.narration}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: "600", color: T.muted, marginTop: 3 }}>
              Without it we cannot match your transfer to your order.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
            <Tap onPress={() => copy(account.number, "account")} label={copied === "account" ? "Copied" : "Copy account"} />
            <Tap onPress={() => copy(order.narration, "narration")} label={copied === "narration" ? "Copied" : "Copy narration"} />
          </View>

          {order.accounts.length > 1 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              <Text style={{ color: T.muted, fontWeight: "700" }}>Or pay into:</Text>
              {order.accounts.map((one, index) => (
                <Pressable
                  key={one.number}
                  onPress={() => setChosen(index)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: index === chosen ? T.ink : "rgba(20,17,15,0.06)",
                  }}
                >
                  <Text style={{ color: index === chosen ? T.paper : T.ink, fontWeight: "700", fontSize: 12 }}>
                    {one.bank}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={{ color: T.muted, marginTop: 4 }}>
            Put{" "}
            <Text style={{ fontWeight: "800", color: T.brandDark }}>{order.narration}</Text> in the
            narration. That is how this transfer is matched to your order. Transfer only, no cash
            on delivery.
          </Text>
        </View>
      )}

      {order.status === "pending" && order.payable && order.paymentMethod === "card" && (
        <View style={{ backgroundColor: T.tint, borderRadius: T.radius, padding: 14 }}>
          <Text style={{ fontWeight: "800", color: T.ink }}>Your card link is coming</Text>
          <Text style={{ color: T.muted, marginTop: 4 }}>
            It comes to the number on this order, on WhatsApp.
          </Text>
        </View>
      )}

      <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
        <Text style={{ fontWeight: "800", color: T.ink }}>What you ordered</Text>
        {order.lines.map((line, index) => (
          <View key={`${line.name}-${index}`}>
            <Text style={{ color: T.ink }}>
              {line.qty}× {line.name}
            </Text>
            <Text style={{ color: T.muted, fontSize: 13 }}>
              {line.restaurant}
              {line.choices.length > 0 ? ` · ${line.choices.join(", ")}` : ""}
            </Text>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: T.line, marginVertical: 4 }} />
        <Row label="Food" value={naira(order.food)} />
        <Row label="Delivery" value={naira(order.fee)} />
        {order.discount > 0 && (
          <Row
            label={order.couponCode ? `Code ${order.couponCode}` : "Discount"}
            value={`−${naira(order.discount)}`}
          />
        )}
        <Row label="Total" value={naira(order.total)} strong />
      </View>

      {/* Until the run closes, anything else goes in the same delivery. The
          checkout works the fee out from what is already on this run, so this
          is only the way back to the menu. */}
      {new Date(order.run.cutOffISO).getTime() > Date.now() && (
        <Pressable
          onPress={() => router.push("/")}
          style={{
            backgroundColor: T.brand,
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: T.paper, fontWeight: "800", fontSize: 16 }}>
            Add more to this order
          </Text>
        </Pressable>
      )}
      {/* Asked only once the food has actually arrived, and never of a
          refunded order, exactly as the website asks it. */}
      {(order.status === "delivered" || order.stage === "handed_out") &&
        order.status !== "refunded" && (
          <Rate
            orderId={order.id}
            rating={order.rating ?? null}
            feedback={order.feedback ?? ""}
            onSaved={load}
          />
        )}
    </ScrollView>
  );
}

const WORDS = ["", "Bad", "Not great", "Fine", "Good", "Perfect"];

/**
 * Five stars and a line, on a delivered order.
 *
 * The stars are the whole question. The box underneath only opens once a star
 * is picked, because asking somebody to write something before they have said
 * anything is how you get no answers at all.
 */
function Rate({
  orderId,
  rating,
  feedback,
  onSaved,
}: {
  orderId: string;
  rating: number | null;
  feedback: string;
  onSaved: () => void;
}) {
  const [chosen, setChosen] = useState(rating ?? 0);
  const [note, setNote] = useState(feedback);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [sent, setSent] = useState(false);

  const answered = (rating !== null && rating > 0) || sent;

  const send = async () => {
    setBusy(true);
    setProblem("");
    try {
      await api.rate(orderId, chosen, note);
      setSent(true);
      onSaved();
    } catch (trouble) {
      setProblem(trouble instanceof Error ? trouble.message : "Could not save that just now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 10 }}>
      <View>
        <Text style={{ fontWeight: "800", color: T.ink }}>
          {answered ? "Thank you" : "How was it?"}
        </Text>
        <Text style={{ color: T.muted, marginTop: 2 }}>
          {answered
            ? "Change it any time. We read every one of these."
            : "One tap. It tells us whether to keep using a restaurant."}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => {
              setChosen(star);
              setSent(false);
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star} out of 5`}
            accessibilityState={{ selected: star <= chosen }}
          >
            <Text
              style={{
                fontSize: 32,
                lineHeight: 38,
                color: star <= chosen ? T.brand : "rgba(20,17,15,0.15)",
              }}
            >
              ★
            </Text>
          </Pressable>
        ))}
        {chosen > 0 && (
          <Text style={{ marginLeft: 6, color: T.muted, fontWeight: "700" }}>{WORDS[chosen]}</Text>
        )}
      </View>

      {chosen > 0 && (
        <>
          <Text style={{ color: T.muted, fontWeight: "700" }}>
            Anything you want to tell us? Optional
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            placeholder="Cold by the time it arrived, or the wrap was perfect."
            placeholderTextColor={T.muted}
            style={{
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              minHeight: 64,
              fontSize: 16,
              color: T.ink,
              textAlignVertical: "top",
            }}
          />
          <Pressable
            onPress={send}
            disabled={busy}
            style={{
              backgroundColor: busy ? "rgba(20,17,15,0.15)" : T.brand,
              borderRadius: 999,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: T.paper, fontWeight: "800" }}>
              {busy ? "Sending…" : answered ? "Change my answer" : "Send"}
            </Text>
          </Pressable>
        </>
      )}

      {problem !== "" && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>{problem}</Text>
      )}
      {sent && problem === "" && (
        <Text style={{ color: T.ink, fontWeight: "700" }}>Got it. Thank you.</Text>
      )}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: T.muted }}>{label}</Text>
      <Text style={{ color: T.ink, fontWeight: strong ? "800" : "600", flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

function Tap({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: T.line,
        borderRadius: 999,
        paddingVertical: 10,
        alignItems: "center",
      }}
    >
      <Text style={{ fontWeight: "800", color: T.ink }}>{label}</Text>
    </Pressable>
  );
}
