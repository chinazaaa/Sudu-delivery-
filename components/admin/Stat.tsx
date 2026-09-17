import { naira } from "@/lib/money";

/** A number worth glancing at, on a card rather than buried in a sentence. */
export default function Stat({
  label,
  value,
  money = false,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  money?: boolean;
  tone?: "good" | "warn";
  hint?: string;
}) {
  const colour = tone === "warn" ? "text-brand" : tone === "good" ? "text-mint" : "text-ink";
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-paper p-4 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${colour}`}>
        {money && typeof value === "number" ? naira(value) : value}
      </p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
