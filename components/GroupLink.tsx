"use client";

import { useEffect, useState } from "react";
import { naira } from "@/lib/money";
import type { Slot } from "@/lib/same-day";

const KEY = "sudu_group_v2";
const JOINED = "sudu_group_joined_v2";

export const PARTY_CHANGED = "sudu:party";

/** The group this browser is ordering in, if any. */
export function readGroup(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
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
 * Start a group: your name, when it arrives, and then the link.
 *
 * Both answers are needed before there is anything to share. Without a name
 * the group is nobody's, and without a car nobody joining can be told when
 * their food is coming, which is the first thing anybody asks. Two taps buys
 * a group that is real and complete the moment the link exists.
 */
export default function GroupLink({
  runs,
  slots,
  sameDayFrom,
  runFrom,
}: {
  runs: { id: string; label: string }[];
  slots: Slot[];
  sameDayFrom: number;
  runFrom: number;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  // One control, two kinds of answer. A time is the instant itself; a run is
  // its id behind a marker, because the two cannot share a value space.
  const [choice, setChoice] = useState(
    slots[0] ? slots[0].at : runs[0] ? `run:${runs[0].id}` : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inGroup, setInGroup] = useState(false);

  useEffect(() => {
    const read = () => setInGroup(readGroup() !== "");
    read();
    window.addEventListener(PARTY_CHANGED, read);
    return () => window.removeEventListener(PARTY_CHANGED, read);
  }, []);

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          choice.startsWith("run:")
            ? { name, batchId: choice.slice(4) }
            : { name, deliverAt: choice }
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
          <span className="block font-bold text-brand-dark">Ordering with friends?</span>
          <span className="block text-sm text-ink/75">
            Start a group and send them a link. Everybody orders their own food and
            you split one delivery.
          </span>
        </span>
        <span className="shrink-0 text-sm font-extrabold text-brand-dark">Start</span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-brand/30 bg-brand-tint p-4">
      <p className="font-bold text-brand-dark">Start a group</p>

      <div>
        <label className="label" htmlFor="group_name">
          Your first name
        </label>
        <input
          id="group_name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nasa"
          className="field"
        />
        <p className="mt-1 text-xs text-ink/70">So they know whose group they joined.</p>
      </div>

      <div>
        <label className="label" htmlFor="group_when">
          When does it arrive?
        </label>
        <select
          id="group_when"
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          className="field"
        >
          {slots.length > 0 && (
            <optgroup label={`A car to yourselves · from ${naira(sameDayFrom)}`}>
              {slots.map((slot) => (
                <option key={slot.at} value={slot.at}>
                  {slot.label}
                  {slot.urgent ? " · urgent" : ""}
                </option>
              ))}
            </optgroup>
          )}
          {runs.length > 0 && (
          <optgroup label={`On a run, shared · from ${naira(runFrom)}`}>
            {runs.map((run) => (
              <option key={run.id} value={`run:${run.id}`}>
                {run.label}
              </option>
            ))}
          </optgroup>
          )}
        </select>
        <p className="mt-1 text-xs text-ink/70">
          You pick it once, for everybody. They see it when they join.
        </p>
      </div>

      {error !== "" && <p className="text-sm font-semibold text-brand-dark">{error}</p>}

      <button
        type="button"
        onClick={start}
        disabled={busy || name.trim().length < 2 || choice === ""}
        className="btn-primary w-full"
      >
        {busy ? "Starting…" : "Start the group"}
      </button>
    </div>
  );
}
