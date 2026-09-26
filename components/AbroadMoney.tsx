"use client";

import { naira } from "@/lib/money";

export type Money = { code: string; label: string; symbol: string; rate: number };

/**
 * "Is somebody abroad paying for this?"
 *
 * A parent in London cannot make a Nigerian transfer. What they can do is
 * open a card link made out in their own money, so this asks whose money the
 * link should be in and leaves the order in naira either way.
 *
 * It was on the food checkout and nowhere else, so a mother paying for a
 * care package or a skincare order was back to being told a naira figure and
 * a Nigerian account number. Written once here and used by all of them.
 *
 * Naira stays the default. Most people are here, and a currency chosen by
 * accident is a card link nobody can pay.
 */
export default function AbroadMoney({
  monies,
  value,
  onChange,
  total,
}: {
  monies: Money[];
  value: string;
  onChange: (code: string) => void;
  /** What the order comes to in naira, for the rough conversion. */
  total: number;
}) {
  if (monies.length === 0) return null;

  return (
    <div className="rounded-xl bg-shell p-3">
      <p className="text-sm font-bold text-ink">Is somebody abroad paying for this?</p>
      <p className="mt-0.5 text-xs text-muted">
        We send you a card link in their money to pass on. The order is still{" "}
        {naira(total)}; the amount on the link is worked out at our rate, so it
        is close rather than exact.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          className={`chip ${
            value === "" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
          }`}
        >
          No, naira
        </button>
        {monies.map((one) => (
          <button
            key={one.code}
            type="button"
            onClick={() => onChange(one.code)}
            className={`chip ${
              value === one.code
                ? "border-brand bg-brand text-white"
                : "border-black/10 bg-white"
            }`}
          >
            {one.label}
            {one.rate > 0 && (
              <span className={value === one.code ? "text-white/75" : "text-muted"}>
                about {one.symbol}
                {(Math.ceil((total / one.rate) * 10) / 10).toFixed(2)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
