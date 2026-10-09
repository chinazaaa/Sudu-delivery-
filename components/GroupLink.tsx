"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { naira } from "@/lib/money";
import type { Slot } from "@/lib/same-day";
import { ESTIMATE_NOTE, nextArrival, type ArrivalRun } from "@/lib/arrival";

const KEY = "sudu_group_v2";
const JOINED = "sudu_group_joined_v2";
/** The handful this browser has been in, newest first. */
const SEEN = "sudu_groups_seen_v1";
const KEEP = 5;

export const PARTY_CHANGED = "sudu:party";

/** The group this browser is ordering in, if any. */
export function readGroup(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * The groups this browser actually ordered in, newest first.
 *
 * Only those. Somebody who opened a link and left, or sat in a car that was
 * never closed, has nothing to come back to, and listing it as a group they
 * have been in is offering them a door into nothing. This fills at the one
 * moment there is something behind the door: the group closed and an order
 * came out of it with their name on it.
 */
export function seenGroups(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((one) => typeof one === "string").slice(0, KEEP) : [];
  } catch {
    return [];
  }
}

export function rememberGroup(id: string): void {
  try {
    const list = [id, ...seenGroups().filter((one) => one !== id)].slice(0, KEEP);
    window.localStorage.setItem(SEEN, JSON.stringify(list));
  } catch {
    /* Nothing to do: it is a convenience, not the group itself. */
  }
}

export function enterGroup(id: string, viaLink = false): void {
  try {
    window.localStorage.setItem(KEY, id);
    if (viaLink) window.localStorage.setItem(JOINED, id);
    else window.localStorage.removeItem(JOINED);
  } catch {
    /* Without storage the cookie below still carries the group. */
  }
  // The server keeps its own note, which is what the checkout actually goes
  // on. Without this the group lived in one place and any loss of it sent the
  // order out alone at the full fee.
  void fetch(`/api/party/${id}/enter`, { method: "POST" }).catch(() => {});
  announce();
}

/** Whether this browser arrived on somebody else's link. */
export function joinedViaLink(): boolean {
  try {
    const id = window.localStorage.getItem(KEY);
    return Boolean(id) && window.localStorage.getItem(JOINED) === id;
  } catch {
    return false;
  }
}

export function leaveGroup(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(JOINED);
  } catch {
    /* Nothing to do. */
  }
  // Both halves forget, or the next order quietly joins the last group.
  void fetch("/api/party/leave", { method: "POST" }).catch(() => {});
  announce();
}

function announce(): void {
  try {
    window.dispatchEvent(new Event(PARTY_CHANGED));
  } catch {
    /* Older browsers see it on the next page they open. */
  }
}

/**
 * Start a group: your name, and then the link.
 *
 * The car is not asked for any more. It is whatever is going soonest, worked
 * out by the same rule as every other way of ordering, and a leader who had
 * to pick one was being asked to price a fee ladder and a cut off before she
 * could invite anybody. One answer buys a group that is real and complete the
 * moment the link exists, and whoever joins is told when their food is
 * coming, which is the first thing anybody asks.
 */
