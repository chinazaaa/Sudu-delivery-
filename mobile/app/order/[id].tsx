import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, naira, type OrderView } from "@/lib/api";
import { me, useStored } from "@/lib/store";
import { Button, Card, Display, Stripes, Ticket } from "@/components/ui";
import { F, T } from "@/lib/theme";

/** The five steps an order goes through, the way somebody waiting reads it. */
const STAGES = ["ordering", "closed", "at_counter", "on_the_road", "at_drop", "handed_out"];

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

  // A parcel is not food. It buys nothing, it is not priced by the container
  // ladder, and the same parcel twice is a different parcel.
  const isParcel = order.run.kind === "parcel";

  const account = order.accounts[chosen] ?? order.accounts[0];
  const copy = async (value: string, what: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(what);
    setTimeout(() => setCopied(""), 2000);
  };

  // Where it has got to, in one word on a coloured tab, and a headline
  // somebody can read from across a room.
  const done = order.status === "delivered" || order.stage === "handed_out";
  const paid = order.status !== "pending";
  const [chip, chipOn] = done
    ? ["Delivered", T.mint]
    : order.status === "refunded"
      ? ["Refunded", T.muted]
      : order.status === "cancelled"
        ? ["Cancelled", T.muted]
        : paid
          ? order.stage === "on_the_road"
            ? ["On the way", T.brand]
            : order.stage === "at_drop"
              ? ["At your block", T.brand]
              : ["Paid", T.brand]
          : order.payable
            ? ["Awaiting payment", T.volt]
            : ["Run gone", T.muted];
  const headline = done
    ? "Delivered. Enjoy."
    : order.status === "refunded"
      ? "Refunded"
      : order.status === "cancelled"
        ? "Cancelled"
        : !paid
          ? order.payable
            ? `Pay ${naira(order.total)}`
            : "This run has gone"
          : order.stage === "on_the_road"
            ? "On the way to PAU"
            : order.stage === "at_drop"
              ? "At your block now"
              : "You are on the run";
  // A parcel has no slot anybody chose and, until the day is agreed, no day
  // either: the run label over it was a promise nobody had made.
  const sub = isParcel
    ? order.run.agreed
      ? `${order.run.label} · ${order.run.window}`
      : `${order.run.window} · day not agreed yet`
    : order.run.sameDay
      ? `Going out ${order.run.window}`
      : `${order.run.label} · ${order.run.window}`;

  const help = shop?.shop.whatsapp ?? "";
  const google = shop?.shop.google?.review ?? "";

  return (
    <ScrollView
      style={{ backgroundColor: T.shell }}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <View
        style={{
          overflow: "hidden",
          backgroundColor: T.ink,
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 20,
          gap: 8,
        }}
      >
        <Stripes style={{ right: -10, width: "30%" }} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <View
            style={{ backgroundColor: chipOn, paddingHorizontal: 8, paddingVertical: 3 }}
          >
            <Ticket colour={chipOn === T.volt ? T.ink : T.paper}>{chip}</Ticket>
          </View>
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: T.onInkMuted }}>
            {order.ref}
          </Text>
        </View>

        <Display size={46} colour={T.shell}>
          {headline}
        </Display>
        <Text style={{ fontFamily: F.body, fontSize: 14, color: T.onInk }}>{sub}</Text>
      </View>

      <View style={{ padding: 16, gap: 14 }}>

      {/* A run that has been shopped for cannot take money: paying into it
          now is a refund waiting to happen, so the details come off and the
          screen says so. */}
      {!isParcel && order.status === "pending" && !order.payable && (
        <View
          style={{
            backgroundColor: T.tint,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: T.radius,
            padding: 14,
            gap: 8,
          }}
        >
          <Display size={26}>Do not pay this one</Display>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: T.ink, lineHeight: 20 }}>
            Nothing was charged. This run has been bought for already, so put your
            food on another one and it is yours again, priced on today's menu.
          </Text>

          {moving !== "" && (
            <Text style={{ color: T.brandDark, fontFamily: F.bodySemi, fontSize: 14 }}>
              {moving}
            </Text>
          )}

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
                  borderWidth: 2,
                  borderColor: T.ink,
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>
                    {one.label}
                  </Text>
                  <Text style={{ fontFamily: F.body, fontSize: 13, color: T.muted }}>
                    {one.deliveryWindow}
                  </Text>
                </View>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.brand }}>
                  {busy ? "…" : "Move"}
                </Text>
              </Pressable>
            ))}
        </View>
      )}

      {order.status === "pending" && order.payable && order.paymentMethod === "transfer" && account && (
        <View
          style={{
            backgroundColor: T.paper,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: T.radius,
            overflow: "hidden",
          }}
        >
          <View style={{ backgroundColor: T.volt, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.ink }}>
              Pay by transfer · {naira(order.total)}
            </Text>
          </View>

          <Line label="Amount" value={naira(order.total)} onCopy={() => copy(String(order.total), "amount")} copied={copied === "amount"} />
          <Line label="Bank" value={account.bank} />
          <Line label="Account name" value={account.name} />
          <Line
            label="Account no."
            value={account.number}
            onCopy={() => copy(account.number, "account")}
            copied={copied === "account"}
          />

          <View style={{ padding: 14, gap: 8 }}>

          {/* Out of the list and onto its own panel, exactly as on the website.
              As one row among four it read the same as the bank name, and
              transfers were arriving without it. */}
          <View
            style={{
              borderWidth: 2,
              borderColor: T.brand,
              backgroundColor: T.tint,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 12,
              alignItems: "center",
            }}
          >
            <Ticket colour={T.brandDark}>Type this in the narration</Ticket>
            <Display size={38} colour={T.brandDark} style={{ marginTop: 2 }}>
              {order.narration}
            </Display>
            <Text
              style={{ fontFamily: F.body, fontSize: 12, color: T.muted, marginTop: 3 }}
            >
              Without it we cannot match your transfer to your order.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Tap onPress={() => copy(account.number, "account")} label={copied === "account" ? "Copied" : "Copy account"} />
            <Tap onPress={() => copy(order.narration, "narration")} label={copied === "narration" ? "Copied" : "Copy narration"} />
          </View>

          {order.accounts.length > 1 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: T.muted }}>
                Or pay into:
              </Text>
              {order.accounts.map((one, index) => (
                <Pressable
                  key={one.number}
                  onPress={() => setChosen(index)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: index === chosen ? T.ink : T.line,
                    backgroundColor: index === chosen ? T.ink : T.paper,
                  }}
                >
                  <Text
                    style={{
                      color: index === chosen ? T.paper : T.ink,
                      fontFamily: F.bodySemi,
                      fontSize: 13,
                    }}
                  >
                    {one.bank}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={{ fontFamily: F.body, fontSize: 13, color: T.muted, lineHeight: 19 }}>
            Put{" "}
            <Text style={{ fontFamily: F.bodyBold, color: T.brandDark }}>{order.narration}</Text>{" "}
            in the narration. That is how this transfer is matched to your order. Transfer
            only, no cash on delivery.
          </Text>
          </View>
        </View>
      )}

      {order.status === "pending" && order.payable && order.paymentMethod === "card" && (
        <View
          style={{
            backgroundColor: T.tint,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: T.radius,
            padding: 14,
            gap: 4,
          }}
        >
          <Display size={26}>Your card link is coming</Display>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: T.ink, lineHeight: 20 }}>
            It comes to the number on this order, on WhatsApp.
          </Text>
        </View>
      )}

      {/* Where it has got to. The same six stages the run sheet moves
          through, so this says what admin has actually done rather than
          guessing from the clock. */}
      {order.status !== "refunded" && order.status !== "cancelled" && (
        <Card>
          {TIMELINE.map((step, at) => {
            const reached = step.at(order);
            const next = TIMELINE[at + 1];
            const current = reached && !(next && next.at(order));
            return (
              <View key={step.label} style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ width: 24, alignItems: "center" }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: current ? T.ink : reached ? T.brand : T.paper,
                      borderWidth: current ? 3 : reached ? 0 : 2,
                      borderColor: current ? T.brand : T.line,
                    }}
                  >
                    {reached && !current && (
                      <Ionicons name="checkmark" size={13} color={T.paper} />
                    )}
                  </View>
                  {at < TIMELINE.length - 1 && (
                    <View style={{ flex: 1, width: 3, backgroundColor: T.line }} />
                  )}
                </View>
                <View style={{ paddingTop: 1, paddingBottom: 14, flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: F.bodyBold,
                      fontSize: 15,
                      color: reached ? T.ink : T.muted,
                    }}
                  >
                    {step.label}
                  </Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>
                    {step.note(order, isParcel)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <Card style={{ gap: 8 }}>
        <Ticket>What you ordered</Ticket>
        {order.lines.map((line, index) => (
          <View key={`${line.name}-${index}`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: T.ink, flexShrink: 1 }}>
                {line.qty}× {line.name}
              </Text>
              <Text style={{ fontFamily: F.bodySemi, fontSize: 15, color: T.ink }}>
                {naira(line.unitPrice * line.qty)}
              </Text>
            </View>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: T.muted }}>
              {line.restaurant}
              {line.choices.length > 0 ? ` · ${line.choices.join(", ")}` : ""}
            </Text>
          </View>
        ))}
        {isParcel && order.parcel && (
          <View style={{ gap: 2 }}>
            <Row label="What" value={order.parcel.item} />
            <Row label="Collect" value={order.parcel.from} />
            <Row label="From" value={order.parcel.shop} />
            <Row label="Take to" value={order.parcel.to} />
            {order.parcel.kg > 0 && (
              <Row label="Weight" value={`Up to ${order.parcel.kg}kg`} />
            )}
          </View>
        )}

        <View
          style={{
            borderTopWidth: 2,
            borderStyle: "dashed",
            borderColor: T.line,
            marginVertical: 2,
          }}
        />
        {/* Nothing is bought on a parcel, so "Food ₦0" is a line about
            something that never happened. */}
        {!isParcel && (
          <Row
            label={order.run.kind === "skincare" ? "Skincare" : "Food"}
            value={naira(order.food)}
          />
        )}
        <Row label={isParcel ? "Carrying it" : "Delivery"} value={naira(order.fee)} />
        {order.discount > 0 && (
          <Row
            label={order.couponCode ? `Code ${order.couponCode}` : "Discount"}
            value={`−${naira(order.discount)}`}
          />
        )}
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
        >
          <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>Total</Text>
          <Display size={30}>{naira(order.total)}</Display>
        </View>
      </Card>

      {/* Until the run closes there is still time to order. It travels in
          the same car, and it pays its own delivery like any other order, so
          this is only the way back to the menu. */}
      {/* Nothing to add to a parcel: it is one bag on one trip, and the
          menu has nothing to do with it. */}
      {!isParcel && new Date(order.run.cutOffISO).getTime() > Date.now() && (
        <Button onPress={() => router.push("/")}>Order something else</Button>
      )}

      {/* Asked only once the food has actually arrived, and never of a
          refunded order, exactly as the website asks it. */}
      {done && order.status !== "refunded" && (
        <Rate
          orderId={order.id}
          rating={order.rating ?? null}
          feedback={order.feedback ?? ""}
          onSaved={load}
        />
      )}

      {/* And the one place worth asking for a review in public: a delivered
          order, from somebody who has just had their food. Only where admin
          has put a link in, and never instead of the stars above, which are
          ours to read. */}
      {done && order.status !== "refunded" && google !== "" && (
        <Pressable
          onPress={() => void Linking.openURL(google)}
          accessibilityRole="link"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: T.volt,
            borderWidth: 2,
            borderColor: T.ink,
            borderRadius: T.radius,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 22 }}>★</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: T.ink }}>
              Rate us on Google
            </Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: T.ink, lineHeight: 19 }}>
              One minute, and it helps us more than anything else does.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.ink} />
        </Pressable>
      )}

      {/* Something has gone wrong and nobody wants to hunt for a number. */}
      {help !== "" && (
        <Pressable
          onPress={() =>
            void Linking.openURL(`https://wa.me/${help.replace(/[^0-9]/g, "")}`)
          }
          accessibilityRole="link"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 48,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: T.ink,
          }}
        >
          <Ionicons name="logo-whatsapp" size={18} color={T.ink} />
          <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.ink }}>
            Help on WhatsApp
          </Text>
        </Pressable>
      )}
      </View>
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
    <Card style={{ gap: 10 }}>
      <View>
        <Display size={28}>{answered ? "Thank you" : "How was it?"}</Display>
        <Text
          style={{
            fontFamily: F.body,
            fontSize: 14,
            color: T.muted,
            marginTop: 2,
            lineHeight: 20,
          }}
        >
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
          <Text
            style={{ marginLeft: 6, fontFamily: F.bodySemi, fontSize: 14, color: T.muted }}
          >
            {WORDS[chosen]}
          </Text>
        )}
      </View>

      {chosen > 0 && (
        <>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: T.ink }}>
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
              borderWidth: 2,
              borderColor: T.ink,
              borderRadius: 12,
              backgroundColor: T.field,
              paddingHorizontal: 14,
              paddingVertical: 12,
              minHeight: 72,
              fontSize: 16,
              fontFamily: F.body,
              color: T.ink,
              textAlignVertical: "top",
            }}
          />
          <Button onPress={send} disabled={busy}>
            {busy ? "Sending…" : answered ? "Change my answer" : "Send"}
          </Button>
        </>
      )}

      {problem !== "" && (
        <Text style={{ color: T.brandDark, fontFamily: F.bodySemi, fontSize: 14 }}>
          {problem}
        </Text>
      )}
      {sent && problem === "" && (
        <Text style={{ color: T.mint, fontFamily: F.bodySemi, fontSize: 14 }}>
          Got it. Thank you.
        </Text>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ fontFamily: F.body, fontSize: 15, color: T.ink }}>{label}</Text>
      <Text
        style={{
          fontFamily: F.bodySemi,
          fontSize: 15,
          color: T.ink,
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/** A row inside the transfer card: what it is, what it says, and a way to
 *  have it on the clipboard where that is the point of it. */
function Line({
  label,
  value,
  onCopy,
  copied = false,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: T.line,
      }}
    >
      <Text style={{ fontFamily: F.body, fontSize: 14, color: T.muted }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
        <Text
          style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.ink, textAlign: "right" }}
        >
          {value}
        </Text>
        {onCopy && (
          <Pressable
            onPress={onCopy}
            accessibilityLabel={`Copy ${label.toLowerCase()}`}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: copied ? T.ink : T.line,
              backgroundColor: copied ? T.ink : T.paper,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={15}
              color={copied ? T.paper : T.ink}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Tap({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 2,
        borderColor: T.ink,
        borderRadius: 999,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: T.ink }}>{label}</Text>
    </Pressable>
  );
}

/**
 * The steps an order goes through, and what each one says underneath.
 *
 * Read off the run's own stage rather than from the clock, so it only ever
 * says what admin has actually done. Placed is always behind you: the order
 * exists, which is why you are looking at this page.
 */
const TIMELINE: {
  label: string;
  at: (order: OrderView) => boolean;
  note: (order: OrderView, parcel: boolean) => string;
}[] = [
  {
    label: "Placed",
    at: () => true,
    note: (order) => order.ref,
  },
  {
    label: "Paid",
    at: (order) => order.status !== "pending",
    note: (order) =>
      order.status !== "pending"
        ? order.paymentMethod === "card"
          ? "Card"
          : "Bank transfer"
        : "Waiting on you",
  },
  {
    label: "Collecting",
    at: (order) => STAGES.indexOf(order.stage) >= STAGES.indexOf("at_counter"),
    note: (order, parcel) =>
      parcel ? "Picking it up" : order.lines[0]?.restaurant || "At the counter",
  },
  {
    label: "On the way",
    at: (order) => STAGES.indexOf(order.stage) >= STAGES.indexOf("on_the_road"),
    note: () => "To PAU",
  },
  {
    label: "At your block",
    at: (order) => STAGES.indexOf(order.stage) >= STAGES.indexOf("at_drop"),
    note: (order) => order.hostel || "Your block",
  },
];
