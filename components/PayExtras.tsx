"use client";

import { useState } from "react";

/**
 * The few other things somebody might want to do with an order before they
 * pay: move it to another delivery, pay by card, or send it to whoever is
 * paying. Three small tiles in one row instead of three full-width buttons,
 * because the thing most of them are here to do is pay, and a screen of
 * buttons reads as a screen of decisions.
 *
 * The two that need room open a panel under the row. Card goes straight to
 * WhatsApp, where the link is sent by hand.
 */
export default function PayExtras({
  cardHref,
  move,
  send,
}: {
  /** Empty where card is not offered, or is already the way they chose. */
  cardHref: string;
  /** Null where the order cannot move. */
  move: React.ReactNode | null;
  /** Null where sending it on makes no sense, as in a split order. */
  send: React.ReactNode | null;
}) {
  const [open, setOpen] = useState<"move" | "send" | null>(null);

  const tile =
    "flex flex-col items-center gap-1 rounded-xl bg-shell px-2 py-3 text-center text-xs font-bold";

  const tiles = [
    move !== null && (
      <button
        key="move"
        type="button"
        onClick={() => setOpen(open === "move" ? null : "move")}
        aria-expanded={open === "move"}
        className={`${tile} ${open === "move" ? "ring-2 ring-ink" : ""}`}
      >
        <span aria-hidden className="text-lg">📅</span>
        Another delivery
      </button>
    ),
    cardHref !== "" && (
      <a
        key="card"
        href={cardHref}
        target="_blank"
        rel="noopener noreferrer"
        className={tile}
      >
        <span aria-hidden className="text-lg">💳</span>
        Pay by card
      </a>
    ),
    send !== null && (
      <button
        key="send"
        type="button"
        onClick={() => setOpen(open === "send" ? null : "send")}
        aria-expanded={open === "send"}
        className={`${tile} ${open === "send" ? "ring-2 ring-ink" : ""}`}
      >
        <span aria-hidden className="text-lg">📤</span>
        Send to payer
      </button>
    ),
  ].filter(Boolean);

  if (tiles.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">{tiles}</div>
      {open === "move" && move}
      {open === "send" && send}
    </div>
  );
}