export default function GroupLink({
  openNow = false,
  onChoice,
  runs,
  slots,
  today,
  alone = 0,
  splits = true,
}: {
  /** Opened already, because they pressed something that said Start. */
  openNow?: boolean;
  runs: ArrivalRun[];
  slots: Slot[];
  /** Today in Lagos, from the shop's clock, so a run going today can be told
   *  from one going tomorrow. */
  today: string;
  /** Whether that fee really does divide between them. An offer with a
   *  floor under it does not, and a split promised here that the checkout
   *  refuses is worse than saying nothing about it. */
  splits?: boolean;
  /** What delivery costs on this cart alone. A fact about their own food,
   *  which is worth saying; what each of them ends up paying is not, because
   *  it depends on who turns up and what they order, and a figure quoted
   *  before that is a promise nobody made. */
  alone?: number;
  /** Told whenever the chosen way of arriving changes, so the page around
   *  this can draw the ticket the board puts beside the form. */
  onChoice?: (said: string) => void;
}) {
  const [open, setOpen] = useState(openNow);
  const [name, setName] = useState("");
  // Whatever is going soonest: a run today, a car of its own today, a run
  // tomorrow, tomorrow's first window. Nobody picks, here or anywhere else.
  const decided = nextArrival(runs, slots, today);
  // The other way of getting it here, asked of the same rule: once with only
  // runs and once with only cars. A group of people who want dinner tonight
  // should not have to give up on a group because the next run is Saturday.
  const other = decided
    ? (decided.onARun ? nextArrival([], slots, today) : nextArrival(runs, [], today))
    : null;
  const [takeOther, setTakeOther] = useState(false);
  const swap = other !== null && other.said !== decided?.said;
  const going = swap && takeOther ? other : decided;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inGroup, setInGroup] = useState(false);

  useEffect(() => {
    const read = () => setInGroup(readGroup() !== "");
    read();
    window.addEventListener(PARTY_CHANGED, read);
    return () => window.removeEventListener(PARTY_CHANGED, read);
  }, []);

  useEffect(() => {
    onChoice?.(going?.said ?? "");
    // The callback is whatever the page passed this render; following it
    // would fire on every one of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [going?.said]);

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          going?.onARun
            ? { name, batchId: going.runId }
            : { name, deliverAt: going?.at ?? "" }
        ),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "Could not start that group.");
        return;
      }

      enterGroup(data.id);
      // Straight to the group, which is where the sending lives. Firing a
      // share sheet from here meant the one moment that decides whether
      // anybody else turns up happened on a page they were leaving, and if
      // they dismissed it there was nothing to try again with.
      window.location.href = `/g/${data.id}`;
    } catch {
      setError("Could not start that group.");
    } finally {
      setBusy(false);
    }
  };

  // In a group already, the bar at the top says so and this would repeat it.
  if (inGroup) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3 text-left transition active:scale-[0.99]"
      >
        <span>
          <span className="block font-bold text-brand-dark">
            {alone > 0 ? `Delivery on this is ${naira(alone)} on your own` : "Ordering with friends?"}
          </span>
          <span className="block text-sm text-ink/75">
            {alone > 0
              ? splits
                ? "Start a group and that splits evenly between everybody in the car. You each pay for your own food."
                : "Start a group and everybody orders their own food out of one car. Your share of delivery is worked out when it closes."
              : "Start a group and send them a link. Everybody orders their own food and you split one delivery."}
          </span>
        </span>
        <span className="shrink-0 text-sm font-extrabold text-brand-dark">Start</span>
      </button>
    );
  }

  // Both ways of getting it here, as cards. Where there is only one, there
  // is nothing to pick and the card simply says what is happening.
  const ways = swap && other ? [decided!, other] : decided ? [decided] : [];

  return (
    <div
      className={
        openNow
          ? "flex flex-col gap-5 rounded-2xl border-2 border-ink bg-paper p-6 shadow-lift sm:p-7 lg:shadow-[10px_10px_0_#15110e]"
          : "space-y-3 rounded-2xl border-2 border-ink bg-paper p-4 shadow-card"
      }
    >
      {!openNow && <p className="font-bold">Start a group</p>}

      <div>
        <label className="label" htmlFor="group_name">
          Your first name
        </label>
        <input
          id="group_name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Tolu"
          className="field"
          autoComplete="given-name"
        />
        <p className="mt-1.5 text-sm text-muted">
          So the group knows who started it.
        </p>
      </div>

      {ways.length > 0 && (
        <fieldset className="flex flex-col gap-2.5 border-0 p-0">
          <legend className="label mb-2.5">When it arrives</legend>
          {ways.map((way) => {
            const on = way.said === going?.said;
            return (
              <button
                key={way.said}
                type="button"
                aria-pressed={on}
                onClick={() => setTakeOther(way !== decided)}
                className={`flex items-start gap-3.5 rounded-2xl border-2 border-ink p-4 text-left transition ${
                  on
                    ? "bg-ink text-shell shadow-[4px_4px_0_#e5321d]"
                    : "bg-paper"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
                    on ? "bg-brand text-white" : "border-2 border-line"
                  }`}
                >
                  {on && (
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[17px] font-bold">
                      {way.onARun ? "Shared run" : "Private car"}
                    </span>
                    <span
                      className={`ticket px-2 py-1 ${
                        on ? "bg-volt text-ink" : "border border-ink"
                      }`}
                    >
                      {way.onARun ? "Cheapest" : "Faster"}
                    </span>
                  </span>
                  <span className="font-display text-[26px] font-extrabold uppercase leading-none sm:text-[30px]">
                    {way.said}
                  </span>
                  <span
                    className={`text-sm leading-snug ${
                      on ? "text-[#d8d1c7]" : "text-muted"
                    }`}
                  >
                    {way.onARun
                      ? "Rides the run going out then, so it costs less. Everybody who joins is told the same time."
                      : "A car of its own, straight to you. Costs more. Everybody who joins is told the same time."}
                  </span>
                </span>
              </button>
            );
          })}
        </fieldset>
      )}

      <p className="rounded-xl bg-brand-tint px-3.5 py-3 text-sm leading-snug">
        {ESTIMATE_NOTE}
      </p>

      {error !== "" && <p className="text-sm font-semibold text-brand-dark">{error}</p>}

      <button
        type="button"
        onClick={start}
        disabled={busy || name.trim().length < 2 || going === null}
        className={`btn-primary w-full ${openNow ? "border-2 border-ink text-lg" : ""}`}
      >
        {busy ? "Starting…" : "Start the group"}
      </button>

      {openNow && (
        <Link href="/" className="text-center font-semibold">
          Order on your own instead
        </Link>
      )}
    </div>
  );
}
