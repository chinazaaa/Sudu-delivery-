"use client";

import { useRef, useState } from "react";

type Line = { name: string; cost: string; price: string };
type Step = "name" | "cost" | "price" | "more" | "fee" | "where" | "review";

const digits = (text: string) => Number(text.replace(/[^\d]/g, "")) || 0;
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
/** Cost plus 15%, up to the next 50: the shop's floor for a selling price. */
const withMargin = (cost: number) => Math.ceil((cost * 1.15) / 50) * 50;

/**
 * A custom ask, made into a real order one question at a time, like the
 * pizza picker: what did you buy, what did it cost, what do we sell it for,
 * anything else in the bag, then the delivery and which delivery it rides
 * on. One question on a screen cannot be filled in wrong the way a row of
 * boxes can.
 */
export default function RequestOrder({
  id,
  wanted,
  going,
  fee: defaultFee,
  action,
}: {
  id: string;
  wanted: string;
  going: { value: string; label: string }[];
  fee: number;
  action: (form: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState<Line>({ name: "", cost: "", price: "" });
  const [fee, setFee] = useState(String(defaultFee));
  const [where, setWhere] = useState(going[0]?.value ?? "");
  const [paid, setPaid] = useState(true);
  const [delivered, setDelivered] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const start = () => {
    setLines([]);
    setDraft({ name: wanted.split("\n")[0].slice(0, 80), cost: "", price: "" });
    setFee(String(defaultFee));
    setStep("name");
    setOpen(true);
  };
  const addDraft = (next: Step, name = "") => {
    setLines((was) => [...was, draft]);
    setDraft({ name, cost: "", price: "" });
    setStep(next);
  };

  const food = lines.reduce((sum, line) => sum + digits(line.price), 0);
  const cost = lines.reduce((sum, line) => sum + digits(line.cost), 0);
  const feeNumber = digits(fee);
  const total = food + feeNumber;

  const box = "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center";
  const card = "w-full max-w-sm space-y-3 rounded-2xl bg-white p-4 shadow-xl";
  const back = (to: Step) => (
    <button type="button" className="text-sm font-semibold text-muted" onClick={() => setStep(to)}>
      Back
    </button>
  );

  return (
    <form ref={form} action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input type="hidden" name="fee" value={feeNumber} />
      <input type="hidden" name="going" value={where} />
      <input type="hidden" name="paid" value={paid ? "on" : ""} />
      <input type="hidden" name="delivered" value={delivered ? "on" : ""} />

      <button type="button" onClick={start} className="btn-primary w-full px-3 py-3 text-sm">
        Make it an order
      </button>

      {open && (
        <div className={box} role="dialog" aria-modal="true">
          <div className={card}>
            {step === "name" && (
              <>
                <p className="text-xs font-bold text-muted">Item {lines.length + 1}</p>
                <label className="block text-base font-bold" htmlFor="ro-name">
                  What did you buy?
                </label>
                <input
                  id="ro-name"
                  autoFocus
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  className="field w-full py-3"
                  placeholder="Plushie"
                />
                <button
                  type="button"
                  disabled={draft.name.trim() === ""}
                  className="btn-primary w-full py-3 disabled:opacity-40"
                  onClick={() => setStep("cost")}
                >
                  Next
                </button>
              </>
            )}

            {step === "cost" && (
              <>
                <p className="text-base font-bold">How much did you buy {draft.name || "it"} for?</p>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={draft.cost}
                  onChange={(event) => setDraft({ ...draft, cost: event.target.value })}
                  className="field w-full py-3"
                  placeholder="Cost price, 13000"
                />
                <button
                  type="button"
                  disabled={digits(draft.cost) === 0}
                  className="btn-primary w-full py-3 disabled:opacity-40"
                  onClick={() => {
                    setDraft({ ...draft, price: String(withMargin(digits(draft.cost))) });
                    setStep("price");
                  }}
                >
                  Next
                </button>
                {back("name")}
              </>
            )}

            {step === "price" && (
              <>
                <p className="text-base font-bold">What do we sell {draft.name || "it"} for?</p>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                  className="field w-full py-3"
                  placeholder="Selling price"
                />
                <p className="text-sm text-muted">
                  Cost {naira(digits(draft.cost))}. At least {naira(withMargin(digits(draft.cost)))} to keep 15%.
                </p>
                {digits(draft.price) > 0 && digits(draft.price) < withMargin(digits(draft.cost)) && (
                  <p className="text-sm font-semibold text-red-600">That is under 15% on top of the cost.</p>
                )}
                <button
                  type="button"
                  disabled={digits(draft.price) === 0}
                  className="btn-primary w-full py-3 disabled:opacity-40"
                  onClick={() => addDraft("more")}
                >
                  Next
                </button>
                {back("cost")}
              </>
            )}

            {step === "more" && (
              <>
                <ul className="space-y-1 text-sm">
                  {lines.map((line, at) => (
                    <li key={at} className="flex justify-between">
                      <span>{line.name}</span>
                      <span className="font-semibold">{naira(digits(line.price))}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-base font-bold">Anything else in the order?</p>
                <button type="button" className="btn-quiet w-full py-3" onClick={() => { setDraft({ name: "Gift bag", cost: "", price: "" }); setStep("cost"); }}>
                  + Gift bag
                </button>
                <button type="button" className="btn-quiet w-full py-3" onClick={() => { setDraft({ name: "", cost: "", price: "" }); setStep("name"); }}>
                  + Another item
                </button>
                <button type="button" className="btn-primary w-full py-3" onClick={() => setStep("fee")}>
                  No, add the delivery
                </button>
                <button
                  type="button"
                  className="text-sm font-semibold text-muted"
                  onClick={() => {
                    const last = lines[lines.length - 1];
                    setLines((was) => was.slice(0, -1));
                    setDraft(last);
                    setStep("price");
                  }}
                >
                  Back
                </button>
              </>
            )}

            {step === "fee" && (
              <>
                <p className="text-base font-bold">What is the delivery fee?</p>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                  className="field w-full py-3"
                />
                {feeNumber < 4000 && <p className="text-sm font-semibold text-red-600">Delivery is never less than 4,000.</p>}
                <button
                  type="button"
                  disabled={feeNumber < 4000}
                  className="btn-primary w-full py-3 disabled:opacity-40"
                  onClick={() => setStep("where")}
                >
                  Next
                </button>
                {back("more")}
              </>
            )}

            {step === "where" && (
              <>
                <p className="text-base font-bold">Which delivery does it go on?</p>
                <select value={where} onChange={(event) => setWhere(event.target.value)} className="field w-full py-3">
                  {going.map((one) => (
                    <option key={one.value} value={one.value}>
                      {one.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-base">
                  <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
                  She has paid
                </label>
                <label className="flex items-center gap-2 text-base">
                  <input type="checkbox" checked={delivered} onChange={(event) => setDelivered(event.target.checked)} />
                  Already delivered
                </label>
                <button type="button" className="btn-primary w-full py-3" onClick={() => setStep("review")}>
                  Next
                </button>
                {back("fee")}
              </>
            )}

            {step === "review" && (
              <>
                <p className="text-base font-bold">Check it</p>
                <ul className="space-y-1 text-sm">
                  {lines.map((line, at) => (
                    <li key={at} className="flex justify-between">
                      <span>
                        {line.name} <span className="text-muted">(cost {naira(digits(line.cost))})</span>
                      </span>
                      <span className="font-semibold">{naira(digits(line.price))}</span>
                    </li>
                  ))}
                  <li className="flex justify-between">
                    <span>Delivery</span>
                    <span className="font-semibold">{naira(feeNumber)}</span>
                  </li>
                  <li className="flex justify-between border-t border-black/10 pt-1 text-base font-bold">
                    <span>She pays</span>
                    <span>{naira(total)}</span>
                  </li>
                </ul>
                <p className="text-sm text-muted">
                  Made on the items: {naira(food - cost)}. {paid ? "Marked paid." : "Not paid yet."} {delivered ? "Marked delivered." : ""}
                </p>
                <button type="submit" className="btn-primary w-full py-3">
                  Make the order
                </button>
                {back("where")}
              </>
            )}

            <button type="button" className="w-full text-center text-sm text-muted" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
