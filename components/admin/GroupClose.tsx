"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelGroup, closeGroupNow } from "@/app/admin/actions";

type Doing = "" | "close" | "cancel";

/**
 * Closing or binning a group from this side, with whatever stopped it.
 *
 * These were plain forms posting to the actions, and a refusal was thrown,
 * which took the whole page down to the error screen: a React error code and
 * a reference number, in front of somebody standing in a kitchen. The reason
 * belongs beside the button that was pressed.
 */
export default function GroupClose({
  groupId,
  travelling,
  seats,
  empty = false,
}: {
  groupId: string;
  /** Seats a close could make an order out of. */
  travelling: number;
  seats: number;
  /** A link nobody used: there is nothing to close, only to shut. */
  empty?: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState<Doing>("");
  const [busy, setBusy] = useState<Doing>("");
  const [problem, setProblem] = useState("");

  const run = async (what: Exclude<Doing, "">) => {
    setProblem("");
    setBusy(what);
    const form = new FormData();
    form.set("group_id", groupId);
    try {
      const result = what === "close" ? await closeGroupNow(form) : await cancelGroup(form);
      if (!result.ok) {
        setProblem(result.error ?? "That did not work.");
        return;
      }
      setAsking("");
      router.refresh();
    } catch {
      setProblem("That did not work. Try again in a moment.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className={empty ? "shrink-0" : "space-y-2 border-t border-black/5 pt-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {(empty ? (["cancel"] as const) : (["close", "cancel"] as const)).map((what) => {
          const label =
            what === "close" ? "Close it now" : empty ? "Shut it" : "Cancel it";
          const sure =
            what === "close"
              ? "Yes, close it now"
              : empty
                ? "Yes, shut it"
                : "Yes, bin the whole group";
          return asking === what ? (
            <span key={what} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => void run(what)}
                disabled={busy !== ""}
                className={`chip border-transparent text-white ${
                  what === "close" ? "bg-brand" : "bg-ink"
                }`}
              >
                {busy === what ? "…" : sure}
              </button>
              <button
                type="button"
                onClick={() => setAsking("")}
                className="px-1 text-xs font-semibold text-muted"
              >
                No
              </button>
            </span>
          ) : (
            <button
              key={what}
              type="button"
              onClick={() => setAsking(what)}
              className={`chip border-black/10 bg-white ${
                what === "close" ? "text-brand" : ""
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {problem !== "" && <p className="text-sm font-semibold text-brand-dark">{problem}</p>}

      <p className={`text-xs text-muted ${empty ? "hidden" : ""}`}>
        {travelling === 0
          ? "Nobody has given a number and a block yet, so closing it now would order nothing."
          : `Closing makes ${travelling} order${travelling === 1 ? "" : "s"} out of ${seats} ${
              seats === 1 ? "seat" : "seats"
            }. Anybody without details can still give them afterwards. Cancelling bins the food and charges nobody.`}
      </p>
    </div>
  );
}
