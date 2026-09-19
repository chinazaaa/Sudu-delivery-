"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { closeSharedGroup } from "@/app/actions";
import { enterGroup, readGroup } from "./GroupLink";
import PayChoice from "./PayChoice";
import SendLink from "./SendLink";
import { countItems, useCart } from "@/lib/cart";
import { naira } from "@/lib/money";
import type { Stage } from "@/lib/group-view";

type Member = {
  orderId: string;
  stage: Stage;
  isMine: boolean;
  name: string;
  summary: string;
  items: number;
  food: number;
  done: boolean;
  paid: boolean;
  isLeader: boolean;
  phone: string;
};

type Mine = {
  stage: Stage;
  hasFood: boolean;
  phone: string;
  hostel: string;
  note: string;
} | null;

const WORDS: Record<Stage, string> = {
  shopping: "Still choosing",
  details: "Needs their details",
  ready: "Ready",
  unpaid: "Not paid yet",
  paid: "Paid",
};

/**
 * A shared delivery, live, while it fills up.
 *
 * Three things happen in order and everybody can see where everybody else has
 * got to: choosing food, saying where it goes, and paying. Splitting them
 * apart is what lets somebody join with nothing but a first name, and fill in
 * a phone number in the dead minutes while the last person is still deciding,
 * rather than being asked for it before they have chosen a drink.
 */
