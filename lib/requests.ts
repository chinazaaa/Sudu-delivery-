import { db } from "./supabase";
import { emailAdmins } from "./email";
import { normalisePhone } from "./phone";

/**
 * Somebody asking for something the shop does not carry.
 *
 * A student wants a particular power bank, or a birthday cake from a bakery
 * that is not on the menu. None of it is a product here and most of it never
 * will be, but somebody asking is a customer telling us what they would pay
 * for, which is the cheapest market research there is: enough of the same
 * request and it becomes something we stock.
 *
 * Answered by hand on WhatsApp, like everything else. There is no
 * marketplace under this, and there does not need to be.
 */

export type CustomRequest = {
  id: string;
  created_at: string;
  wanted: string;
  budget: string;
  name: string;
  phone: string;
  hostel: string;
  note: string;
  status: string;
  admin_note: string;
  quoted: number | null;
  answered_at: string | null;
};

export type AskResult = { ok: true; id: string } | { ok: false; error: string };

/** Takes a request, and tells the admins there is one. */
export async function askFor(input: {
  wanted: string;
  budget: string;
  name: string;
  phone: string;
  hostel: string;
  note: string;
}): Promise<AskResult> {
  const wanted = input.wanted.trim();
  // Enough to act on. "Food" is not a request anybody can go and buy.
  if (wanted.length < 4) {
    return { ok: false, error: "Say what you are looking for, in a few words." };
  }

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Please enter your name." };

  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, error: "That phone number doesn't look right." };

  try {
    const { data, error } = await db()
      .from("custom_requests")
      .insert({
        wanted: wanted.slice(0, 500),
        budget: input.budget.trim().slice(0, 100),
        name: name.slice(0, 80),
        phone,
        hostel: input.hostel.trim().slice(0, 80),
        note: input.note.trim().slice(0, 500),
      })
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: "Could not send that just now. Try again." };
    }

    // Nobody is waiting on the mail, and a request must not be lost because
    // a mail provider is having a bad minute.
    void emailAdmins(
      `Somebody is looking for: ${wanted.slice(0, 60)}`,
      [
        `${name} is looking for something we do not carry.`,
        "",
        `Wants: ${wanted}`,
        input.budget.trim() ? `Budget: ${input.budget.trim()}` : "",
        `Number: ${phone}`,
        input.hostel.trim() ? `Block: ${input.hostel.trim()}` : "",
        input.note.trim() ? `Note: ${input.note.trim()}` : "",
        "",
        "Find it, price it, and send them what it comes to on WhatsApp.",
      ]
        .filter(Boolean)
        .join("\n")
    ).catch(() => {});

    return { ok: true, id: data.id as string };
  } catch {
    return { ok: false, error: "Could not send that just now. Try again." };
  }
}

/** The asking list, newest first. */
export async function requestList(): Promise<CustomRequest[]> {
  try {
    const { data } = await db()
      .from("custom_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []) as CustomRequest[];
  } catch {
    return [];
  }
}

/** How many are still waiting on somebody, for the badge on the dashboard. */
export async function newRequests(): Promise<number> {
  try {
    const { count } = await db()
      .from("custom_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    return count ?? 0;
  } catch {
    return 0;
  }
}
