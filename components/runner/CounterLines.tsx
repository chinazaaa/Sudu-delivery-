"use client";

import { useEffect, useState } from "react";

import SaveButton from "@/components/SaveButton";
import { naira } from "@/lib/money";
import { sayWhatItCost } from "@/app/run/[token]/actions";

/**
 * What to collect at one counter, and what it came to.
 *
 * Two jobs on one row because they happen to the same line a minute
 * apart: the food comes over the counter and gets ticked, then the receipt
 * arrives and the figure gets typed. Splitting them into a list and a
 * separate form underneath meant reading the same six lines twice and
 * matching them up by eye, with a card machine waiting.
 *
 * The tick is private to this phone, as it has always been. The figure is
 * not: it is what the run actually cost, and it is being typed at the one
 * moment it is known for certain, with the receipt in hand. Reconstructing
 * it later from card alerts at ten at night is the alternative, and it is
 * worse at exactly the moments it matters, which is when a price has moved.
 *
 * Blank still means the menu was right, which is what it is most evenings.
 * It does not mean the item was free, and clearing a figure puts that line
 * back to the menu price rather than recording nothing.
 */
export default function CounterLines({
  token,
  storageId,
  done,
  expected,
  lines,
}: {
  token: string;
  /** Anything unique to this stop, so two stops never share their ticks. */
  storageId: string;
  /** The stop is collected: show it settled rather than half ticked. */
  done: boolean;
  /** What the menu says this stop comes to, for checking the receipt. */
  expected: number;
  lines: {
    key: string;
    name: string;
    choices: string[];
    qty: number;
    /** The menu's figure for the whole line, as the box's placeholder. */
    menuTotal: number;
    /** What somebody already typed, where they have. */
    paid: number | null;
  }[];
}) {
  const storageKey = `sudu_check_${storageId}`;
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  // What is in the boxes right now, so the running total can be compared
  // with the receipt without saving first. A total that only appears after
  // a save is a total nobody checks.
  const [typed, setTyped] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((line) => [line.key, line.paid?.toString() ?? ""]))
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setTicked(JSON.parse(saved));
    } catch {
      /* Private mode: ticking still works, it is just forgotten on reload. */
    }
  }, [storageKey]);

  function toggle(key: string) {
    setTicked((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const got = done ? lines.length : lines.filter((line) => ticked[line.key]).length;

  // A blank line counts at the menu price, exactly as it will when it is
  // saved, so what this says and what the shop records cannot disagree.
  const running = lines.reduce((total, line) => {
    const raw = (typed[line.key] ?? "").trim();
    const value = Math.round(Number(raw));
    return total + (raw !== "" && Number.isFinite(value) && value >= 0 ? value : line.menuTotal);
  }, 0);

  const off = running - expected;

  return (
    <form action={sayWhatItCost} className="space-y-2">
      <input type="hidden" name="token" value={token} />

      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2.5 text-sm text-muted">
          <span
            aria-hidden
            className={`tick size-[34px] rounded-full text-[17px] font-black ${
              got === lines.length && lines.length > 0 ? "tick-done" : ""
            }`}
          >
            {got === lines.length && lines.length > 0 ? "✓" : ""}
          </span>
          <span>
            {got}/{lines.length} got
          </span>
        </p>
        {got > 0 && !done && (
          <button
            type="button"
            onClick={() => {
              setTicked({});
              try {
                window.localStorage.removeItem(storageKey);
              } catch {
                /* ignore */
              }
            }}
            className="text-[13px] font-semibold text-muted underline"
          >
            Clear ticks
          </button>
        )}
      </div>

      <ul className="divide-y-[1.5px] divide-rule border-y-[1.5px] border-rule">
        {lines.map((line) => (
          <li
            key={line.key}
            className={`flex items-center gap-3 py-3.5 ${
              done || ticked[line.key] ? "opacity-60" : ""
            }`}
          >
            {/*
              The tick is the whole row up to the box, because a thumb at a
              counter should not have to find a 20 pixel square.
            */}
            <button
              type="button"
              onClick={() => toggle(line.key)}
              disabled={done}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span
                aria-hidden
                className={`tick size-[34px] shrink-0 text-[17px] ${
                  done || ticked[line.key] ? "tick-done" : ""
                }`}
              >
                {done || ticked[line.key] ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className="font-display text-[21px] font-black leading-none">
                  {line.qty}×
                </span>{" "}
                <span className="text-[17px] font-semibold">{line.name}</span>
                {line.choices.length > 0 && (
                  <span className="mt-0.5 block text-[14px] text-muted">
                    {line.choices.join(", ")}
                  </span>
                )}
              </span>
            </button>

            <input type="hidden" name="line_key" value={line.key} />
            <input
              name="paid"
              inputMode="numeric"
              aria-label={`What ${line.name} came to`}
              value={typed[line.key] ?? ""}
              onChange={(event) =>
                setTyped((now) => ({ ...now, [line.key]: event.target.value }))
              }
              placeholder={String(line.menuTotal)}
              className="field w-[104px] shrink-0 py-2 text-right font-mono text-[17px]"
            />
          </li>
        ))}
      </ul>

      {/*
        The receipt check, which is the reason the figures are typed here
        rather than later. Against the menu, because the menu is what the
        customer was charged and a gap is the thing worth seeing tonight.
      */}
      <p className="text-[15px]">
        These come to{" "}
        <span className="font-mono text-[17px] font-bold">{naira(running)}</span>
        {off !== 0 && (
          <span className={off > 0 ? "text-brand-dark" : "text-mint"}>
            {" "}
            · {naira(Math.abs(off))} {off > 0 ? "more" : "less"} than the menu
          </span>
        )}
      </p>

      <SaveButton look="btn-primary w-full py-3.5 text-base">
        Save what the receipt said
      </SaveButton>
      <p className="text-[13px] text-muted">
        Leave a box empty where the price was exactly the menu, which is most
        of them.
      </p>
    </form>
  );
}
