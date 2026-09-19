"use client";

/**
 * How somebody is paying, asked the same way wherever it is asked.
 *
 * Checkout has always asked this. The group forms did not, so everybody who
 * ordered in a car was quietly put down as a transfer, and the ones who wanted
 * a card link had to say so afterwards.
 */
export default function PayChoice({
  value,
  onChange,
}: {
  value: "transfer" | "card";
  onChange: (value: "transfer" | "card") => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-ink">How are you paying?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            [
              "transfer",
              "Bank transfer",
              "Account details on your order, with a four-digit number for the narration.",
            ],
            ["card", "Card", "We send the link to your WhatsApp. Pay it there."],
          ] as const
        ).map(([way, title, detail]) => (
          <button
            key={way}
            type="button"
            onClick={() => onChange(way)}
            className={`rounded-xl border bg-paper p-3 text-left transition ${
              value === way ? "border-brand bg-brand-tint" : "border-black/10"
            }`}
          >
            <span className="block font-bold">{title}</span>
            <span className="block text-sm text-muted">{detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
