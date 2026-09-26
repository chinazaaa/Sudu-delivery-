import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { api, naira, type BoxView, type WhenOption } from "@/lib/api";
import { me as stored } from "@/lib/store";
import { T } from "@/lib/theme";

/**
 * One occasion and the boxes packed for it.
 *
 * Everything on this screen was worked out by the shop: what is in each box,
 * what it costs off today's menu, and every car it could ride. The phone only
 * lets somebody point at one, so an app a version behind cannot quote last
 * week's prices.
 */
export default function OccasionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const scroller = useRef<ScrollView>(null);

  const [data, setData] = useState<Awaited<ReturnType<typeof api.occasion>> | null>(null);
  const [error, setError] = useState("");

  const [picked, setPicked] = useState("");
  const [swaps, setSwaps] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [going, setGoing] = useState("");
  const [day, setDay] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [pays, setPays] = useState<"transfer" | "card">("transfer");
  const [note, setNote] = useState("");
  const [heard, setHeard] = useState("");
  const [giftName, setGiftName] = useState("");
  const [giftPhone, setGiftPhone] = useState("");
  const [gifting, setGifting] = useState(false);
  const [busy, setBusy] = useState(false);
  // A collection is asked for on a day rather than put on a run: "car" is
  // one of the trips the shop is driving, "day" is a date they picked, and
  // "any" is them saying any day suits and we agree it with them.
  const [mode, setMode] = useState<"car" | "day" | "any">("car");
  const [wantedOn, setWantedOn] = useState("");
  const [again, setAgain] = useState(false);
  const [howOften, setHowOften] = useState("monthly");
  const [money, setMoney] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!slug) return;
    api
      .occasion(String(slug))
      .then((one) => {
        setData(one);
        setGoing(one.when[0]?.key ?? "");
        setDay(one.when[0]?.date ?? "");
        // A thing with a whistle picks a real car, because a whistle does
        // not wait. Everything else picks a date.
        if (one.day && !one.day.timed) {
          setMode("day");
          setWantedOn(one.day.soonest);
        }
      })
      .catch((why) => setError(why instanceof Error ? why.message : "Could not load that."));
  }, [slug]);

  // Their own details, so nobody types their block twice.
  useEffect(() => {
    void stored.read().then((who) => {
      setName(who.name);
      setPhone(who.phone);
      setHostel(who.hostel);
    });
  }, []);

  const box = data?.boxes.find((one) => one.id === picked) ?? null;

  // One entry per day that has anything going, each carrying its own cars.
  // A fortnight laid out flat is thirty rows and a thumb that never reaches
  // the bottom, and every row but two is about a day nobody wanted.
  const days = useMemo(() => {
    const byDate = new Map<string, WhenOption[]>();
    for (const one of data?.when ?? []) {
      byDate.set(one.date, [...(byDate.get(one.date) ?? []), one]);
    }
    return [...byDate.entries()].map(([date, options]) => ({ date, options }));
  }, [data]);

  if (error !== "") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: T.muted, textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={T.brand} />
      </View>
    );
  }

  const car = data.when.find((one) => one.key === going) ?? null;
  const moved = (one: BoxView) =>
    one.lines.reduce((sum, line) => {
      const pick = swaps[line.id];
      return sum + (pick !== undefined && pick >= 0 ? line.swaps[pick]?.delta ?? 0 : 0);
    }, 0);
  const soonest = data.day?.soonest ?? "";

  // Three weeks of days, as chips. Worked out from the dates the server
  // sent rather than from the phone's clock, which is anybody's guess.
  const pickable: string[] = (() => {
    if (!data.day) return [];
    const out: string[] = [];
    const at = new Date(`${data.day.soonest}T12:00:00Z`);
    // Start two days before the standard day, which is today: somebody who
    // wants it tonight can still ask, and the chip says it is a rush.
    at.setUTCDate(at.getUTCDate() - 2);
    while (out.length < 22) {
      const said = at.toISOString().slice(0, 10);
      if (said > data.day.latest) break;
      out.push(said);
      at.setUTCDate(at.getUTCDate() + 1);
    }
    return out;
  })();
  // Sooner than the shop can find it, buy it and pack it, so it costs what a
  // car of its own costs. Worked out off dates the server sent.
  const rush = mode === "day" && wantedOn !== "" && soonest !== "" && wantedOn < soonest;
  const priceOf = (one: BoxView) => {
    const fee =
      mode === "car" ? (car && !car.onARun ? one.carFee : one.runFee) : rush ? one.carFee : one.runFee;
    return one.food + fee + (one === box ? moved(one) : 0);
  };

  const place = async () => {
    if (!box) return;
    if (mode === "car" && going === "") return;
    if (mode === "day" && wantedOn === "") return;
    setProblem("");
    setBusy(true);
    try {
      const result = await api.orderBox({
        occasion: data.occasion.slug,
        box: box.id,
        when: mode === "car" ? going : mode === "any" ? "anytime" : `day:${wantedOn}`,
        swaps,
        name,
        phone,
        hostel,
        paymentMethod: pays,
        payCurrency: pays === "card" ? money : "",
        repeat: again ? howOften : "",
        customerNote: note,
        heardFrom: heard,
        giftName: gifting ? giftName : "",
        giftPhone: gifting ? giftPhone : "",
      });
      await stored.save({ name, phone, hostel, token: result.token ?? undefined });
      router.replace(`/order/${result.orderId}` as never);
    } catch (why) {
      setProblem(why instanceof Error ? why.message : "Could not place that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      ref={scroller}
      style={{ flex: 1, backgroundColor: T.shell }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
    >
      <View>
        <Text style={{ fontSize: 24, fontWeight: "800", color: T.ink }}>
          {data.occasion.name}
        </Text>
        {data.occasion.blurb !== "" && (
          <Text style={{ marginTop: 4, color: T.muted }}>{data.occasion.blurb}</Text>
        )}
      </View>

      {data.when.length === 0 && (data.day?.timed ?? true) && (
        <Card>
          <Text style={{ fontWeight: "700", color: T.ink }}>
            Nothing can get there in time any more.
          </Text>
          <Text style={{ color: T.muted, marginTop: 4 }}>
            Everything on the menu is still going out though.
          </Text>
        </Card>
      )}

      {data.boxes.map((one) => (
        <Pressable
          key={one.id}
          onPress={() => {
            const next = one.id === picked ? "" : one.id;
            setPicked(next);
            // Picking a box moves you to what is in it, because the next
            // thing to do is below the fold on every phone and hunting for
            // it reads as nothing having happened.
            if (next !== "") setTimeout(() => scroller.current?.scrollTo({ y: 240, animated: true }), 50);
          }}
          style={{
            backgroundColor: one.id === picked ? T.tint : T.paper,
            borderRadius: T.radius,
            borderWidth: 2,
            borderColor: one.id === picked ? T.brand : T.line,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: T.ink, flex: 1 }}>
              {one.name}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: T.ink }}>
              {naira(priceOf(one))}
            </Text>
          </View>
          {one.serves !== "" && <Text style={{ color: T.muted }}>{one.serves}</Text>}
          {/* A list, not a paragraph. Twenty things separated by dots is
              something nobody reads to find out whether the milk is in it. */}
          <View style={{ marginTop: 6, gap: 2 }}>
            {one.lines.map((l) => (
              <Text key={l.id} style={{ color: T.ink, opacity: 0.75 }}>
                {"\u2022  "}
                {l.qty > 1 && (
                  <Text style={{ fontWeight: "700" }}>{l.qty} × </Text>
                )}
                {l.name}
              </Text>
            ))}
          </View>
          <Text style={{ color: T.brand, fontWeight: "700", marginTop: 4 }}>
            Delivery included
          </Text>
        </Pressable>
      ))}

      {box && (data.when.length > 0 || !(data.day?.timed ?? true)) && (
        <>
          <Card>
            <Heading>What is in it</Heading>
            {box.lines.map((line) => {
              const pick = swaps[line.id];
              const chosen = pick !== undefined && pick >= 0 ? line.swaps[pick] : null;
              const shown = chosen ?? line;

              return (
                <View key={line.id} style={{ marginTop: 10 }}>
                  <Text style={{ fontWeight: "700", color: T.ink }}>
                    {line.qty > 1 && `${line.qty} × `}
                    {shown.name}
                    {shown.choices.length > 0 && (
                      <Text style={{ fontWeight: "700" }}> · {shown.choices.join(", ")}</Text>
                    )}
                  </Text>
                  <Text style={{ color: T.muted, fontSize: 13 }}>{shown.restaurant}</Text>

                  {line.swaps.length > 0 && (
                    <>
                      <Pressable
                        onPress={() => setOpen((was) => ({ ...was, [line.id]: !was[line.id] }))}
                      >
                        <Text style={{ color: T.brand, fontWeight: "600", marginTop: 4 }}>
                          {open[line.id] ? "Close" : "Swap"}
                        </Text>
                      </Pressable>

                      {open[line.id] &&
                        [
                          {
                            name: line.name,
                            restaurant: line.restaurant,
                            choices: line.choices,
                            delta: 0,
                          },
                          ...line.swaps,
                        ].map((option, index) => (
                          <Pressable
                            key={`${line.id}-${index}`}
                            onPress={() => setSwaps((was) => ({ ...was, [line.id]: index - 1 }))}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              gap: 12,
                              paddingVertical: 8,
                              paddingHorizontal: 10,
                              borderRadius: 12,
                              marginTop: 4,
                              backgroundColor:
                                (swaps[line.id] ?? -1) === index - 1 ? T.tint : "rgba(0,0,0,0.03)",
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: T.ink }}>
                                {option.name}
                                {/* The choice, where it is often the only
                                    thing telling two rows apart. */}
                                {option.choices.length > 0 && (
                                  <Text style={{ fontWeight: "700" }}>
                                    {" "}· {option.choices.join(", ")}
                                  </Text>
                                )}
                              </Text>
                              <Text style={{ color: T.muted, fontSize: 12 }}>
                                {option.restaurant}
                              </Text>
                            </View>
                            <Text style={{ color: T.muted, fontWeight: "600" }}>
                              {option.delta === 0
                                ? index === 0
                                  ? "as packed"
                                  : "same price"
                                : option.delta > 0
                                  ? `+${naira(option.delta)}`
                                  : `−${naira(-option.delta)}`}
                            </Text>
                          </Pressable>
                        ))}
                    </>
                  )}
                </View>
              );
            })}
          </Card>

          <Card>
            <Heading>When do you want it?</Heading>

            {/* Two models, only ever one on screen. A match needs one of the
                cars the shop is driving before the whistle. A care package
                needs a date, because it is found, bought and packed first. */}
            {(data.day?.timed ?? true) ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {days.map((one) => (
                      <Pressable
                        key={one.date}
                        onPress={() => {
                          setDay(one.date);
                          setGoing(one.options[0]?.key ?? "");
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: one.date === day ? T.brand : T.line,
                          backgroundColor: one.date === day ? T.tint : T.paper,
                        }}
                      >
                        <Text style={{ fontWeight: "700", color: T.ink }}>{weekday(one.date)}</Text>
                        <Text style={{ color: T.muted, fontSize: 12 }}>{short(one.date)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {(days.find((one) => one.date === day)?.options ?? []).map((one) => (
                  <Pressable
                    key={one.key}
                    onPress={() => setGoing(one.key)}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      marginTop: 8,
                      borderColor: one.key === going ? T.brand : T.line,
                      backgroundColor: one.key === going ? T.tint : T.paper,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: T.ink }}>{one.window}</Text>
                      <Text style={{ color: T.muted, fontSize: 13 }}>
                        {one.onARun ? "On the run" : "A car of its own"}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: "700", color: T.ink }}>
                      {naira(box.food + (one.onARun ? box.runFee : box.carFee) + moved(box))}
                    </Text>
                  </Pressable>
                ))}

                <Text style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>{data.note}</Text>
              </>
            ) : (
              <>
                {/* Days as chips rather than a date field: nobody enjoys a
                    date picker on a phone, and three weeks of days is a
                    swipe. */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {pickable.map((date) => (
                      <Pressable
                        key={date}
                        onPress={() => {
                          setMode("day");
                          setWantedOn(date);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: mode === "day" && wantedOn === date ? T.brand : T.line,
                          backgroundColor: mode === "day" && wantedOn === date ? T.tint : T.paper,
                        }}
                      >
                        <Text style={{ fontWeight: "700", color: T.ink }}>{weekday(date)}</Text>
                        <Text style={{ color: T.muted, fontSize: 12 }}>{short(date)}</Text>
                        {soonest !== "" && date < soonest && (
                          <Text style={{ color: T.brand, fontSize: 11, fontWeight: "700" }}>
                            rush
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                <Pressable
                  onPress={() => setMode(mode === "any" ? "day" : "any")}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    marginTop: 10,
                    borderColor: mode === "any" ? T.brand : T.line,
                    backgroundColor: mode === "any" ? T.tint : T.paper,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: T.ink }}>
                    Any day is fine, tell me
                  </Text>
                </Pressable>

                <Text style={{ color: T.ink, marginTop: 10 }}>
                  <Text style={{ fontWeight: "800" }}>{naira(priceOf(box))}</Text>
                  <Text style={{ color: T.muted }}>
                    {mode === "any"
                      ? " delivery in. We message you to agree the day."
                      : rush
                        ? " delivery in, at the rush price."
                        : " delivery in."}
                  </Text>
                </Text>
              </>
            )}
          </Card>

          {/* One tap, and what it needs only appears once it is on. */}
          <Card>
            <Pressable
              onPress={() => setAgain(!again)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: again ? T.brand : T.line,
                  backgroundColor: again ? T.brand : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {again && <Ionicons name="checkmark" size={15} color="#fff" />}
              </View>
              <Text style={{ fontWeight: "700", color: T.ink, flex: 1 }}>
                Send this again, every so often
              </Text>
            </Pressable>

            {again && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {(
                  [
                    ["weekly", "Every week"],
                    ["fortnightly", "Every 2 weeks"],
                    ["monthly", "Every month"],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setHowOften(value)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: howOften === value ? T.brand : T.line,
                      backgroundColor: howOften === value ? T.tint : T.paper,
                    }}
                  >
                    <Text style={{ color: T.ink, fontWeight: "600" }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {again && (
              <Text style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>
                Nothing charges itself. We message you each time to pay.
              </Text>
            )}
          </Card>

          <Card>
            <Heading>Where it goes</Heading>
            <Field label="Your name" value={name} onChange={setName} />
            <Field label="Your number" value={phone} onChange={setPhone} keyboard="phone-pad" />
            <Field label="Which block it goes to" value={hostel} onChange={setHostel} />

            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              {(
                [
                  ["transfer", "Bank transfer"],
                  ["card", "Card"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setPays(value)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: pays === value ? T.brand : T.line,
                    backgroundColor: pays === value ? T.tint : T.paper,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: T.ink }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Filling it in is what makes it a gift. There is no switch to
                forget, and half of one is refused with a sentence rather
                than quietly becoming an ordinary order. */}
            <Pressable onPress={() => setGifting((was) => !was)} style={{ marginTop: 12 }}>
              <Text style={{ color: T.brand, fontWeight: "700" }}>
                {gifting ? "Not a gift after all" : "It is a gift for somebody else"}
              </Text>
            </Pressable>

            {gifting && (
              <>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>
                  Fill these in and it goes to them instead. You pay, and we deal
                  with you about the money. The block above is theirs.
                </Text>
                <Field label="Their name" value={giftName} onChange={setGiftName} />
                <Field
                  label="Their number"
                  value={giftPhone}
                  onChange={setGiftPhone}
                  keyboard="phone-pad"
                />
              </>
            )}

            {/* The box says what is in it, not which one. Everything below
                that level is where somebody's own birthday lives. */}
            <Text style={{ color: T.muted, fontSize: 12, marginTop: 12 }}>
              A flavour, a size, a colour, something written on it.
            </Text>
            <Field
              label="Want it changed?"
              value={note}
              onChange={setNote}
              placeholder={data.occasion.hint || "Say what you would like different"}
            />
            <Text style={{ color: T.muted, fontSize: 12 }}>
              Anything here can change the price. Nothing extra is charged now:
              we work it out and message you before you pay.
            </Text>

            {/* A mother in London cannot make a Nigerian transfer, and a
                care package is exactly what she is buying. */}
            {pays === "card" && (data.monies ?? []).length > 0 && (
              <>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 12 }}>
                  Is somebody abroad paying? We send a card link in their money.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {[{ code: "", label: "No, naira" }, ...(data.monies ?? [])].map((one) => (
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
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {data.promoters.length > 0 && (
              <>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 12 }}>
                  Where did you hear about us?
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                    {[{ code: "", name: "Nowhere in particular" }, ...data.promoters].map(
                      (one) => (
                        <Pressable
                          key={one.code || "none"}
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
                          <Text style={{ color: T.ink }}>{one.name}</Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </Card>

          {problem !== "" && (
            <Text style={{ color: "#b42318", fontWeight: "700" }}>{problem}</Text>
          )}

          <Pressable
            onPress={place}
            disabled={busy || going === ""}
            style={{
              backgroundColor: busy ? T.muted : T.brand,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              {busy ? "Placing…" : `Order this box · ${naira(priceOf(box))}`}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 16 }}>{children}</View>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ fontWeight: "800", fontSize: 16, color: T.ink }}>{children}</Text>
);

function Field({
  label,
  value,
  onChange,
  keyboard,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  keyboard?: "phone-pad";
  placeholder?: string;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: T.muted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        style={{
          borderWidth: 1,
          borderColor: T.line,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          marginTop: 4,
          color: T.ink,
        }}
      />
    </View>
  );
}

const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-NG", { weekday: "short" });
const short = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
