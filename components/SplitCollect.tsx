"use client";

import { useEffect, useState } from "react";
import { naira } from "@/lib/money";

export type Share = {
  id: string;
  name: string;
  total: number;
  paid: boolean;
  url: string;
  /** A prefilled WhatsApp message, when that person gave a number. */
  whatsapp: string | null;
};

/**
 * Getting six people to pay their own share. The work is chasing, so the page
 * is a chase list: who still owes, one tap to send each person their link, and
 * a memory of who has already been sent one, because the answer to "did I
 * message Bola?" cannot be "scroll up and think".
 */
export default function SplitCollect({
  shares,
  orderId,
}: {
  shares: Share[];
  orderId: string;
}) {
  const key = `sudu_sent_${orderId}`;
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) setSent(JSON.parse(saved));
    } catch {
      /* Private mode. Sending still works, it is just not remembered. */
    }
  }, [key]);

  function markSent(id: string) {
    setSent((current) => {
      const next = { ...current, [id]: true };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      /* Clipboard blocked; the links are on screen to read. */
    }
  }

  const unpaid = shares.filter((share) => !share.paid);
  const owed = unpaid.reduce((total, share) => total + share.total, 0);
  const paidCount = shares.length - unpaid.length;
  const everyone = unpaid
    .map((share) => `${share.name} · ${naira(share.total)} · ${share.url}`)
    .join("\n");

  return (
    <section className="card space-y-3">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">
            {unpaid.length === 0
              ? "Everyone has paid"
              : `${unpaid.length} still to pay`}
          </h2>
          <span className="text-sm font-semibold text-muted">
            {paidCount}/{shares.length} paid
          </span>
        </div>
        <p className="text-sm text-muted">
          {unpaid.length === 0
            ? "Nothing left to chase. The whole order travels."
            : `${naira(owed)} outstanding. Anyone unpaid at the cut-off is dropped and the rest still travels.`}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5">
          <div
            className="h-2 rounded-full bg-mint transition-all"
            style={{ width: `${(paidCount / Math.max(shares.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-black/5">
        {shares.map((share) => (
          <li key={share.id} className="flex flex-wrap items-center gap-2 py-2.5">
            <span className="min-w-0 grow">
              <span className="block truncate font-semibold">
                {share.name}
                {share.paid && <span className="ml-2 text-xs font-bold text-mint">Paid</span>}
                {!share.paid && sent[share.id] && (
                  <span className="ml-2 text-xs font-bold text-muted">Link sent</span>
                )}
              </span>
              <span className="text-sm text-muted">{naira(share.total)}</span>
            </span>

            {share.paid ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint/10 font-bold text-mint">
                ✓
              </span>
            ) : (
              <span className="flex shrink-0 gap-2">
                {share.whatsapp ? (
                  <a
                    href={share.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markSent(share.id)}
                    className={`chip py-1.5 text-xs ${
                      sent[share.id]
                        ? "border-black/10 bg-white"
                        : "border-brand bg-brand text-white"
                    }`}
                  >
                    {sent[share.id] ? "Send again" : "Send link"}
                  </a>
                ) : (
                  <span className="chip border-transparent bg-black/5 py-1.5 text-xs text-muted">
                    No number
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    copy(share.url, share.id);
                    markSent(share.id);
                  }}
                  className="chip border-black/10 bg-white py-1.5 text-xs"
                >
                  {copied === share.id ? "Copied" : "Copy"}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {unpaid.length > 1 && (
        <button
          type="button"
          onClick={() => copy(everyone, "all")}
          className="btn-quiet w-full py-2.5 text-sm"
        >
          {copied === "all"
            ? "Everyone's links copied"
            : "Copy everyone's links for the group chat"}
        </button>
      )}
    </section>
  );
}
