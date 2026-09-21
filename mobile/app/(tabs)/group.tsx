import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  api,
  ESTIMATE_NOTE,
  lagosToday,
  naira,
  nextArrival,
  type GroupBoard,
} from "@/lib/api";
import { cart, countItems, me, party, pastParties, useStored, type Party } from "@/lib/store";
import { T } from "@/lib/theme";

const SITE = "https://sudu.store";

/**
 * Ordering together.
 *
 * One delivery for the whole car, split evenly, and everybody orders and pays
 * for their own food. The website has had this for a while; this is the same
 * thing, against the same routes, so there is one rule about who is in a car
 * and what it costs rather than two that drift.
 *
 * The seat is what says who somebody is. The website keeps it in a cookie it
 * cannot read; this keeps it itself and sends it with every call, and never
 * shows it to anybody.
 */
export default function Group() {
  const router = useRouter();
  // A tapped link lands here with the code on it. It is only ever a way in:
  // the seat call swaps it for the group's real id, and nothing else is
  // allowed to see it.
  const { code: arrived } = useLocalSearchParams<{ code?: string }>();
  const [seated] = useStored(party.read, null);
  const [past] = useStored(pastParties.read, []);
  const [shop] = useStored(() => api.shop().catch(() => null), null);
  const [lines] = useStored(cart.read, []);

  const [board, setBoard] = useState<GroupBoard | null>(null);
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  const runs = shop?.runs.filter((one) => !one.closed && !one.full) ?? [];
  const slots = shop?.sameDay?.slots ?? [];

  // The car is not asked for any more. It is whatever is going soonest,
  // worked out by the same rule as every other way of ordering, and a leader
  // who had to pick one was being asked to price a fee ladder and a cut off
  // before she could invite anybody.
  const going = nextArrival(runs, slots, lagosToday());

  useEffect(() => {
    if (going) setWhen(going.onARun ? `run:${going.runId}` : going.at);
  }, [going?.runId, going?.at]);

  useEffect(() => {
    void me.read().then((saved) => setName((was) => was || saved.name.split(" ")[0]));
  }, []);

  useEffect(() => {
    if (arrived) setCode(String(arrived));
  }, [arrived]);

  /** The board, kept current while somebody is looking at it. */
  const look = useCallback(async () => {
    if (!seated) {
      setBoard(null);
      return;
    }
    try {
      const answer = await api.group.board(seated.id, seated.seat);
      setBoard(answer);
      // Closed and priced: the car is over, and their own order is where the
      // total is. The group is remembered as one they ordered in.
      if (answer.closed) {
        await pastParties.remember({ id: seated.id, leader: seated.leader });
        await party.leave();
      }
    } catch {
      /* Offline is not a reason to throw somebody out of their group. */
    }
  }, [seated]);

  useEffect(() => {
    void look();
    const timer = setInterval(look, 8000);
    return () => clearInterval(timer);
  }, [look]);

  const start = async () => {
    setProblem("");
    if (name.trim().length < 2) {
      setProblem("Your first name, so they know whose group they joined.");
      return;
    }
    setBusy(true);
    try {
      const answer = await api.group.start(
        {
          name: name.trim(),
          ...(when.startsWith("run:")
            ? { batchId: when.slice(4) }
            : { deliverAt: when }),
        },
        null
      );
      await party.join({
        id: answer.id,
        short: answer.short,
        seat: answer.seat,
        leader: name.trim(),
      });
      void look();
    } catch (problem) {
      setProblem(problem instanceof Error ? problem.message : "Could not start that.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setProblem("");
    const typed = code.trim().split("/").pop() ?? "";
    if (typed.length < 4) {
      setProblem("Paste the link they sent you, or the code at the end of it.");
      return;
    }
    if (name.trim().length < 2) {
      setProblem("Your first name first, so the others know who is in.");
      return;
    }
    setBusy(true);
    try {
      const answer = await api.group.enter(typed, name.trim(), null);
      // The group's real id, never the code: a code is a way in, and every
      // lookup after this one needs the id.
      await party.join({
        id: answer.groupId,
        short: typed.length <= 12 ? typed : null,
        seat: answer.seat,
        leader: "",
      });
      setCode("");
      void look();
    } catch (problem) {
      setProblem(problem instanceof Error ? problem.message : "Could not join that group.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!seated) return;
    setBusy(true);
    try {
      await api.group.leave(seated.id, seated.seat);
    } catch {
      /* Their seat may already be gone. Forgetting it here is the point. */
    }
    await party.leave();
    setBoard(null);
    setBusy(false);
  };

  const close = async () => {
    if (!seated) return;
    setProblem("");
    setBusy(true);
    try {
      const answer = await api.group.close(seated.id, seated.seat);
      await pastParties.remember({ id: seated.id, leader: seated.leader });
      await party.leave();
      if (answer.orderId) router.push(`/order/${answer.orderId}`);
    } catch (problem) {
      setProblem(problem instanceof Error ? problem.message : "Could not close it.");
    } finally {
      setBusy(false);
    }
  };

  const link = seated ? `${SITE}/g/${seated.short ?? seated.id}` : "";

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }}>
      {!seated && (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: T.ink }}>
            Ordering together
          </Text>
          <Text style={{ color: T.muted }}>
            One delivery for the whole car, split evenly between everybody in it.
            You each order your own food and pay for your own.
          </Text>
        </View>
      )}

      {seated && board?.started && (
        <Board
          board={board}
          link={link}
          waiting={countItems(lines)}
          busy={busy}
          problem={problem}
          onFinalise={() => router.push("/cart")}
          onClose={close}
          onLeave={leave}
        />
      )}

      {!seated && (
        <>
          <View style={card()}>
            <Text style={{ fontWeight: "800", color: T.brandDark }}>Start a group</Text>

            <Text style={{ color: T.muted, marginTop: 8, marginBottom: 4 }}>
              Your first name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              placeholderTextColor={T.muted}
              style={field()}
            />

            {/* Said, not asked. The group goes on whatever is going soonest,
                which is the same answer the checkout gives anybody ordering
                alone. */}
            {going && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: T.muted, marginBottom: 2 }}>When it arrives</Text>
                <Text style={{ fontWeight: "800", color: T.ink }}>
                  Order now, get it {going.said}
                </Text>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>
                  {going.onARun
                    ? "It rides the run going out then, which is why it costs less. Everybody who joins is told the same time."
                    : "A car of your own, because no run is going in time for this. Everybody who joins is told the same time."}
                </Text>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>
                  {ESTIMATE_NOTE}
                </Text>
              </View>
            )}

            {problem !== "" && (
              <Text style={{ color: T.brandDark, fontWeight: "700", marginTop: 8 }}>
                {problem}
              </Text>
            )}

            <Pressable
              onPress={start}
              // Nothing going means no car to put a group in. Starting one
              // would make a group with nowhere to go, which is worse than a
              // button that waits.
              disabled={busy || !going || name.trim().length < 2}
              style={{
                marginTop: 12,
                backgroundColor: T.brand,
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: T.paper, fontWeight: "800" }}>
                {busy ? "Starting…" : "Start the group"}
              </Text>
            </Pressable>
          </View>

          <View style={card()}>
            <Text style={{ fontWeight: "800", color: T.ink }}>
              {arrived ? "Join this group" : "Somebody sent you a link?"}
            </Text>
            <Text style={{ color: T.muted, marginTop: 2 }}>
              {arrived
                ? "Say who you are and you are in their car. Everybody orders their own food and pays for their own."
                : "Paste it here and you are in their car."}
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="sudu.store/g/…"
              placeholderTextColor={T.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ ...field(), marginTop: 8 }}
            />
            <Pressable
              onPress={join}
              disabled={busy}
              style={{
                marginTop: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: T.line,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800", color: T.ink }}>
                {busy ? "Joining…" : "Join their group"}
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {past.length > 0 && !seated && (
        <View style={card()}>
          <Text style={{ fontWeight: "800", color: T.ink }}>Groups you ordered in</Text>
          {past.map((one) => (
            <Pressable
              key={one.id}
              onPress={() => void Linking.openURL(`${SITE}/g/${one.id}?split=1`)}
              style={{ paddingVertical: 10 }}
            >
              <Text style={{ fontWeight: "700", color: T.ink }}>
                {one.leader || "A group"}
              </Text>
              <Text style={{ color: T.brand, fontWeight: "700", fontSize: 13 }}>
                See the split
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/** The car as everybody in it sees it: who is in, what it costs, how long. */
function Board({
  board,
  link,
  waiting,
  busy,
  problem,
  onFinalise,
  onClose,
  onLeave,
}: {
  board: GroupBoard;
  link: string;
  /** What is sitting in this phone's cart, which is not the same as what
   *  they have put into the group. */
  waiting: number;
  busy: boolean;
  problem: string;
  onFinalise: () => void;
  onClose: () => void;
  onLeave: () => void;
}) {
  const [left, setLeft] = useState("");
  const mine = (board.members ?? []).find((one) => one.isMine) ?? null;

  useEffect(() => {
    const tick = () => {
      if (!board.closesAt) return;
      const ms = new Date(board.closesAt).getTime() - Date.now();
      if (ms <= 0) {
        setLeft("closing now");
        return;
      }
      const mins = Math.floor(ms / 60000);
      // Before anybody finalises this is the run's own cut off, which can be
      // most of a day away. Printing it as minutes read "closes in 1053m".
      if (mins >= 20) {
        setLeft("15 minutes from the first finish");
        return;
      }
      setLeft(`closes in ${mins}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}s`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [board.closesAt]);

  return (
    <View style={{ gap: 12 }}>
      <View style={card()}>
        <Text style={{ fontWeight: "800", color: T.brandDark, fontSize: 12 }}>
          {(board.leader ?? "").toUpperCase()}
          {board.leader ? "'S DELIVERY" : "YOUR GROUP"}
        </Text>
        <Text style={{ fontSize: 20, fontWeight: "800", color: T.ink, marginTop: 2 }}>
          {(board.people ?? 0) === 0
            ? "Nobody has joined yet"
            : `${board.people} ${board.people === 1 ? "person" : "people"} · ${
                board.ready ?? 0
              } ready`}
        </Text>
        <Text style={{ color: T.muted, marginTop: 2 }}>
          {board.sameDay ? "Going out" : "Arriving"} {board.when}
        </Text>

        {(board.eachNow ?? 0) > 0 && (
          <View
            style={{
              marginTop: 10,
              backgroundColor: T.tint,
              borderRadius: 14,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: "800", color: T.brandDark }}>
              About {naira(board.eachNow ?? 0)} each right now
            </Text>
            <Text style={{ color: T.ink, fontSize: 13, marginTop: 2 }}>
              {board.offer
                ? `${board.offer}. It is split between you, down to a floor, so it falls as people join and then holds there.`
                : "It moves as people add food and as more of you join. Nothing is fixed until this closes."}
            </Text>
          </View>
        )}

        <Text style={{ color: T.brandDark, fontWeight: "700", marginTop: 10 }}>{left}</Text>
      </View>

      {/* Their own food, and the one button that finishes it. Finalising asks
          for the number, the block and how they are paying in one sheet on
          the cart, so this never asks any of it. */}
      {!mine?.finalised && (
        <View style={{ ...card(), backgroundColor: T.tint }}>
          <Text style={{ fontWeight: "800", color: T.brandDark }}>
            {waiting > 0 ? `You have ${waiting} item${waiting === 1 ? "" : "s"} in your cart` : "Pick your food"}
          </Text>
          <Text style={{ color: T.ink, marginTop: 2 }}>
            {waiting > 0
              ? "It is not in the group until you finalise it. Nothing is charged yet: your share of delivery is worked out when this closes."
              : "Whatever you put in your cart rides in this car. Your share of delivery is worked out when it closes."}
          </Text>
          <Pressable
            onPress={onFinalise}
            style={{
              marginTop: 10,
              backgroundColor: T.brand,
              borderRadius: 999,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: T.paper, fontWeight: "800" }}>
              {waiting > 0 ? "Review and finalise my food" : "Open the menu"}
            </Text>
          </Pressable>
        </View>
      )}

      {mine?.finalised && (
        <Text
          style={{
            backgroundColor: "rgba(31,138,112,0.1)",
            borderRadius: 12,
            padding: 10,
            textAlign: "center",
            fontWeight: "700",
            color: "#1f8a70",
          }}
        >
          You are ready. You will get your total the moment this closes.
        </Text>
      )}

      <View style={card()}>
        <Text style={{ fontWeight: "800", color: T.ink }}>Who is in</Text>
        {(board.members ?? []).map((one, index) => (
          <View
            key={`${one.name}-${index}`}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              paddingVertical: 8,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: T.line,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: T.ink }}>
                {one.name}
                {one.isMine ? " · you" : ""}
              </Text>
              <Text style={{ color: T.muted, fontSize: 13 }}>
                {one.items === 0
                  ? "Still choosing"
                  : one.summary || `${one.items} item${one.items === 1 ? "" : "s"}`}
              </Text>
            </View>
            <Text style={{ color: one.ready ? "#1f8a70" : T.muted, fontWeight: "700" }}>
              {one.ready ? "Ready" : "Adding"}
            </Text>
          </View>
        ))}
      </View>

      {problem !== "" && (
        <Text style={{ color: T.brandDark, fontWeight: "700" }}>{problem}</Text>
      )}

      <View style={{ gap: 8 }}>
        <Pressable
          onPress={() =>
            void Share.share({
              message:
                `${board.leader || "Somebody"} is ordering food to campus with Sudu. ` +
                `Add yours and we split one delivery fee: ${link}`,
            })
          }
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: T.line,
            paddingVertical: 12,
            alignItems: "center",
            backgroundColor: T.paper,
          }}
        >
          <Text style={{ fontWeight: "800", color: T.ink }}>Send somebody the link</Text>
        </Pressable>

        <Pressable
          onPress={() => void Clipboard.setStringAsync(link)}
          style={{ paddingVertical: 8, alignItems: "center" }}
        >
          <Text style={{ color: T.muted, fontWeight: "700" }}>Copy link</Text>
        </Pressable>

        {/* Only whoever made the link, exactly as the website has it. The
            server decides that from the seat and says so; asking the phone
            would say yes to everybody, since every member holds the group
            id. Anybody else waits for them or for the clock. */}
        {board.leaderIsMine && (board.ready ?? 0) > 0 && (
          <Pressable
            onPress={onClose}
            disabled={busy}
            style={{
              backgroundColor: T.ink,
              borderRadius: 999,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: T.paper, fontWeight: "800" }}>
              {busy
                ? "Closing…"
                : (board.ready ?? 0) === (board.people ?? 0)
                  ? "Everybody is ready. Close it"
                  : "Close it and get everybody's total"}
            </Text>
          </Pressable>
        )}

        {!board.leaderIsMine && (board.people ?? 0) > 0 && (
          <Text style={{ color: T.muted, textAlign: "center", fontSize: 13 }}>
            {(board.ready ?? 0) === (board.people ?? 0)
              ? `Everybody is ready. Waiting for ${
                  board.leader || "whoever started it"
                } to close it, or for the clock to run out.`
              : `${
                  board.leader || "Whoever started it"
                } closes this when everybody is ready, or the clock does.`}
          </Text>
        )}

        <Pressable onPress={onLeave} disabled={busy} style={{ paddingVertical: 10, alignItems: "center" }}>
          <Text style={{ color: T.muted, fontWeight: "700" }}>Leave this group</Text>
        </Pressable>
      </View>
    </View>
  );
}

function card() {
  return { backgroundColor: T.paper, borderRadius: T.radius, padding: 14 } as const;
}

function field() {
  return {
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: T.ink,
    backgroundColor: T.paper,
  } as const;
}
