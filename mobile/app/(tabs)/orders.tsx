import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SignIn from "@/components/SignIn";
import { api, naira } from "@/lib/api";
import { cart, me, useStored } from "@/lib/store";
import { Button, Display, Stripes, Ticket } from "@/components/ui";
import { F, T } from "@/lib/theme";

type Row = {
  id: string;
  ref: string;
  status: string;
  stage: string;
  /** Whether that run can still take money. */
  payable: boolean;
  total: number;
  items: number;
  run: string;
};

/** The five steps a run goes through once ordering on it has closed. */
const STEPS = ["closed", "at_counter", "on_the_road", "at_drop", "handed_out"];

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

      // A box is not a cart. Its price is the box's price with delivery
      // already in it, so tipping its contents into an ordinary basket
      // would charge the container ladder for a thing never priced that
      // way. Wanting it again means wanting the box again, which is what
      // the website does too.
      if (result.box) {
        router.push(`/occasions/${result.box.slug}` as never);
        return;
      }

      if (result.lines.length === 0) {
        setNote("Nothing from your last order is on sale today.");
        return;
      }

      // How they paid last time, carried across, so the checkout comes up
      // filled in. Their name, number and block are already kept on the
      // phone, so this is the last of it. (The note is not carried: this
      // checkout has nowhere to put one yet.)
      if (result.carry) {
        await me.save({ paymentMethod: result.carry.method }).catch(() => undefined);
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
            containerPct: line.containerPct,
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
      <ScrollView
        style={{ backgroundColor: T.shell }}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      >
        <View style={{ alignItems: "center", paddingVertical: 12 }}>
          <Ticket>Nothing here yet</Ticket>
          <Display size={44} style={{ textAlign: "center", marginTop: 6 }}>
            No orders yet
          </Display>
          <Text
            style={{
              color: T.muted,
              textAlign: "center",
              marginTop: 8,
              fontFamily: F.body,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            Everything you order from this phone shows up here, with where it has got to and a
            button to order the same thing again.
          </Text>
        </View>

        {!saved.token && <SignIn onDone={load} />}

        <Button onPress={() => router.replace("/")}>Browse the menu</Button>
      </ScrollView>
    );
  }

  // What is still coming, and what has been. A run already handed out, an
  // order refunded or cancelled, is history; everything else is live, and
  // the newest live one is the card the screen is really for.
  const over = (row: Row) =>
    row.status === "refunded" ||
    row.status === "cancelled" ||
    row.status === "delivered" ||
    row.stage === "handed_out";
  const live = rows.find((row) => !over(row)) ?? null;
  const past = rows.filter((row) => row !== live);

  return (
    <ScrollView
      style={{ backgroundColor: T.shell }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={T.brand} />}
    >
      {live && <Live row={live} onPress={() => router.push(`/order/${live.id}`)} />}

      {/* Where the live card is not standing in for it: the one tap that
          rebuilds the last order, which is what most people came here for. */}
      {!live && (
        <Pressable
          onPress={again}
          style={{
            backgroundColor: T.ink,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: T.radius,
            padding: 16,
            gap: 2,
          }}
        >
          <Ticket colour={T.volt}>One tap</Ticket>
          <Display size={30} colour={T.shell}>
            Order the same again
          </Display>
          <Text style={{ color: T.onInkMuted, fontFamily: F.body, fontSize: 14, lineHeight: 20 }}>
            Your last order, back in your cart at today&apos;s prices.
          </Text>
        </Pressable>
      )}

      {note !== "" && (
        <View
          style={{
            backgroundColor: T.tint,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: T.radius,
            padding: 12,
          }}
        >
          <Text style={{ color: T.brandDark, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20 }}>
            {note}
          </Text>
        </View>
      )}

      {past.length > 0 && <Ticket style={{ marginTop: 2 }}>Past runs</Ticket>}

      {past.map((row, at) => (
        <View
          key={row.id}
          style={{
            backgroundColor: T.paper,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: 14,
            padding: 12,
            gap: 10,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <Text style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{row.ref}</Text>
            <Chip row={row} />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>{row.run}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: T.muted, marginTop: 1 }}>
                {row.items} item{row.items === 1 ? "" : "s"}
              </Text>
            </View>
            <Display size={22}>{naira(row.total)}</Display>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => router.push(`/order/${row.id}`)}
              style={{
                flex: 1,
                minHeight: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                borderWidth: 2,
                borderColor: T.ink,
              }}
            >
              <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: T.ink }}>View</Text>
            </Pressable>

            {/* Only on the newest. Having a thing again means the last
                order, which is the only one the shop will rebuild: an
                "Order again" on a card from March that quietly fetched
                April's food would be a lie on a button. */}
            {at === 0 && (
              <Pressable
                onPress={again}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  gap: 6,
                  minHeight: 42,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: T.ink,
                  backgroundColor: T.brand,
                }}
              >
                <Ionicons name="refresh" size={16} color={T.paper} />
                <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.paper }}>
                  Order again
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * The order still coming, drawn the way the board draws it: Ink, with the
 * speed stripes running off the right edge and a Tomato shadow under it.
 *
 * The meter is the run's own stages rather than a guess, so it moves when
 * admin moves the car and not before.
 */
function Live({ row, onPress }: { row: Row; onPress: () => void }) {
  const here = STEPS.indexOf(row.stage);
  const said =
    row.status === "pending"
      ? row.payable
        ? "Not paid yet"
        : "Run gone"
      : here < 0
        ? "Ordering open"
        : row.stage === "at_counter"
          ? "At the counter"
          : row.stage === "on_the_road"
            ? "On the way"
            : row.stage === "at_drop"
              ? "At your block"
              : "Paid, getting ready";

  return (
    <View>
      {/* The hard shadow, in Tomato, as a view rather than a shadow. */}
      <View
        style={{
          position: "absolute",
          left: 5,
          top: 5,
          right: -5,
          bottom: -5,
          backgroundColor: T.brand,
          borderRadius: 18,
        }}
      />
      <Pressable
        onPress={onPress}
        style={{
          overflow: "hidden",
          backgroundColor: T.ink,
          borderRadius: 18,
          padding: 16,
          gap: 10,
        }}
      >
        <Stripes style={{ right: -10, width: "22%" }} />

        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <View style={{ backgroundColor: T.brand, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Ticket colour={T.paper}>{said}</Ticket>
          </View>
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: T.onInkMuted }}>{row.ref}</Text>
        </View>

        <Display size={30} colour={T.shell}>
          {row.run}
        </Display>

        <View style={{ flexDirection: "row", gap: 4 }}>
          {STEPS.map((step, at) => (
            <View
              key={step}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  at < here ? T.brand : at === here ? T.shell : T.inkLine,
              }}
            />
          ))}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: T.onInk, flexShrink: 1 }}>
            {row.items} item{row.items === 1 ? "" : "s"}
          </Text>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.shell }}>
            {naira(row.total)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

/** What became of an order, in four words on a coloured tab. */
function Chip({ row }: { row: Row }) {
  const [said, back] =
    row.status === "refunded"
      ? ["Refunded", T.muted]
      : row.status === "cancelled"
        ? ["Cancelled", T.muted]
        : row.status === "pending"
          ? [row.payable ? "Not paid" : "Run gone", T.brand]
          : ["Delivered", T.mint];

  return (
    <View style={{ backgroundColor: back, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Ticket colour={T.paper}>{said}</Ticket>
    </View>
  );
}
