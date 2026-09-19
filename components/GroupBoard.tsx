"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { closeSharedGroup } from "@/app/actions";
import { enterGroup, readGroup } from "./GroupLink";
import SendLink from "./SendLink";
import { naira } from "@/lib/money";
import type { Stage } from "@/lib/group-view";

type Member = {
  orderId: string;
  stage: Stage;
  isMine: boolean;
  name: string;
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
  hostels,
}: {
  groupId: string;
  members: Member[];
  mine: Mine;
  closesAt: string;
  leaderOnServer: boolean;
  shareUrl: string;
  leaderName: string;
  hostels: string[];
}) {
  const router = useRouter();
  const [left, setLeft] = useState("");
  const [busy, setBusy] = useState(false);
  const [leader, setLeader] = useState(leaderOnServer);
  const asked = useRef(false);

  // Joining, for somebody who has just opened the link.
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);

  // Their details, filled in while they wait.
  const [phone, setPhone] = useState(mine?.phone ?? "");
  const [hostel, setHostel] = useState(mine?.hostel ?? "");
  const [note, setNote] = useState(mine?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    // The browser that made the link is the only thing that knows it is the
    // leader until they have put food in, so it says so positively.
    if (readGroup() === groupId) setLeader(true);
    else enterGroup(groupId, true);
  }, [groupId]);

  useEffect(() => {
    const tick = () => {
      const ms = new Date(closesAt).getTime() - Date.now();
      if (ms <= 0) {
        setLeft("closing now");
        // Whoever is looking closes it, so a group does not sit at "closing
        // now" waiting for a scheduled job that may not be running.
        if (!asked.current && members.length > 0) {
          asked.current = true;
          const form = new FormData();
          form.set("group_id", groupId);
          void closeSharedGroup(form)
            .catch(() => {
              asked.current = false;
            })
            .finally(() => router.refresh());
        }
        return;
      }
      const mins = Math.floor(ms / 60000);
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
    setJoining(true);
    try {
      await fetch(`/api/party/${groupId}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      router.refresh();
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
        body: JSON.stringify({ phone, hostel, note }),
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

      {/* In, but has not chosen anything yet. */}
      {mine?.stage === "shopping" && (
        <section className="card space-y-2 border-2 border-brand/30 bg-brand-tint">
          <h2 className="font-bold text-brand-dark">
            {mine.hasFood ? "Finish choosing your food" : "Now pick your food"}
          </h2>
          <p className="text-sm text-ink/75">
            Add what you want, then press Finalise in the cart. Nothing is charged
            yet: your share of delivery is worked out when this closes.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-primary w-full"
          >
            {mine.hasFood ? "Back to the menu" : "Open the menu"}
          </button>
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

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">
            {members.length === 0
              ? "Nobody has joined yet"
              : `${ready} of ${members.length} ready`}
          </h2>
          <span className="text-sm font-semibold text-brand-dark">
            {members.length === 0 ? "15 minutes from the first order" : left}
          </span>
        </div>

        <p className="text-sm text-muted">
          {members.length === 0
            ? "Send the link round. The clock only starts once somebody has ordered, so take your time."
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

        <SendLink
          message={invite}
          tone="quiet"
          label={members.length === 0 ? "Send the link on WhatsApp" : "Add somebody on WhatsApp"}
        />

        {leader && members.length > 0 && (
          <form
            action={closeSharedGroup}
            onSubmit={() => setBusy(true)}
            className="border-t border-black/10 pt-3"
          >
            <input type="hidden" name="group_id" value={groupId} />
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Closing…" : "Close the cart and work out what we owe"}
            </button>
            <p className="mt-1 text-center text-xs text-muted">
              Nobody can add after this. Anybody who has not given their details yet
              is left out, so give them a nudge first.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
