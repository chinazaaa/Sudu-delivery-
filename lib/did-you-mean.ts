import { alike, words } from "./bot-match";

/**
 * The word somebody probably meant.
 *
 * "birthdat" finds nothing, and nothing is a dead end on the one screen
 * where somebody is actively trying to spend money. They typed seven of
 * eight letters right and the shop has a Birthday Cake Remix on a shelf,
 * so the only thing between them and it is a key they missed.
 *
 * The same bigram scorer the chat searches with, so the website and the
 * chat agree about what a near miss is. It compares word by word rather
 * than whole strings: "chiken republic" should find Chicken Republic
 * without the second word dragging the score down for being right.
 *
 * Suggestions only, never a redirect. Searching for one thing and being
 * shown another without being asked is how people stop trusting a search,
 * so this offers and the person chooses.
 */

/** Below this two words are not the same word badly typed, they are two
 *  different words, and offering one for the other is noise.
 *
 *  Raised from 0.55, which let "curta" through as "Curl": five letters
 *  sharing two bigrams scores 0.57, and on a long name there is always
 *  some word that scores that against something. A suggestion has to be
 *  the word they were typing, not the nearest thing in the shop. */
export const CLOSE_ENOUGH = 0.7;

export function didYouMean(
  said: string,
  among: string[],
  most = 3
): string[] {
  const typed = words(said);
  if (typed.length === 0) return [];

  const scored: { name: string; score: number }[] = [];
  const seen = new Set<string>();

  for (const name of among) {
    const key = name.trim().toLowerCase();
    if (key === "" || seen.has(key)) continue;
    seen.add(key);

    const theirs = words(name);
    if (theirs.length === 0) continue;

    /*
     * Every typed word against its best match in the name, averaged.
     *
     * Averaged rather than summed, so a long name is not rewarded for
     * having more words to get lucky with, and a one word search is not
     * drowned by a name that happens to be a sentence.
     */
    let total = 0;
    for (const word of typed) {
      let best = 0;
      for (const against of theirs) best = Math.max(best, alike(word, against));
      total += best;
    }

    const score = total / typed.length;
    if (score >= CLOSE_ENOUGH) scored.push({ name: name.trim(), score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, most))
    .map((one) => one.name);
}
