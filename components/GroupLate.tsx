"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { naira } from "@/lib/money";
import PayChoice from "./PayChoice";

/**
 * Their food, still waiting, after the group has closed.
 *
 * The clock runs out on people. Somebody who chose their food and never got
 * as far as a phone number has a cart with nowhere to go, and the close could
 * not make an order out of it. Throwing it away would be the easy thing and
 * the wrong one: they chose it, it is still what they want, and the car has
 * not left.
 */
export default function GroupLate({
  groupId,
  share,
  hostels,
}: {
  groupId: string;
  /** What everybody else was charged, which is what they pay too. Nought
   *  when the group closed without a single order in it, and then there is
   *  no share to promise: their food is priced on its own. */
  share: number;
  hostels: string[];
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  const [problem, setProblem] = useState("");

  const finish = async () => {
    setProblem("");
    setBusy(true);
    try {
      const response = await fetch(`/api/party/${groupId}/late`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, hostel, note, paymentMethod: method }),
      });
      const data = (await response.json()) as { error?: string; orderId?: string };
      if (!response.ok || !data.orderId) {
        setProblem(data.error ?? "Could not finish that.");
        return;
      }
      router.push(`/o/${data.orderId}?placed=1`);
    } catch {
      setProblem("Could not finish that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3 border-2 border-brand/30 bg-brand-tint">
      <div>
        <h2 className="font-bold text-brand-dark">Your food is still here</h2>
        <p className="text-sm text-ink/75">
          {share > 0 ? (
            <>
              The group closed before you gave your details, so nothing was ordered
              for you. Give them now and your food goes in the same car, at the same{" "}
              {naira(share)} for delivery as everybody else.
            </>
          ) : (
            <>
              The group closed before anybody gave their details, so nothing was
              ordered. Give yours now and your food goes on the same run, at the
              usual delivery fee for what you have chosen. You will see the total
              before you pay anything.
            </>
          )}
        </p>
      </div>

      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Your phone number"
        aria-label="Your phone number"
        inputMode="tel"
        className="field"
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

      {problem !== "" && <p className="text-sm font-semibold text-brand-dark">{problem}</p>}

      <button type="button" onClick={finish} disabled={busy} className="btn-primary w-full">
        {busy ? "Placing…" : "Put my food in and show me what I owe"}
      </button>
    </section>
  );
}
