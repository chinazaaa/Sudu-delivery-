import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { api, naira } from "@/lib/api";
import { cart, cartTotal, countItems, me, party, useStored } from "@/lib/store";
import { F, T  } from "@/lib/theme";
import { Display } from "@/components/ui";

/**
 * Putting this cart into the car.
 *
 * Everything the group needs, asked once: the food, where it goes, and how
 * they are paying. The website learnt this the hard way, with a form on the
 * board asking again for answers already given, and a payment choice that
 * reset to transfer every time somebody added a drink.
 *
 * The cart is not emptied here. A group is open for another quarter of an
 * hour and adding something means coming back to this, which cannot be done
 * from an empty cart. It empties when the food becomes an order.
 */
export default function Finalise() {
  const router = useRouter();
  const [lines] = useStored(cart.read, []);
  const [seated] = useStored(party.read, null);
  const [shop] = useStored(() => api.shop().catch(() => null), null);

  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  const hostels = shop?.hostels ?? [];
  const items = countItems(lines);

  // What the seat already holds wins over anything this phone remembers: it
  // is what the others are waiting on and what the close will use.
  useEffect(() => {
    void (async () => {
      const saved = await me.read();
      setPhone((was) => was || saved.phone);
      setHostel((was) => was || saved.hostel);
      if (saved.paymentMethod) setMethod(saved.paymentMethod);
      if (!seated) return;
      try {
        const board = await api.group.board(seated.id, seated.seat);
        if (board.mine) {
          if (board.mine.phone) setPhone(board.mine.phone);
          if (board.mine.hostel) setHostel(board.mine.hostel);
          if (board.mine.note) setNote(board.mine.note);
          setMethod(board.mine.paymentMethod);
        }
      } catch {
        /* Their own answers are a convenience; they can type them again. */
      }
    })();
  }, [seated]);

  if (!seated) {
    return (
      <View style={{ padding: 24, gap: 10 }}>
        <Display size={22}>
          You are not in a group
        </Display>
        <Pressable onPress={() => router.replace("/checkout")}>
          <Text style={{ color: T.brand, fontFamily: F.bodyBold }}>Check out on your own</Text>
        </Pressable>
      </View>
    );
  }

  const send = async () => {
    setProblem("");
    if (items === 0) {
      setProblem("Nothing in your cart yet.");
      return;
    }
    setBusy(true);
    try {
      await api.group.finalise(seated.id, seated.seat, {
        lines: lines.map((line) => ({
          menu_item_id: line.itemId,
          qty: line.qty,
          option_ids: line.optionIds,
        })),
        phone,
        hostel,
        note,
        paymentMethod: method,
      });
      // Worth remembering: the same number, block and way of paying are
      // wanted next time.
      await me.save({ phone, hostel, paymentMethod: method });
      router.replace("/group");
    } catch (problem) {
      setProblem(problem instanceof Error ? problem.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}>
      <View style={{ backgroundColor: T.paper, borderWidth: 2, borderColor: T.ink, borderRadius: T.radius, padding: 14, gap: 4 }}>
        <Text style={{ fontFamily: F.bodyBold, color: T.ink }}>
          {items} item{items === 1 ? "" : "s"} · {naira(cartTotal(lines))}
        </Text>
        <Text style={{ color: T.muted, fontSize: 13 }}>
          {lines.map((line) => `${line.qty}× ${line.name}`).join(", ")}
        </Text>
        <Text style={{ color: T.muted, marginTop: 6 }}>
          Your share of delivery is worked out when the group closes, so nothing
          is charged yet.
        </Text>
      </View>

      <View style={{ backgroundColor: T.paper, borderWidth: 2, borderColor: T.ink, borderRadius: T.radius, padding: 14, gap: 10 }}>
        <View>
          <Text style={{ color: T.muted, marginBottom: 4 }}>Your phone number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="0803 123 4567"
            placeholderTextColor={T.muted}
            inputMode="tel"
            style={field()}
          />
        </View>

        <View>
          <Text style={{ color: T.muted, marginBottom: 4 }}>Which block?</Text>
          {hostels.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {hostels.map((one) => {
                const on = hostel === one;
                return (
                  <Pressable
                    key={one}
                    onPress={() => setHostel(one)}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: on ? T.brand : T.line,
                      backgroundColor: on ? T.tint : T.paper,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontWeight: on ? "800" : "600", color: T.ink }}>{one}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              value={hostel}
              onChangeText={setHostel}
              placeholder="Your hostel or block"
              placeholderTextColor={T.muted}
              style={field()}
            />
          )}
        </View>

        <View>
          <Text style={{ color: T.muted, marginBottom: 4 }}>Anything we should know?</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="No pepper, call me when you are outside"
            placeholderTextColor={T.muted}
            style={field()}
          />
        </View>

        <View>
          <Text style={{ fontFamily: F.bodyBold, color: T.ink, marginBottom: 6 }}>
            How are you paying? Transfer or card
          </Text>
          {(
            [
              [
                "transfer",
                "Bank transfer",
                "Account details on your order, with a four-digit number for the narration.",
              ],
              ["card", "Card", "We send the link to your WhatsApp. Pay it there."],
            ] as const
          ).map(([way, title, detail]) => {
            const on = method === way;
            return (
              <Pressable
                key={way}
                onPress={() => setMethod(way)}
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: on ? T.brand : T.line,
                  backgroundColor: on ? T.tint : T.paper,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: F.bodyBold, color: T.ink }}>{title}</Text>
                  {way === "transfer" && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: F.bodyBold,
                        color: T.brandDark,
                        backgroundColor: T.tint,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      USUAL
                    </Text>
                  )}
                </View>
                <Text style={{ color: T.muted, marginTop: 2 }}>{detail}</Text>
              </Pressable>
            );
          })}
        </View>

        {problem !== "" && (
          <Text style={{ color: T.brandDark, fontFamily: F.bodyBold }}>{problem}</Text>
        )}

        <Pressable
          onPress={send}
          disabled={busy}
          style={{
            backgroundColor: T.brand,
            borderRadius: 999,
            paddingVertical: 15,
            alignItems: "center",
          }}
        >
          <Text style={{ color: T.paper, fontFamily: F.bodyBold, fontSize: 16 }}>
            {busy ? "Saving…" : "Put my food in"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={{ alignItems: "center", paddingVertical: 6 }}>
          <Text style={{ color: T.muted, fontFamily: F.bodyBold }}>No, I am still choosing</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** The same field the checkout and the rest of the app are typed into. */
function field() {
  return {
    borderWidth: 2,
    borderColor: T.ink,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    color: T.ink,
    backgroundColor: T.field,
    fontFamily: F.body,
    fontSize: 15,
  } as const;
}
