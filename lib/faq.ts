import { db } from "./supabase";

export { pickFaq, type FaqHit } from "./faq-match";

/**
 * Questions the shop has already answered.
 *
 * The chat cannot be clever, and that is on purpose: there is no model in
 * it. What it can be is well read. Somebody asks how much delivery costs,
 * or whether there is a minimum, or what happens if nobody is in, and the
 * answer is the same every time and belongs in the shop's own words rather
 * than in a sentence the chat made up.
 *
 * So the answers live in a table somebody can edit, and the list grows the
 * obvious way: a question the chat could not answer lands in the requests
 * list, somebody answers that person properly, and then turns the exchange
 * into an entry. The next person asking it is answered in a second.
 */
export type Faq = {
  id: string;
  question: string;
  answer: string;
  /** Other ways of asking the same thing, comma separated. */
  keywords: string;
  active: boolean;
  sortOrder: number;
  askedCount: number;
  fromRequestId: string | null;
};

type Row = {
  id: string;
  question: string;
  answer: string;
  keywords: string;
  active: boolean;
  sort_order: number;
  asked_count: number;
  from_request_id: string | null;
};

const shape = (row: Row): Faq => ({
  id: row.id,
  question: row.question ?? "",
  answer: row.answer ?? "",
  keywords: row.keywords ?? "",
  active: row.active !== false,
  sortOrder: Number(row.sort_order ?? 100),
  askedCount: Number(row.asked_count ?? 0),
  fromRequestId: row.from_request_id ?? null,
});

/**
 * Every entry, for the admin page.
 *
 * A missing table reads as an empty list rather than as an error, so a
 * deploy that lands before the SQL does leaves the chat working exactly as
 * it did.
 */
export async function faqList(): Promise<Faq[]> {
  try {
    const { data, error } = await db()
      .from("faqs")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) return [];
    return ((data ?? []) as Row[]).map(shape);
  } catch {
    return [];
  }
}

/** The ones the chat is allowed to answer with. */
export async function faqsForChat(): Promise<
  { id: string; question: string; answer: string; keywords: string }[]
> {
  try {
    const { data, error } = await db()
      .from("faqs")
      .select("id, question, answer, keywords")
      .eq("active", true)
      .order("sort_order")
      .limit(200);
    if (error) return [];
    return ((data ?? []) as Row[])
      .map((row) => ({
        id: row.id,
        question: row.question ?? "",
        answer: row.answer ?? "",
        keywords: row.keywords ?? "",
      }))
      .filter((one) => one.question.trim() !== "" && one.answer.trim() !== "");
  } catch {
    return [];
  }
}

/** Counts an answer as given, so the list can be ordered by what is asked. */
export async function faqAnswered(id: string): Promise<void> {
  if (!id) return;
  try {
    const { data } = await db().from("faqs").select("asked_count").eq("id", id).maybeSingle();
    const now = Number((data as { asked_count?: number } | null)?.asked_count ?? 0);
    await db().from("faqs").update({ asked_count: now + 1 }).eq("id", id);
  } catch {
    // A count is a nicety. Nothing about answering depends on it.
  }
}
