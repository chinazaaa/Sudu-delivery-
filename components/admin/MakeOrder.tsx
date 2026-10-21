"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";

/**
 * A left basket, turned into an order, minus whatever you untick.
 *
 * The list has to be live rather than submitted and judged, because the
 * two halves of this decision argue with each other: a car of its own
 * cannot reach Lekki, so a Jay's Diner line in the basket rules out every
 * car in the picker, and taking that line out is exactly what puts them
 * back. Deciding it on the server would mean an error message after the
 * fact, which is a worse way to learn it than watching the option grey
 * itself out as you untick the thing causing it.
 *
 * Everything starts ticked, because the usual answer is all of it.
 */
export default function MakeOrder({
  cartId,
  lines,
  going,
  action,
}: {
  cartId: string;
  /** Position, what it is, and whether its counter rides a run only. */
  lines: { at: number; qty: number; name: string; shop: string; runOnly: boolean }[];
  /** Where it could go. A car carries `car: true`, a run does not. */
  going: { value: string; label: string; car: boolean }[];
  action: (form: FormData) => void;
}) {
  const [keep, setKeep] = useState<number[]>(lines.map((line) => line.at));

  const kept = lines.filter((line) => keep.includes(line.at));
  // The counters in the basket that a car cannot fetch from. Named, because
  // "no cars available" is a dead end and "Jay's Diner is why" is a choice.
  const blocking = [
    ...new Set(kept.filter((line) => line.runOnly).map((line) => line.shop)),
  ];
  const noCars = blocking.length > 0;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="cart_id" value={cartId} />

      <ul className="soft bg-shell p-2.5">
        {lines.map((line) => (
          <li key={line.at}>
            <label className="flex items-center gap-2.5 py-1 text-[14.5px]">
              <input
                type="checkbox"
                name="keep"
                value={line.at}
                checked={keep.includes(line.at)}
                onChange={(event) =>
                  setKeep((was) =>
                    event.target.checked
                      ? [...was, line.at]
                      : was.filter((at) => at !== line.at)
                  )
                }
                className="size-5 shrink-0 accent-brand"
              />
              <span className="min-w-0 flex-1">
                {line.qty > 1 ? `${line.qty}x ` : ""}
                {line.name}
                {line.shop && <span className="text-muted"> · {line.shop}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {noCars && (
        <p className="hint">
          {blocking.join(" and ")}{" "}
          {blocking.length === 1 ? "goes" : "go"} out on a run only, so a car
          of its own cannot fetch{" "}
          {blocking.length === 1 ? "it" : "them"}. Untick{" "}
          {blocking.length === 1 ? "that line" : "those lines"} and the cars
          come back.
        </p>
      )}

      <div className="flex gap-2">
        <select
          name="going"
          defaultValue=""
          className="field field-admin min-h-[46px] grow border-[1.5px] border-line py-0 text-[14.5px]"
        >
          <option value="" disabled>
            Make it an order on…
          </option>
          {going.map((one) => (
            <option
              key={one.value}
              value={one.value}
              disabled={one.car && noCars}
            >
              {one.label}
            </option>
          ))}
        </select>
        <ActionButton className="btn-admin shrink-0" done="Made ✓">
          Make it
        </ActionButton>
      </div>
    </form>
  );
}