export default function GroupBoard({
  groupId,
  members,
  mine,
  closesAt,
  leaderOnServer,
  shareUrl,
  leaderName,
  eachNow,
  offer,
  hostels,
}: {
  groupId: string;
  members: Member[];
  mine: Mine;
  closesAt: string;
  leaderOnServer: boolean;
  shareUrl: string;
  leaderName: string;
  /** What delivery would cost each of them if it closed now. */
  eachNow: number;
  /** The promotion pricing this car, if one is. */
  offer?: string;
  hostels: string[];
}) {
  const router = useRouter();
  // What is sitting in this browser's cart, which is not the same thing as
  // what they have put into the group. Somebody who filled a cart and then
  // opened the link has food, and being told to go and pick some is the page
  // not looking at what is in front of it.
  const cart = useCart();
  const waiting = countItems(cart);
  const [left, setLeft] = useState("");
  const [busy, setBusy] = useState(false);
  // Asked here rather than assumed, because a group order never went past a
  // checkout screen and everybody was being written down as a transfer.
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  // Closing cannot be undone and leaves behind anybody still choosing, so it
  // is asked rather than done, from wherever it is pressed.
  const [confirming, setConfirming] = useState(false);

  const asked = useRef(false);
  const [closeProblem, setCloseProblem] = useState("");

  /**
   * Close it now, and say what stopped it when something does.
   *
   * This was a plain form posting to the action, which gave back nothing: a
   * refusal left the button reading "Closing…" and the group open, with
   * nothing on the screen to say why.
   */
  const closeNow = async () => {
    setCloseProblem("");
    setBusy(true);
    const form = new FormData();
    form.set("group_id", groupId);
    try {
      const result = await closeSharedGroup(form);
      if (!result.ok) {
        setCloseProblem(result.error ?? "Could not close that.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setCloseProblem("Could not close that. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  // Joining, for somebody who has just opened the link.
  // The person who made the link already said who they are. Asking again is
  // asking a question that has been answered, so it is filled in for them and
  // one tap gets them in.
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinProblem, setJoinProblem] = useState("");

  // Their details, filled in while they wait.
  const [phone, setPhone] = useState(mine?.phone ?? "");
  const [hostel, setHostel] = useState(mine?.hostel ?? "");
  const [note, setNote] = useState(mine?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  // Whose group it is comes from the server, which can prove it. Every
  // member's browser holds the group id, so asking the browser meant every
  // member believed they were the leader.
  const leader = leaderOnServer;

  useEffect(() => {
    if (readGroup() !== groupId) enterGroup(groupId, true);
  }, [groupId]);

  useEffect(() => {
    const tick = () => {
      const ms = new Date(closesAt).getTime() - Date.now();
      if (ms <= 0) {
        setLeft("closing now");
        // Whoever is looking closes it, so a group does not sit at "closing
        // now" waiting for a scheduled job that may not be running.
        if (!asked.current && members.some((one) => one.items > 0)) {
          asked.current = true;
          const form = new FormData();
          form.set("group_id", groupId);
          void closeSharedGroup(form)
            .then((result) => {
              // Refused rather than broken: say so, and let it be tried
              // again, because the group is still open.
              if (!result.ok) {
                asked.current = false;
                setCloseProblem(result.error ?? "");
              }
            })
            .catch(() => {
              asked.current = false;
            })
            .finally(() => router.refresh());
        }
        return;
      }
      const mins = Math.floor(ms / 60000);
      // The quarter of an hour only starts when somebody finalises. Until
      // then closes_at is the run's own cut off, which can be most of a day
      // away, and printing that as minutes read "closes in 1053m".
      if (mins >= 20) {
        setLeft("15 minutes from the first finish");
        return;
      }
      const secs = Math.floor((ms % 60000) / 1000);
      setLeft(`closes in ${mins}m ${String(secs).padStart(2, "0")}s`);
    };
    tick();
    const clock = setInterval(tick, 1000);
    const poll = setInterval(() => router.refresh(), 8000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [closesAt, router, groupId, members.length]);

  const join = async () => {
    setJoinProblem("");
    setJoining(true);
    try {
      const response = await fetch(`/api/party/${groupId}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        named?: boolean;
      };

      // Saying nothing and showing the same box again reads as the button not
      // working, and there is no way to tell that from the box being right.
      if (!response.ok || !data.named) {
        setJoinProblem(
          "Could not put you in that group just now. Give it a moment and try again."
        );
        return;
      }
      router.refresh();
    } catch {
      setJoinProblem("Could not reach the shop. Check your connection.");
    } finally {
      setJoining(false);
    }
  };

  const saveDetails = async () => {
    setProblem("");
    setSaving(true);
    try {
      const response = await fetch(`/api/party/${groupId}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, hostel, note, paymentMethod: method }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setProblem(data.error ?? "Could not save that.");
        return;
      }
      router.refresh();
    } catch {
      setProblem("Could not save that.");
    } finally {
      setSaving(false);
    }
  };

  const ready = members.filter((one) => one.stage === "ready").length;
  // Nobody has put food in yet, so the clock has nothing to count down to:
  // it does not start until the first person finalises.
  const anyFood = members.some((one) => one.items > 0);
  const invite =
    `${leaderName} is ordering food to campus with Sudu. Add yours and we ` +
    `split one delivery fee: ${shareUrl}`;

  return (
    <div className="space-y-4">
      {/* Not in yet. Over everything, because it is the only thing to do and
          reading the board first would be reading about strangers. One
          question, and it is the one the others need answered. */}
      {!mine && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-paper p-5 shadow-bar">
            <div>
              <h2 className="text-lg font-extrabold">Join {leaderName}&apos;s delivery</h2>
              <p className="mt-1 text-sm text-muted">
                Everybody picks their own food and pays for their own food. The
                delivery is one fee for the whole car, split evenly between you.
              </p>
            </div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim().length >= 2) void join();
              }}
              placeholder="Your first name"
              aria-label="Your first name"
              autoFocus
              className="field"
            />
            <p className="text-xs text-muted">
              So the others know who is in. Nothing else is asked for yet.
            </p>
            {joinProblem !== "" && (
              <p className="text-sm font-semibold text-brand-dark">{joinProblem}</p>
            )}
            <button
              type="button"
              onClick={join}
              disabled={joining || name.trim().length < 2}
              className="btn-primary w-full"
            >
              {joining ? "Joining…" : "Join and pick my food"}
            </button>
          </div>
        </div>
      )}

      {/* In, and still choosing. What they are told depends on whether there
          is already food in their cart. */}
      {mine?.stage === "shopping" && (
        <section className="card space-y-2 border-2 border-brand/30 bg-brand-tint">
          <h2 className="font-bold text-brand-dark">
            {waiting > 0
              ? `You have ${waiting} item${waiting === 1 ? "" : "s"} in your cart`
              : "Now pick your food"}
          </h2>
          <p className="text-sm text-ink/75">
            {waiting > 0
              ? "It is not in the group until you finalise it. Nothing is charged yet: your share of delivery is worked out when this closes."
              : "Add what you want, then press Finalise in the cart. Nothing is charged yet: your share of delivery is worked out when this closes."}
          </p>
          <button
            type="button"
            onClick={() => router.push(waiting > 0 ? "/cart" : "/")}
            className="btn-primary w-full"
          >
            {waiting > 0 ? "Review and finalise my food" : "Open the menu"}
          </button>
          {waiting > 0 && (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full text-sm font-semibold text-brand-dark"
            >
              Add something else first
            </button>
          )}
        </section>
      )}

      {/* Food settled, nowhere to send it. The dead time is for this. */}
      {mine?.stage === "details" && (
        <section className="card space-y-3 border-2 border-brand/30 bg-brand-tint">
          <div>
            <h2 className="font-bold text-brand-dark">Where does your food go?</h2>
            <p className="text-sm text-ink/75">
              Fill this in while the others finish. Your number is how you get called
              when it lands, and it is what opens your order afterwards.
            </p>
          </div>

          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Your phone number"
            aria-label="Your phone number"
            inputMode="tel"
            className="field"
          />

          {hostels.length > 0 ? (
            <select
              value={hostel}
              onChange={(event) => setHostel(event.target.value)}
              aria-label="Your block"
              className="field"
            >
              <option value="">Which block?</option>
              {hostels.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={hostel}
              onChange={(event) => setHostel(event.target.value)}
              placeholder="Your hostel or block"
              aria-label="Your hostel or block"
              className="field"
            />
          )}

          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything we should know? (optional)"
            aria-label="Anything we should know"
            className="field"
          />

          <PayChoice value={method} onChange={setMethod} />

          {problem !== "" && (
            <p className="text-sm font-semibold text-brand-dark">{problem}</p>
          )}

          <button
            type="button"
            onClick={saveDetails}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? "Saving…" : "That is me, I am ready"}
          </button>
        </section>
      )}

      {mine?.stage === "ready" && (
        <p className="rounded-xl bg-mint/10 px-3 py-2 text-center text-sm font-semibold text-mint">
          You are ready. You will get your total the moment this closes.
        </p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-paper p-5 shadow-bar">
            <h2 className="text-lg font-extrabold">Close the cart?</h2>
            <p className="text-sm text-muted">
              {ready} of {members.length} {members.length === 1 ? "person is" : "people are"}{" "}
              ready. Delivery is worked out and split evenly, and everybody gets
              their total. Nobody can add after this, and anybody who has not
              finalised is left out.
            </p>
            {closeProblem !== "" && (
              <p className="text-sm font-semibold text-brand-dark">{closeProblem}</p>
            )}
            <button
              type="button"
              onClick={closeNow}
              disabled={busy}
              className="btn-primary w-full"
            >
              {busy ? "Closing…" : "Yes, close it"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="w-full text-sm font-semibold text-muted"
            >
              Not yet
            </button>
          </div>
        </div>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">
            {members.length === 0
              ? "Nobody has joined yet"
              : !anyFood
                ? `${members.length} in, nobody has finalised yet`
                : `${ready} of ${members.length} ready`}
          </h2>
          <span className="text-sm font-semibold text-brand-dark">
            {anyFood ? left : "15 minutes from the first order"}
          </span>
        </div>

        {closeProblem !== "" && !confirming && (
          <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
            {closeProblem}
          </p>
        )}

        <p className="text-sm text-muted">
          {!anyFood
            ? "Send the link round. The clock only starts once somebody finalises their food, so take your time."
            : ready === members.length
              ? "Everybody is done, so this is closing now."
              : leader
                ? "Close it as soon as everyone is ready, or wait for the clock."
                : `Waiting for ${leaderName} to close it, or for the clock to run out.`}
        </p>

        {members.length > 0 && (
          <ul className="divide-y divide-black/5">
            {members.map((one) => (
              <li key={one.orderId} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-semibold">
                    {one.name}
                    {one.isMine && <span className="text-muted"> · you</span>}
                  </span>
                  <span className="block text-xs text-muted">
                    {one.items === 0
                      ? "nothing yet"
                      : `${one.items} item${one.items === 1 ? "" : "s"} · ${naira(one.food)}`}
                  </span>
                  {/* What they put in. A shared cart that only says how many
                      is not a cart anybody can look at. */}
                  {one.summary !== "" && (
                    <span className="block truncate text-xs text-ink/70">{one.summary}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      one.stage === "ready" || one.stage === "paid"
                        ? "text-mint"
                        : "text-muted"
                    }`}
                  >
                    {WORDS[one.stage]}
                  </span>
                  {/* Only somebody being waited on, and only while it is open.
                      There is no other reason to have their number. */}
                  {one.phone && !one.isMine && one.stage !== "ready" && (
                    <a
                      href={`tel:${one.phone}`}
                      className="chip border-black/10 bg-white py-1 text-xs"
                    >
                      Nudge
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">Delivery is worked out when this closes</h2>
          <p className="text-sm text-muted">
            One fee for the whole car, split evenly between everybody in it. The more
            of you there are, the less each of you pays, so nobody can be told their
            share until the last person is done.
          </p>
        </div>

        {/* Where it stands, so the thing that makes sharing worth it is
            visible while it is happening rather than only at the end. */}
        {eachNow > 0 && (
          <div className="rounded-2xl bg-brand-tint px-4 py-3">
            <p className="text-sm font-semibold text-brand-dark">
              About {naira(eachNow)} each right now
            </p>
            <p className="mt-0.5 text-xs text-ink/70">
              {offer
                ? `${offer}. It is split between you, down to a floor, so it falls as people join and then holds there.`
                : "It moves as people add food and as more of you join. Nothing is fixed until this closes."}
            </p>
          </div>
        )}

        <SendLink
          message={invite}
          link={shareUrl}
          tone="quiet"
          label={members.length === 0 ? "Send the link on WhatsApp" : "Add somebody on WhatsApp"}
        />

        {leader && anyFood && (
          <div className="border-t border-black/10 pt-3">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="btn-primary w-full"
            >
              Close the cart and work out what we owe
            </button>
            <p className="mt-1 text-center text-xs text-muted">
              Nobody can add after this. Anybody who has not finalised their food
              yet is left out, so give them a nudge first.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
