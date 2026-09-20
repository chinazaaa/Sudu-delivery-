"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { naira } from "@/lib/money";
import PayChoice from "./PayChoice";
import { orderFromLink } from "@/app/actions";

/**
 * Ordering off a link somebody sent.
 *
 * Everything that can be decided already has been: the food, the run, the
 * price. What is left is who they are, where it goes and how they are paying,
 * which is the least anybody can be asked and still get dinner.
 *
 * It is its own basket, and it never touches the cart. Adding something to
 * the cart afterwards does not change the link, and ordering off the link
 * does not empty the cart: two different things that happen to be about food.
 */
export default function LinkCheckout({
  code,
  lines,
  food,
  fee,
  hostels,
  hasCardLink,
  me,
}: {
  code: string;
  lines: { name: string; qty: number; choices: string[]; total: number }[];
  food: number;
  /** What whoever made the link set delivery at, when they set it. Null means
   *  the ordinary rules, which cannot be worked out until the order is placed
   *  because a promotion may price it. */
  fee: number | null;
  hostels: string[];
  /** Whether a card link is waiting, so card needs no message. */
  hasCardLink: boolean;
  /** Their own details, when they are signed in on this device. */
  me: { name: string; hostel: string; paymentMethod: "transfer" | "card" } | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState(me?.hostel ?? "");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"transfer" | "card">(me?.paymentMethod ?? "transfer");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  // Whatever this browser already knows about them, so a regular fills in
  // nothing at all.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "null");
      if (saved?.name) setName((was) => was || saved.name);
      if (saved?.phone) setPhone((was) => was || saved.phone);
      if (saved?.hostel) setHostel((was) => was || saved.hostel);
      if (saved?.method === "card" || saved?.method === "transfer") setMethod(saved.method);
    } catch {
      /* Nothing saved, or storage is blocked. They type it. */
    }
  }, []);

  const place = async () => {
    setProblem("");
    setBusy(true);
    try {
      const result = await orderFromLink({
        code,
        name,
        phone,
        hostel,
        note,
        paymentMethod: method,
      });
      if (!result.ok) {
        setProblem(result.error);
        return;
      }
      try {
        const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "{}");
        localStorage.setItem(
          "sudu_me_v1",
          JSON.stringify({ ...saved, name, phone, hostel, method })
        );
      } catch {
        /* Not worth failing an order over. */
      }
      // Not placed=1, which empties the cart. A link is its own basket and
      // has nothing to do with whatever they are collecting for the next run:
      // ordering off one must not throw that away.
      router.push(`/o/${result.orderId}`);
    } catch {
      setProblem("Could not place that just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="card space-y-2">
        <h2 className="font-bold">What you are getting</h2>
        <ul className="divide-y divide-black/5 text-sm">
          {lines.map((line, index) => (
            <li key={`${line.name}-${index}`} className="flex justify-between gap-3 py-2">
              <span>
                <span className="font-semibold">
                  {line.qty}× {line.name}
                </span>
                {line.choices.length > 0 && (
                  <span className="block text-xs text-muted">{line.choices.join(", ")}</span>
                )}
              </span>
              <span className="font-bold">{naira(line.total)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 border-t border-black/10 pt-2 text-sm">
          <div className="flex justify-between text-muted">
            <dt>Food</dt>
            <dd>{naira(food)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Delivery</dt>
            {/* Only when it was set. Otherwise it depends on what else is
                travelling and on whatever offer is on, and a figure invented
                here would be one nobody is charged. */}
            <dd>{fee === null ? "worked out on the order" : naira(fee)}</dd>
          </div>
          <div className="flex justify-between font-extrabold">
            <dt>Total</dt>
            <dd>{fee === null ? naira(food) + " + delivery" : naira(food + fee)}</dd>
          </div>
        </dl>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Where does it go?</h2>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="John Doe"
          aria-label="Your name"
          className="field"
          autoComplete="name"
        />

        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="0803 123 4567"
          aria-label="Your phone number"
          inputMode="tel"
          className="field"
          autoComplete="tel"
        />

        {hostels.length > 0 ? (
          <select
            value={hostel}
            onChange={(event) => setHostel(event.target.value)}
            aria-label="Your block"
            className="field"
          >
            <option value="">Which block?</option>
            {hostels.map((one) => (
              <option key={one} value={one}>
                {one}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={hostel}
            onChange={(event) => setHostel(event.target.value)}
            placeholder="Your hostel or block"
            aria-label="Your hostel or block"
            className="field"
          />
        )}

        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything we should know? (optional)"
          aria-label="Anything we should know"
          className="field"
        />

        <PayChoice value={method} onChange={setMethod} />
        {method === "card" && hasCardLink && (
          <p className="text-sm text-muted">
            The card link is on your order the moment you place it, so there is
            nothing to wait for.
          </p>
        )}

        {problem !== "" && (
          <p className="text-sm font-semibold text-brand-dark">{problem}</p>
        )}

        <button
          type="button"
          onClick={place}
          disabled={busy}
          className="btn-primary w-full"
        >
          {busy ? "Placing…" : "Place my order"}
        </button>
      </section>
    </>
  );
}
