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
      <p className="text-sm font-bold text-ink">How are you paying? Transfer or card</p>
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
            <span className="flex items-center gap-2 font-bold">
              {title}
              {/* Transfer is how nearly everybody pays, and the one that
                  needs nothing from us afterwards. Saying so beats two
                  options that look equally likely. */}
              {way === "transfer" && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-dark">
                  Usual
                </span>
              )}
            </span>
            <span className="block text-sm text-muted">{detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
