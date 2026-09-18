import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import SignIn from "@/components/SignIn";
import { api, naira } from "@/lib/api";
import { cart, me, useStored } from "@/lib/store";
import { T } from "@/lib/theme";

type Row = {
  id: string;
  ref: string;
  status: string;
  stage: string;
  total: number;
  items: number;
  run: string;
};

/**
 * Everything ordered from this phone, and one tap to have it again.
 *
 * Nobody has to sign in: the token comes from the last order placed here. A
 * phone that has never ordered gets the phone-and-PIN box instead, so orders
 * placed on the website, or from an older handset, are still theirs.
 */
export default function Orders() {
  const router = useRouter();
  const [saved] = useStored(me.read, { name: "", phone: "", hostel: "", token: null });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!saved.token) {
      setRows([]);
      return;
    }
    setBusy(true);
    try {
      const result = await api.myOrders(saved.token);
      setRows(result.orders);
    } catch {
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [saved.token]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const again = async () => {
    if (!saved.token) return;
    setNote("");
    try {
      const result = await api.again(saved.token);
      if (result.lines.length === 0) {
        setNote("Nothing from your last order is on sale today.");
        return;
      }

      for (const line of result.lines) {
        await cart.add(
          {
            itemId: line.itemId,
            name: line.name,
            restaurant: line.restaurant,
            imageUrl: line.imageUrl,
            unitPrice: line.unitPrice,
            optionIds: line.optionIds,
            choices: line.choices,
          },
          line.qty
        );
      }

      if (result.blocked.length > 0) {
        setNote(
          `${result.blocked.map((one) => one.name).join(", ")} left out: ${result.blocked[0].reason}.`
        );
      }
      router.push("/cart");
    } catch (problem) {
      setNote(problem instanceof Error ? problem.message : "Could not rebuild that order.");
    }
  };

  if (rows === null) return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;

  if (rows.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <View style={{ alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: T.ink }}>No orders yet</Text>
          <Text style={{ color: T.muted, textAlign: "center", marginTop: 6 }}>
            Everything you order from this phone shows up here, with where it has got to and a
            button to order the same thing again.
          </Text>
        </View>

        {!saved.token && <SignIn onDone={load} />}

        <Pressable
          onPress={() => router.replace("/")}
          style={{
            backgroundColor: T.brand,
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: T.paper, fontWeight: "800" }}>Browse the menu</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={T.brand} />}
    >
      <Pressable
        onPress={again}
        style={{
          backgroundColor: T.ink,
          borderRadius: T.radius,
          padding: 16,
        }}
      >
        <Text style={{ color: T.paper, fontWeight: "800", fontSize: 16 }}>
          Order the same thing again
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
          Your last order, back in your cart at today&apos;s prices.
        </Text>
      </Pressable>

      {note !== "" && (
        <View style={{ backgroundColor: T.tint, borderRadius: T.radius, padding: 12 }}>
          <Text style={{ color: T.brandDark, fontWeight: "700" }}>{note}</Text>
        </View>
      )}

      {rows.map((row) => (
        <Pressable
          key={row.id}
          onPress={() => router.push(`/order/${row.id}`)}
          style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "800", color: T.ink }}>{row.ref}</Text>
            <Text style={{ fontWeight: "800", color: T.ink }}>{naira(row.total)}</Text>
          </View>
          <Text style={{ color: T.muted, marginTop: 2 }}>
            {row.run} · {row.items} item{row.items === 1 ? "" : "s"}
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontWeight: "700",
              color: row.status === "pending" ? T.brand : T.ink,
            }}
          >
            {row.status === "pending"
              ? "Not paid yet"
              : row.status === "refunded"
                ? "Refunded"
                : row.stage === "delivered"
                  ? "Delivered"
                  : "Paid"}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
