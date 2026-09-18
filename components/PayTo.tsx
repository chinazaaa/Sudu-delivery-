"use client";

import { useState } from "react";
import CopyText from "./CopyText";
import type { BankAccount } from "@/lib/banks";

/**
 * Where to send the money.
 *
 * One account, shown whole: the number big enough to read off a phone while
 * typing it into a banking app, and a button to copy it. The others are a row
 * of bank names underneath, and tapping one swaps the card in place. Nobody
 * is asked to choose before they have seen an answer, and nobody who does not
 * care ever notices there was a choice.
 */
export default function PayTo({
  accounts,
  narration,
}: {
  accounts: BankAccount[];
  /** What they must type so the transfer can be matched. */
  narration: string;
}) {
  const [chosen, setChosen] = useState(0);
  const account = accounts[chosen] ?? accounts[0];
  if (!account) return null;

  return (
    <div className="space-y-3">
      <dl className="space-y-2 rounded-2xl bg-shell p-3 text-sm">
        <Row label="Bank" value={account.bank_name} />
        <Row label="Account name" value={account.account_name || "Not set"} />
        <Row label="Account number" value={account.account_number} strong />
        <Row label="Narration" value={narration} strong />
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <CopyText
          value={account.account_number}
          label="Copy account"
          className="w-full px-3 py-2.5 text-sm"
        />
        <CopyText
          value={narration}
          label="Copy narration"
          className="w-full px-3 py-2.5 text-sm"
        />
      </div>

      {accounts.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted">
            Bank with one of these? Send it there instead:
          </span>
          {accounts.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setChosen(index)}
              aria-pressed={index === chosen}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                index === chosen
                  ? "bg-ink text-white"
                  : "bg-black/[0.06] text-ink/70 hover:bg-black/10"
              }`}
            >
              {option.bank_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : "text-ink/75"}`}>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
