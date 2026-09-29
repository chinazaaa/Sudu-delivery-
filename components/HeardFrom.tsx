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
          ? { value: value ?? "", onChange: (e) => onChange(e.target.value) }
          : { defaultValue: sentBy })}
      >
        <option value="">Somewhere else</option>
        {promoters.map((one) => (
          <option key={one.code} value={one.code}>
            {one.name}
          </option>
        ))}
      </select>
    </div>
  );
}
