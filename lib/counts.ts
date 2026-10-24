/**
 * A count in words.
 *
 * Two hamburger meals were ordered and one was bought, and the whole of
 * that mistake is a digit that looks exactly like every other digit on the
 * page. It costs twice: the customer is short a meal, and the shop hands
 * back money it has already paid at a counter.
 *
 * So anything above one is said twice, as a number and as a word. The two
 * fail differently, and somebody reading at a till in a hurry has to miss
 * both. Here rather than beside the thing that draws it, because a
 * message to a counter has no colour to use and needs the same word.
 */
const WORDS = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** The count in words, where there is a word for it, and the digits where
 *  there is not: nobody reads "seventeen" faster than 17. */
export function inWords(qty: number): string {
  const many = Math.round(Number(qty) || 0);
  return WORDS[many] ?? String(many);
}
