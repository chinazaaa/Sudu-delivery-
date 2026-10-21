"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import SaveButton from "@/components/SaveButton";
import { naira } from "@/lib/money";
import { leaveNote, markStop, sayWhatItCost } from "@/app/run/[token]/actions";

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
  restaurant,
  storageId,
  done,
  expected,
  lines,
}: {
  token: string;
  /** Which stop this is, for saying it has been collected. */
  restaurant: string;
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
    /** Who ordered it, for the one stop in ten that has run out. */
    buyers: { name: string; phone: string; qty: number; forName: string }[];
    /** What was already written about this line, where anything was. */
    note: string;
  }[];
}) {
  const storageKey = `sudu_check_${storageId}`;
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  /*
   * Which line has run out, if any.
   *
   * One at a time, and shut by default. This happens about once in ten
   * stops, so it earns a quiet word under the line and nothing more: a
   * phone icon on every row would be noise nine times out of ten, and
   * would anyway imply one person to ring when a counter line is grouped
   * across orders and may be three.
   */
  const [short, setShort] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNote, saveNote] = useTransition();

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
  const all = lines.length > 0 && got === lines.length;

  /*
   * Ticking the last thing off is saying the stop is collected.
   *
   * There used to be a second button underneath asking exactly that, and a
   * stop with every line ticked sitting above a button asking whether it
   * had been collected is the page refusing to believe what it was just
   * told. Two ways to say one thing is also how the two come to disagree,
   * which this run sheet already carries a scar from elsewhere.
   *
   * So the ticks are the control, in both directions: the last tick says
   * collected, clearing them says it was not after all. The button below
   * survives and does nothing but tick every line, so there is one fact
   * with two ways of reaching it rather than two facts.
   */
  const [saving, save] = useTransition();
  const was = useRef(done);

  useEffect(() => {
    if (all === was.current) return;
    was.current = all;

    const form = new FormData();
    form.set("token", token);
    form.set("restaurant", restaurant);
    form.set("collected", all ? "true" : "false");
    save(() => {
      void markStop(form);
    });
  }, [all, token, restaurant]);

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
          <li key={line.key} className="py-3.5">
          <div
            className={`flex items-center gap-3 ${
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
          </div>

          {/*
            Under the line it is about, and grey, because a counter is out
            of something about one stop in ten. A phone icon on every row
            would be noise the other nine, and it would anyway promise one
            person to ring when this line can be three people's dinner.
          */}
          <button
            type="button"
            onClick={() => setShort(short === line.key ? "" : line.key)}
            className={`mt-1 ml-[46px] text-[12.5px] underline ${
              (notes[line.key] ?? line.note) !== "" ? "text-mint" : "text-muted"
            }`}
          >
            {(notes[line.key] ?? line.note) !== ""
              ? "Noted ✓"
              : short === line.key
                ? "Never mind"
                : "Sold out?"}
          </button>

          {short === line.key && (
            <div className="mt-2 soft bg-shell p-3">
              <p className="text-[13px] font-semibold">
                Who ordered {line.name}
                {line.choices.length > 0 ? ` ${line.choices.join(", ")}` : ""}
              </p>
              {line.buyers.length === 0 ? (
                <p className="mt-1 text-[13px] text-muted">
                  Nobody on this run, which should not happen. Ring the shop.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {line.buyers.map((buyer) => (
                    <li
                      key={`${buyer.phone}-${buyer.forName}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 text-[15px]">
                        <span className="font-bold">{buyer.name}</span>
                        {buyer.forName !== "" && (
                          <span className="text-muted">, for {buyer.forName}</span>
                        )}
                        {buyer.qty > 1 && (
                          <span className="text-muted"> · {buyer.qty} of them</span>
                        )}
                      </span>
                      <a
                        href={`tel:${buyer.phone}`}
                        className="btn-quiet shrink-0 px-4 py-2 text-sm"
                      >
                        Ring
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {/*
                One sentence, and then back to the counter. What follows,
                swapping the line so the brand figures count what actually
                sold, is the shop's work, done afterwards at a desk.
              */}
              <p className="mt-3 text-[13px] font-semibold">
                What did they take instead?
              </p>
              <textarea
                rows={2}
                defaultValue={line.note}
                placeholder="Sold out, took the Vegetarian for the same money"
                className="field mt-1 w-full py-2 text-[15px]"
                onChange={(event) =>
                  setNotes((now) => ({ ...now, [line.key]: event.target.value }))
                }
              />
              <button
                type="button"
                disabled={savingNote}
                onClick={() => {
                  const form = new FormData();
                  form.set("token", token);
                  form.set("line_key", line.key);
                  form.set("said_about", `${line.qty}x ${line.name}`);
                  form.set("said", notes[line.key] ?? line.note);
                  saveNote(() => {
                    void leaveNote(form);
                  });
                  setShort("");
                }}
                className="btn-primary mt-2 w-full justify-center py-3 text-[15px]"
              >
                {savingNote ? "Saving…" : "Save the note"}
              </button>
              <p className="mt-2 text-xs text-muted">
                That is all you need to do. The shop changes the order and
                sorts the money afterwards.
              </p>
            </div>
          )}
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

      {/*
        The same fact as ticking every line, reached in one tap for
        somebody holding the bag who has no wish to confirm it six times.
        It ticks the lines rather than setting a flag of its own, so the
        list above always agrees with it.
      */}
      <button
        type="button"
        onClick={() =>
          setTicked(
            all ? {} : Object.fromEntries(lines.map((line) => [line.key, true]))
          )
        }
        className={`w-full py-3.5 text-base ${all ? "btn-quiet" : "btn-primary"}`}
      >
        {saving ? "\u2026" : all ? "Not collected after all" : "Got everything here"}
      </button>
      <p className="text-[13px] text-muted">
        Leave a box empty where the price was exactly the menu, which is most
        of them.
      </p>
    </form>
  );
}
