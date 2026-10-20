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

/**
 * How a request says it came from the chat.
 *
 * There is no column for which door somebody came through, and one note
 * field that nobody types into from the chat. So the chat writes this
 * exact sentence into it and admin reads it back as a tag, rather than a
 * line of small print somebody has to notice. A request typed on the
 * custom order page keeps that field for whatever the customer actually
 * said, which is what it is for.
 */
export const ASKED_IN_CHAT = "Asked for in the chat";

/**
 * A question rather than a shopping list.
 *
 * Somebody who opens the chat with "I have an enquiry" has not come to
 * order anything, and the shop still wants to hear it. It goes into the
 * same list as the things nobody stocked, because that list is already the
 * one somebody reads and answers, and it is marked so the answer is not
 * written as a quote for food.
 */
export const ASKED_IN_CHAT_QUESTION = "A question asked in the chat";

export function fromTheChat(note: string): boolean {
  const said = String(note ?? "").trim();
  return said === ASKED_IN_CHAT || said === ASKED_IN_CHAT_QUESTION;
}

/** A question, as against something to go and buy. */
export function isAQuestion(note: string): boolean {
  return String(note ?? "").trim() === ASKED_IN_CHAT_QUESTION;
}

export type CustomRequest = {
  id: string;
  created_at: string;
  wanted: string;
  budget: string;
  name: string;
  phone: string;
  hostel: string;
  note: string;
  /** What they attached, as a path in the private bucket. A link to it
   *  is signed when somebody in admin asks to see it. */
  file_path: string;
  status: string;
  admin_note: string;
  quoted: number | null;
  answered_at: string | null;
  /** The product this became, once it was put on a shelf. */
  menu_item_id: string | null;
  /** The line of money it became, when it was a one-off and never a
   *  product. Most asks are: bought once, for one person, never again. */
  money_id: string | null;
  /** The order it became, where it went out as an ordinary order on a run
   *  rather than as a line in the errand book. The card could say somebody
   *  had placed it and not which one, which left the only question this
   *  list exists to answer, did asking for it come to anything, a matter
   *  of going and looking. */
  order_id: string | null;
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
  /** What they attached, as a storage path. Empty where nothing came. */
  filePath?: string;
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
        file_path: (input.filePath ?? "").slice(0, 500),
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
