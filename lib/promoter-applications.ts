import { db } from "./supabase";
import { normalisePhone } from "./phone";

/**
 * Somebody asking to become a promoter.
 *
 * Promoters were made by hand in admin, which was right while there were
 * two of them and both had asked in person. A page that says what the job
 * is and takes an application turns that into something people find on
 * their own, and a list in admin is where they get answered rather than an
 * inbox where they are missed.
 */
export type Application = {
  id: string;
  name: string;
  phone: string;
  reach: string;
  said: string;
  status: string;
  code: string;
  created_at: string;
  decided_at: string | null;
};

export type Asked = { ok: true } | { ok: false; why: string };

/** What somebody typed, checked the way the checkout checks a customer. */
export async function apply(form: {
  name: string;
  phone: string;
  reach: string;
  said: string;
}): Promise<Asked> {
  const name = form.name.trim();
  const phone = normalisePhone(form.phone);
  const reach = form.reach.trim();

  if (name.length < 2) return { ok: false, why: "Put your name in." };
  if (phone === "") return { ok: false, why: "That number does not look right." };
  if (reach.length < 3) {
    return { ok: false, why: "Say where you would be posting. It is the whole of what this decides on." };
  }

  // Asking twice is not a second application. Somebody who has not heard
  // back and tries again should not end up as two rows to answer.
  const { data: already } = await db()
    .from("promoter_applications")
    .select("id")
    .eq("phone", phone)
    .eq("status", "new")
    .maybeSingle();
  if (already) return { ok: true };

  const { error } = await db().from("promoter_applications").insert({
    name,
    phone,
    reach,
    said: form.said.trim().slice(0, 1000),
  });
  if (error) return { ok: false, why: "That did not send. Try again in a moment." };

  return { ok: true };
}

/** Everybody waiting on an answer, oldest first: they have waited longest. */
export async function waitingToHear(): Promise<Application[]> {
  const { data } = await db()
    .from("promoter_applications")
    .select("*")
    .eq("status", "new")
    .order("created_at", { ascending: true });
  return (data ?? []) as Application[];
}

/** Everyone, for the page that shows what was decided as well as what waits. */
export async function everyApplication(): Promise<Application[]> {
  const { data } = await db()
    .from("promoter_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as Application[];
}

/** How many are waiting, for the number on the rail. */
export async function applicationsWaiting(): Promise<number> {
  try {
    const { count } = await db()
      .from("promoter_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * A code from somebody's name: what they type to sign in, and what goes in
 * a caption. Letters only, lower case, and never one already taken.
 *
 * Long enough to keep a name whole. Ten characters cut Chi-Chi Okeke down
 * to "chichiokek", and handing somebody a misspelling of their own name as
 * their identity is a poor start to working together.
 */
export function codeFrom(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 16) || "promoter";
  if (!taken.includes(base)) return base;
  for (let at = 2; at < 99; at += 1) {
    if (!taken.includes(`${base}${at}`)) return `${base}${at}`;
  }
  return `${base}${Date.now().toString().slice(-4)}`;
}

/**
 * A code as the shop would actually store it.
 *
 * Somebody types "John Doe", or pastes the whole link back, or puts a
 * capital on it. All three mean the same code, and the box should show them
 * what they would really get rather than refusing what they typed.
 */
export function tidyCode(said: string): string {
  return String(said ?? "")
    .trim()
    // Pasting the whole address back is the commonest thing anybody does
    // with a field that has the address printed beside it.
    .replace(/^.*\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
}

/** Words nobody gets, because the shop already uses them. */
const SPOKEN_FOR = ["admin", "promoter", "promoters", "sudu", "orders", "santa", "shop"];

/**
 * Why a code cannot be had, or an empty string where it can.
 *
 * Length and the reserved words only. Whether somebody else already has it
 * is a question for the database, and this is the half that can be answered
 * without one, so the box can say "too short" the moment it is true.
 */
export function whyNotACode(code: string): string {
  if (code === "") return "";
  if (code.length < 3) return "A bit short, three letters at least.";
  if (SPOKEN_FOR.includes(code)) return "That one is the shop's own.";
  return "";
}
