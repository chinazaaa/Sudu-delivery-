import { db } from "./supabase";

/** One question and its answer, as a landing page writes it. */
export type Asked = { q: string; a: string };

/**
 * The pages that carry a question section, and what to call them.
 *
 * Not the chat's answers, which are a different thing in a different table
 * with a different job. These are the sections printed down the bottom of
 * the landing pages and marked up for Google underneath.
 */
export const FAQ_PAGES: { page: string; label: string; href: string }[] = [
  { page: "parents", label: "For parents", href: "/parents" },
  { page: "delivery-to-pau", label: "Delivery to PAU", href: "/delivery-to-pau" },
  { page: "send-a-gift-to-pau", label: "Send a gift", href: "/send-a-gift-to-pau" },
  { page: "pau-student-store", label: "Student store", href: "/pau-student-store" },
  { page: "pau-snacks", label: "Snacks", href: "/pau-snacks" },
  { page: "pau-pharmacy", label: "Pharmacy", href: "/pau-pharmacy" },
  { page: "become-a-promoter", label: "Become a promoter", href: "/become-a-promoter" },
  { page: "pau-project-printing", label: "Project printing and binding", href: "/pau-project-printing" },
  { page: "pau-tailoring", label: "Tailoring and repairs", href: "/pau-tailoring" },
  { page: "pau-hair-and-barbing", label: "Hair, braids and barbing", href: "/pau-hair-and-barbing" },
  { page: "pau-phone-and-laptop-repair", label: "Phone and laptop repair", href: "/pau-phone-and-laptop-repair" },
  { page: "pau-buy-a-laptop", label: "Buying a laptop or a phone", href: "/pau-buy-a-laptop" },
  { page: "pau-laundry", label: "Laundry, collected from your block", href: "/pau-laundry" },
];

/**
 * A stable name for one question, out of the words the page asks it in.
 *
 * Not its position in the list: half these lists grow and shrink with what
 * the shop is doing today, so the third question on the parents page is a
 * different question on a day we are not collecting parcels, and an
 * override keyed on "third" would land on the wrong answer.
 *
 * The cost is that rewording a question in code starts it afresh, which is
 * the right way round: quietly keeping an old answer under a question
 * somebody has changed would be worse than losing the override.
 */
export function faqKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type PageFaqRow = {
  key: string;
  default_q: string;
  default_a: string;
  question: string;
  answer: string;
  hidden: boolean;
  custom: boolean;
  sort: number;
};

/**
 * What a page should show: its own questions, with anything somebody has
 * rewritten in admin put over the top.
 *
 * The page goes on working out its own wording, numbers and all, and hands
 * it in here. Back comes that wording unless somebody wanted different
 * words, minus anything they have taken off the page, plus anything they
 * have added by hand.
 *
 * The page's own wording is written back whenever it changes, so the
 * editor can show what an override is replacing and offer it back. That
 * write only happens on a render where the wording actually changed, which
 * is almost never: an ordinary visit reads one table and writes nothing.
 *
 * It never throws. A landing page losing its questions because a table is
 * missing is a page that ranks for nothing, so anything going wrong here
 * leaves the page exactly as it was written.
 */
export async function askedFor(page: string, defaults: Asked[]): Promise<Asked[]> {
  try {
    const { data, error } = await db()
      .from("page_faqs")
      .select("key, default_q, default_a, question, answer, hidden, custom, sort")
      .eq("page", page);
    if (error) throw new Error(error.message);

    const rows = new Map(((data ?? []) as PageFaqRow[]).map((row) => [row.key, row]));

    // Where the page has changed its mind since last time, say so, so the
    // editor is never offering yesterday's wording back.
    const stale = defaults
      .map((one, index) => ({ one, index, key: faqKey(one.q) }))
      .filter(({ one, key }) => {
        const row = rows.get(key);
        return row === undefined || row.default_q !== one.q || row.default_a !== one.a;
      });

    if (stale.length > 0) {
      await db()
        .from("page_faqs")
        .upsert(
          stale.map(({ one, index, key }) => ({
            page,
            key,
            default_q: one.q,
            default_a: one.a,
            sort: index,
          })),
          { onConflict: "page,key" }
        );
    }

    const mine = defaults.flatMap((one) => {
      const row = rows.get(faqKey(one.q));
      if (row?.hidden) return [];
      return [{ q: row?.question || one.q, a: row?.answer || one.a }];
    });

    // Added by hand, so there is no page wording underneath them.
    const added = ((data ?? []) as PageFaqRow[])
      .filter((row) => row.custom && !row.hidden && row.question.trim() !== "")
      .sort((a, b) => a.sort - b.sort)
      .map((row) => ({ q: row.question, a: row.answer }));

    return [...mine, ...added];
  } catch {
    return defaults;
  }
}

/** Everything stored for one page, for the editor. */
export async function pageFaqRows(page: string): Promise<PageFaqRow[]> {
  try {
    const { data, error } = await db()
      .from("page_faqs")
      .select("key, default_q, default_a, question, answer, hidden, custom, sort")
      .eq("page", page)
      .order("sort");
    if (error) throw new Error(error.message);
    return (data ?? []) as PageFaqRow[];
  } catch {
    return [];
  }
}
