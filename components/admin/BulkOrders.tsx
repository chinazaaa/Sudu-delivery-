"use client";

import { createContext, useActionState, useContext, useMemo, useState } from "react";
import { doManyOrders, type BulkState } from "@/app/admin/actions";

type Picked = {
  on: Set<string>;
  toggle: (id: string, total: number) => void;
  totals: Map<string, number>;
};

const Held = createContext<Picked | null>(null);

/**
 * Ticking several orders and doing one thing to all of them.
 *
 * Marking eight orders paid one at a time is eight page loads, and on a
 * Saturday morning with the bank app open beside this it is the slowest
 * part of the job.
 *
 * The state lives here rather than on the page so the list itself stays a
 * server component: each card is still rendered on the server with its real
 * data, and only the tick beside it knows anything about React.
 */
export function Picking({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState<Set<string>>(new Set());
  const [totals] = useState<Map<string, number>>(new Map());

  const value = useMemo<Picked>(
    () => ({
      on,
      totals,
      toggle: (id, total) => {
        totals.set(id, total);
        setOn((was) => {
          const next = new Set(was);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
    }),
    [on, totals]
  );

  return <Held.Provider value={value}>{children}</Held.Provider>;
}

/** The tick beside one order. */
export function Tick({ id, total, name }: { id: string; total: number; name: string }) {
  const held = useContext(Held);
  if (!held) return null;

  return (
    <label className="flex cursor-pointer items-start pt-1">
      <input
        type="checkbox"
        checked={held.on.has(id)}
        onChange={() => held.toggle(id, total)}
        aria-label={`Pick ${name}'s order`}
        className="size-[18px] accent-[#e5321d]"
      />
    </label>
  );
}

/**
 * The bar that appears once anything is ticked.
 *
 * Two of the four things on the board can honestly be done to several
 * orders at once. The other two are WhatsApp messages, which are opened by
 * hand one person at a time, so this hands over the links rather than
 * claiming to have sent anything.
 */
export function Bar({
  runs,
  links,
}: {
  runs: { id: string; label: string }[];
  /** Per-person WhatsApp links, by order id, for the two that cannot be
   *  done in bulk however much one would like them to be. */
  links: Record<string, { review: string; pin: string; name: string }>;
}) {
  const held = useContext(Held);
  const [state, act, busy] = useActionState<BulkState, FormData>(doManyOrders, {
    error: null,
    done: null,
  });
  const [showing, setShowing] = useState<"" | "move" | "review" | "pin">("");

  if (!held || held.on.size === 0) {
    return state.done || state.error ? (
      <p
        className={`mb-3.5 rounded-xl px-4 py-3 text-sm font-semibold ${
          state.error ? "bg-brand-tint text-brand-dark" : "bg-[#dff0e6] text-mint"
        }`}
      >
        {state.error ?? state.done}
      </p>
    ) : null;
  }

  const ids = [...held.on];
  const worth = ids.reduce((total, id) => total + (held.totals.get(id) ?? 0), 0);

  return (
    <div className="mb-3.5 rounded-xl bg-ink px-4 py-2.5 text-shell">
      <form action={act} className="flex flex-wrap items-center gap-3">
        {ids.map((id) => (
          <input key={id} type="hidden" name="id" value={id} />
        ))}

        <strong className="text-sm">{ids.length} selected</strong>
        <span className="text-[13.5px] opacity-60">
          ₦{Math.round(worth).toLocaleString("en-NG")}
        </span>

        <span className="ml-auto flex flex-wrap gap-1.5">
          <button
            name="what"
            value="paid"
            disabled={busy}
            className="btn-admin btn-admin-sm btn-admin-dark font-bold disabled:opacity-50"
          >
            {busy ? "Working…" : "Mark paid"}
          </button>
          <button
            type="button"
            onClick={() => setShowing(showing === "move" ? "" : "move")}
            className="btn-admin btn-admin-sm btn-admin-dark font-bold"
          >
            Move to a run
          </button>
          <button
            type="button"
            onClick={() => setShowing(showing === "review" ? "" : "review")}
            className="btn-admin btn-admin-sm btn-admin-dark font-bold"
          >
            Ask for a review
          </button>
          <button
            type="button"
            onClick={() => setShowing(showing === "pin" ? "" : "pin")}
            className="btn-admin btn-admin-sm btn-admin-dark font-bold"
          >
            Send PINs
          </button>
        </span>

        {showing === "move" && (
          <span className="flex w-full flex-wrap items-center gap-2 border-t border-[#2c2721] pt-2.5">
            <select
              name="batch_id"
              className="min-h-10 rounded-[10px] border-2 border-[#4a443c] bg-[#26201b] px-3 text-sm text-shell"
            >
              <option value="">Pick a run</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.label}
                </option>
              ))}
            </select>
            <button
              name="what"
              value="move"
              disabled={busy}
              className="btn-admin btn-admin-sm border-brand bg-brand text-white disabled:opacity-50"
            >
              Move {ids.length}
            </button>
          </span>
        )}
      </form>

      {(showing === "review" || showing === "pin") && (
        <div className="mt-2.5 w-full border-t border-[#2c2721] pt-2.5">
          {/* One link each, opened by hand. A button claiming to have sent
              eight WhatsApp messages would be a button that sent none. */}
          <p className="mb-2 text-[12.5px] opacity-70">
            WhatsApp opens one person at a time. These are the {ids.length} messages, ready
            to send.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ids.map((id) => {
              const who = links[id];
              if (!who) return null;
              const href = showing === "review" ? who.review : who.pin;
              if (!href) return null;
              return (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-admin btn-admin-sm btn-admin-dark"
                >
                  {who.name} ↗
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
