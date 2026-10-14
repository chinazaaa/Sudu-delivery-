import { scoreOne, words } from "./bot-match";

/**
 * Matching a question to an answer the shop has already written.
 *
 * Kept apart from the rest of the FAQ code because the chat runs in a
 * browser and the rest of that file talks to the database. A client bundle
 * that imports a module holding a server key is a bundle nobody should
 * ship, however carefully the key is read.
 */

/** Sure enough to answer rather than to offer. */
const SURE = 0.52;
/** Worth offering as "did you mean this?". */
const WORTH = 0.42;

/**
 * The words a question is made of rather than about.
 *
 * "What are your fees" is four words of which one carries the question,
 * and scored whole it reaches nothing: three quarters of the sentence
 * cannot match any entry, and the one word that does is outvoted. Dropped,
 * what is left is what was being asked.
 */
const ASKING = new Set([
  /*
   * "Where" and "when" are not in here on purpose. They look like the
   * same kind of word as "what" and "how", and they are not: "where is my
   * order" and "when will it come" are two different questions whose
   * whole difference is that word, and dropped they both become "order".
   */
  "what", "whats", "why", "who", "which", "how", "whose",
  "are", "your", "yours", "you", "u", "do", "does", "did", "is", "am", "be",
  "can", "could", "will", "would", "should", "there", "their", "they", "it",
  "its", "if", "about", "tell", "know", "mean", "much", "many", "any", "my",
  "me", "we", "us", "the", "and", "for", "from", "that", "this", "please",
  "hi", "hello", "guys", "sudu", "shop",
]);

export type FaqHit = { id: string; question: string; answer: string; score: number };

/**
 * The entry that answers what somebody just said, if one does.
 *
 * The same bigram matcher the menu search uses, because people ask
 * questions the way they order food: shortened, misspelt, and without the
 * words they assume are obvious. The keywords are matched as part of the
 * question, which is how "how much is delivery", "what are your fees" and
 * "delivery price" all reach one answer without three entries.
 *
 * Two floors rather than one. Above the higher one it answers, because
 * being answered is the whole point. Between the two it offers the question
 * it thinks was asked and lets somebody tap it, because an answer to a
 * question nobody asked is worse than a question.
 */
export function pickFaq(
  said: string,
  among: { id: string; question: string; answer: string; keywords: string }[]
): { sure: FaqHit | null; maybe: FaqHit[] } {
  const all = words(said);
  const asked = all.filter((word) => !ASKING.has(word));
  if (asked.length === 0 || among.length === 0) return { sure: null, maybe: [] };

  const scored = among
    .map((one) => ({
      id: one.id,
      question: one.question,
      answer: one.answer,
      score: scoreOne(asked, {
        id: one.id,
        // The keywords ride along with the question, so one entry can be
        // reached by every way anybody asks it.
        name: `${one.question} ${one.keywords.split(",").join(" ")}`.trim(),
      }),
    }))
    .filter((one) => one.score >= WORTH)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { sure: null, maybe: [] };
  if (scored[0].score >= SURE) return { sure: scored[0], maybe: [] };
  return { sure: null, maybe: scored.slice(0, 3) };
}
