"use server";

import { db } from "@/lib/supabase";
import { normalisePhone } from "@/lib/phone";
import { tellAdmin } from "@/lib/admin-alerts";
import { emailAdmins } from "@/lib/email";

/**
 * A parent asking for a standing order.
 *
 * It is a request, not an instruction: the plan it makes is switched off
 * until somebody at the shop has agreed what goes in it and what it costs.
 * That is the honest shape, because the price of a care package depends on
 * what is in it that month and nobody here is charging a card.
 *
 * Everything about money stays with whoever filled this in. The block and
 * the second number belong to whoever eats it, which is where the car goes
 * and who the driver rings.
 */
export type AskedState = { error: string | null; done: boolean };

export async function askForAPlan(
  _prev: AskedState,
  form: FormData
): Promise<AskedState> {
  const name = String(form.get("customer_name") ?? "").trim();
  const phone = normalisePhone(String(form.get("customer_phone") ?? ""));
  const hostel = String(form.get("hostel") ?? "").trim();

  if (name.length < 2) return { error: "Please put your name in.", done: false };
  if (!phone) return { error: "That phone number does not look right.", done: false };
  if (hostel === "") {
    return { error: "Which block does it go to?", done: false };
  }

  /*
   * Their number is theirs, not yours again.
   *
   * The two numbers do different jobs: yours is the one chased for the
   * money and the one a PIN belongs to, theirs is the one the driver rings
   * from outside the block. The same number in both means a rider at a
   * hostel in Ibeju-Lekki ringing a phone in Ikoyi, and the checkout
   * refuses the same thing for the same reason, so a plan that carried it
   * would fail quietly on the first month it tried to raise anything.
   *
   * Leaving it blank is a real answer, so refusing this one is fair.
   */
  const forPhone = normalisePhone(String(form.get("for_phone") ?? ""));
  if (forPhone !== "" && forPhone === phone) {
    return {
      error:
        "That is your own number again. Put their number in, or leave it " +
        "blank and we will ring you when we are outside.",
      done: false,
    };
  }

  const day = Math.min(28, Math.max(1, Math.round(Number(form.get("on_day") ?? 3)) || 3));

  try {
    const { error } = await db().from("plans").insert({
      customer_name: name,
      customer_phone: phone,
      for_name: String(form.get("for_name") ?? "").trim(),
      for_phone: forPhone,
      hostel,
      box_id: String(form.get("box_id") ?? "").trim() || null,
      every: "monthly",
      on_day: day,
      // Off until the shop has agreed what goes in it and what it costs.
      active: false,
      auto: false,
      note: String(form.get("note") ?? "").trim().slice(0, 300),
    });
    if (error) throw new Error(error.message);
  } catch {
    return {
      error: "Could not save that just now. Please message us on WhatsApp.",
      done: false,
    };
  }

  /*
   * Buzzed and written down.
   *
   * This is the customer with money who comes back, and one sitting
   * unanswered for a day is the whole thing wasted. A phone that was in a
   * pocket, or had notifications turned off that afternoon, is the one way
   * to lose it silently, so it goes to the inbox as well: between them
   * something gets in front of somebody.
   */
  const who = String(form.get("for_name") ?? "").trim();
  const box = String(form.get("box_id") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();

  void tellAdmin({
    title: "A parent wants a standing order",
    body: `${name} · ${hostel} · the ${day}${nth(day)} of the month.`,
    url: "/admin/plans",
  });

  void emailAdmins(
    `A parent wants a monthly box: ${name}`,
    [
      `${name} has asked for a standing order.`,
      "",
      `Pays: ${name} on ${phone}`,
      who === "" ? "" : `For: ${who}`,
      `Block: ${hostel}`,
      `Lands: the ${day}${nth(day)} of each month`,
      box === "" ? "Box: to be agreed" : "Box: picked on the form",
      note === "" ? "" : `They said: ${note}`,
      "",
      "Nothing is running until somebody agrees what goes in it and what it",
      "comes to, and switches it on. It is on the standing orders page.",
    ]
      .filter((line) => line !== "")
      .join("\n"),
    undefined,
    "order"
  );

  return { error: null, done: true };
}

/** "3rd", because "the 3 of the month" reads as a typo. */
function nth(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  if (day % 10 === 1) return "st";
  if (day % 10 === 2) return "nd";
  if (day % 10 === 3) return "rd";
  return "th";
}
