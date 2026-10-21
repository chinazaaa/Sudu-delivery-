"use client";

import { useState } from "react";

/**
 * "Where did you hear about us?", already answered where it can be.
 *
 * Promoters kept saying people forget to pick their name, and they were
 * right to: it is the last question on a form somebody wants to finish, and
 * answering it does nothing for the person answering. So a promoter's own
 * link answers it, and this shows what it said.
 *
 * Shown rather than hidden, which is the whole argument. A link shared into
 * a group of forty would otherwise quietly make all forty of them hers,
 * whether she brought them or not. One line they can read and correct keeps
 * it honest and still costs them nothing.
 */
export default function HeardFrom({
  promoters,
  sentBy = "",
  value,
  onChange,
}: {
  promoters: { code: string; name: string }[];
  /** Whose link they came in through, if any. Already checked as real. */
  sentBy?: string;
  /** Passed in when the form around this keeps its own state. */
  value?: string;
  onChange?: (code: string) => void;
}) {
  const named = promoters.find((one) => one.code === sentBy);
  const [open, setOpen] = useState(!named);
  // What the select is on, so the box below can appear on "Somewhere
  // else" alone. Follows the parent where the form around this keeps its
  // own state, and itself where it does not.
  const [picked, setPicked] = useState(sentBy);
  const chosen = value ?? picked;

  if (promoters.length === 0) return null;

  if (named && !open) {
    return (
      <div>
        <span className="label">Where did you hear about us?</span>
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-black/[0.03] p-3">
          <input type="hidden" name="heard_from" value={named.code} />
          <span className="text-sm font-semibold text-ink">
            {named.name} sent you.
          </span>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              onChange?.("");
            }}
            className="text-sm font-medium text-brand underline underline-offset-2"
          >
            Not {named.name.split(/\s+/)[0]}?
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="label" htmlFor="heard_from">
        Where did you hear about us?
      </label>
      <select
        id="heard_from"
        name="heard_from"
        className="field"
        {...(onChange
          ? {
              value: value ?? "",
              onChange: (e) => {
                setPicked(e.target.value);
                onChange(e.target.value);
              },
            }
          : {
              defaultValue: sentBy,
              onChange: (e) => setPicked(e.target.value),
            })}
      >
        <option value="">Somewhere else</option>
        {/* Not a person, so it carries a prefix a promoter's code can never
            have: codes are letters and numbers, and this one has a colon
            in it. It is recorded as the channel they came through and
            credits nobody, which is the whole difference. */}
        <option value="c:chatgpt">ChatGPT</option>
        {promoters.map((one) => (
          <option key={one.code} value={one.code}>
            {one.name}
          </option>
        ))}
      </select>

      {/*
        Somewhere else, with somewhere to say where.
        
        The list is a name or two and a channel, and everybody else lands on
        "Somewhere else", which recorded nothing: the shop asked its best
        question and threw the answer away. At a university almost every
        real answer is a sentence rather than an option, and "my roommate"
        or "the poster in Trezadel" is worth more than any of the boxes.
        
        Optional, and it says so. It is still the last question on a form
        somebody is trying to finish, and one that must be answered to get
        past is a question that gets answered "x".
      */}
      {chosen === "" && (
        <div className="mt-2">
          <label className="sr-only" htmlFor="heard_said">
            Where did you hear about us?
          </label>
          <input
            id="heard_said"
            name="heard_said"
            maxLength={120}
            placeholder="If you like: a friend, a group chat, a poster"
            className="field"
          />
          <p className="hint mt-1">Optional, and it helps us a lot.</p>
        </div>
      )}
    </div>
  );
}
