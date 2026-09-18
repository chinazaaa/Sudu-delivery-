import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, naira, type OrderView } from "@/lib/api";
import { T } from "@/lib/theme";

/** One order: where to pay, what was ordered, and where it has got to. */
export default function Order() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [chosen, setChosen] = useState(0);
  const [copied, setCopied] = useState("");

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
          {order.status === "pending" ? `Pay ${naira(order.total)}` : "Paid. You are on the run."}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
          {order.run.label} · {order.run.window}
        </Text>
      </View>

      {order.status === "pending" && order.paymentMethod === "transfer" && account && (
        <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 8 }}>
          <Row label="Bank" value={account.bank} />
          <Row label="Account name" value={account.name} />
          <Row label="Account number" value={account.number} strong />
          <Row label="Narration" value={order.narration} strong />

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
            Put {order.narration} in the narration. That is how this transfer is matched to your
            order. Transfer only, no cash on delivery.
          </Text>
        </View>
      )}

      {order.status === "pending" && order.paymentMethod === "card" && (
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
    </ScrollView>
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
