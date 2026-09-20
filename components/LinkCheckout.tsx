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
  title,
  when,
  note: aLine,
  lines,
  food,
  fee,
  hostels,
  swaps,
  instead,
  hasCardLink,
  askUs,
  me,
}: {
  code: string;
  /** What whoever made the link called it, which is the first thing read. */
  title: string;
  /** When it lands, already said as a window. */
  when: string;
  /** A line from the shop, above the food. */
  note: string;
  lines: {
    name: string;
    restaurant: string;
    qty: number;
    choices: string[];
    total: number;
  }[];
  food: number;
  /** What whoever made the link set delivery at, when they set it. Null means
   *  the ordinary rules, which cannot be worked out until the order is placed
   *  because a promotion may price it. */
  fee: number | null;
  hostels: string[];
  /** What they can swap at no cost, with what the link currently says: the
   *  crust is Hand Tossed, and Thin Crust is there for the asking. The note
   *  says so rather than sitting blank, because nobody asks for a change
   *  they have not been told they can have. */
  swaps: { name: string; chosen: string; others: string[] }[];
  /** What they can have instead, each costing what the basket costs. A swap
   *  that moved the total would be a different order, so these never do. */
  instead: {
    index: number;
    name: string;
    restaurant: string;
    choices: string[];
    items: number;
    food: number;
  }[];
  /** Whether a card link is waiting, so card needs no message. */
  hasCardLink: boolean;
  /** A WhatsApp link, opened with the basket written out, for asking
   *  something the form cannot hold. Empty where no number is set. */
  askUs: string;
  /** Their own details, when they are signed in on this device. */
  me: { name: string; hostel: string; paymentMethod: "transfer" | "card" } | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState(me?.hostel ?? "");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"transfer" | "card">(me?.paymentMethod ?? "transfer");
  // Which of them they are having. Nought is the basket the link came with.
  const [having, setHaving] = useState(0);
  // What that one costs. A swap is the same money or less, so this only ever
  // falls, and every figure on the page follows it.
  const chosen = instead.find((one) => one.index + 1 === having) ?? null;
  const cost = having === 0 ? food : (chosen?.food ?? food);
  const items =
    having === 0
      ? lines.reduce((sum, line) => sum + line.qty, 0)
      : (chosen?.items ?? 1);
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
        // Nought is what the link came with; anything else is one of the
        // swaps, which the server checks for itself.
        instead: having,
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
      <section className="card space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-dark">{title}</p>
        {/* Follows whichever they are on. It sat on the server before, where
            it could only ever say what the link came with, so swapping to a
            cheaper dish left the heading quoting the dearer one. */}
        <h1 className="text-2xl font-bold tracking-tight">
          {items} item{items === 1 ? "" : "s"} · {naira(cost)}
        </h1>
        {when !== "" && <p className="text-ink/75">{when}</p>}
        {aLine !== "" && <p className="text-sm text-muted">{aLine}</p>}
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">What you are getting</h2>

        {/* A choice where there is one, and the price stays where it is
            whichever they take: every swap costs what the basket costs. */}
        {instead.length > 0 ? (
          <ul className="space-y-2">
            {[
              {
                index: 0,
                name: lines.map((line) => `${line.qty}× ${line.name}`).join(", "),
                restaurant: lines[0]?.restaurant ?? "",
                choices: lines.flatMap((line) => line.choices),
                items: lines.reduce((sum, line) => sum + line.qty, 0),
                food,
              },
              ...instead.map((one) => ({ ...one, index: one.index + 1 })),
            ].map((one) => {
              const on = having === one.index;
              return (
                <li key={one.index}>
                  <button
                    type="button"
                    onClick={() => setHaving(one.index)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left ${
                      on ? "border-brand bg-brand-tint" : "border-black/10"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                        on ? "border-brand bg-brand text-white" : "border-black/20"
                      }`}
                    >
                      {on && <span className="text-xs font-black">✓</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{one.name}</span>
                      <span className="block text-xs text-muted">
                        {[one.restaurant, ...one.choices].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold">{naira(one.food)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
        <ul className="divide-y divide-black/5 text-sm">
          {lines.map((line, index) => (
            <li key={`${line.name}-${index}`} className="flex justify-between gap-3 py-2">
              <span>
                <span className="font-semibold">
                  {line.qty}× {line.name}
                </span>
                <span className="block text-xs text-muted">
                  {[line.restaurant, ...line.choices].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="font-bold">{naira(line.total)}</span>
            </li>
          ))}
        </ul>
        )}

        {instead.length > 0 && (
          <p className="text-xs text-muted">
            {instead.every((one) => one.food === food)
              ? "Whichever you pick, it is the same money."
              : "Pick whichever you want. Nothing here costs more than what the link came with."}
          </p>
        )}

        <dl className="space-y-1 border-t border-black/10 pt-2 text-sm">
          <div className="flex justify-between text-muted">
            <dt>Food</dt>
            <dd>{naira(cost)}</dd>
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
            <dd>{fee === null ? naira(cost) + " + delivery" : naira(cost + fee)}</dd>
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
          placeholder={
            swaps.length > 0
              ? `Prefer ${swaps[0].others[0]}? Say it here`
              : "Anything we should know? (optional)"
          }
          aria-label="Anything we should know"
          className="field"
        />
        {swaps.length > 0 && (
          <ul className="space-y-0.5 text-xs text-muted">
            {swaps.map((swap) => (
              <li key={swap.name}>
                {swap.chosen !== "" ? (
                  <>
                    {swap.name} is <span className="font-semibold">{swap.chosen}</span>.
                    Want {swap.others.join(" or ")} instead? It costs the same, so
                    say so in the note and the counter is told.
                  </>
                ) : (
                  <>
                    {swap.name} is yours to pick: {swap.others.join(" or ")}, same
                    price either way. Say which in the note.
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

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

        {/* Anything the form cannot hold: the beef swapped for chicken, a
            second one added, a question. It opens with the basket written
            out, so nobody has to describe what they are looking at. */}
        {askUs !== "" && (
          <a
            href={askUs}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-quiet block w-full text-center"
          >
            Ask us to change something
          </a>
        )}
      </section>
    </>
  );
}
