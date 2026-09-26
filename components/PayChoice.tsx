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
  monies = [],
  money = "",
  onMoney,
}: {
  value: "transfer" | "card";
  onChange: (value: "transfer" | "card") => void;
  /** The currencies somebody abroad can pay in, where the shop offers it.
   *  Empty, which it is nearly everywhere, and none of this appears. */
  monies?: { code: string; label: string; roughly: string }[];
  money?: string;
  onMoney?: (next: string) => void;
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

      {/* Only under the card, because that is what it is: the same link sent
          on WhatsApp, made out in their money instead of ours. A parent in
          London cannot make a Nigerian transfer, and this is the whole of
          what they need from us. */}
      {value === "card" && monies.length > 0 && onMoney && (
        <div className="rounded-xl bg-shell p-3">
          <p className="text-sm font-bold text-ink">
            Is somebody abroad paying for this?
          </p>
          <p className="mt-0.5 text-xs text-muted">
            We will send them a card link in their own money. The amount is
            worked out at our rate, so it is close rather than exact.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onMoney("")}
              className={`chip ${money === "" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"}`}
            >
              No, naira
            </button>
            {monies.map((one) => (
              <button
                key={one.code}
                type="button"
                onClick={() => onMoney(one.code)}
                className={`chip ${money === one.code ? "border-brand bg-brand text-white" : "border-black/10 bg-white"}`}
              >
                {one.label}
                {one.roughly && (
                  <span className={money === one.code ? "text-white/75" : "text-muted"}>
                    {one.roughly}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
