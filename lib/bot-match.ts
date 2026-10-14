/**
 * Finding what somebody meant, when they typed it in a hurry.
 *
 * The whole point of the chat is that ordering is faster than tapping
 * through a menu. That only holds if "chiken wings" finds the chicken
 * wings. A matcher that needs the spelling is a matcher that sends people
 * to WhatsApp, and sending somebody to WhatsApp is the chat failing at the
 * one thing it exists for.
 *
 * So nothing here is exact. Words are compared on how alike they look,
 * a missing letter costs a little and a wrong one costs a little more, and
 * what comes back is a ranked list with a confidence on it. The chat does
 * the rest: one clear answer goes straight in, a near thing asks "do you
 * mean", and only somebody who says no to everything twice is offered a
 * person.
 *
 * Pure, and handed its candidates, so every bit of this can be tested
 * without a database and without guessing what the menu holds.
 */

export type Candidate = {
  id: string;
  name: string;
  /** Anything else worth matching on: the description, the kitchen, the
   *  names of its own choices. A pizza whose flavour is an option is still
   *  findable by that flavour. */
  also?: string[];
};

export type Hit = {
  id: string;
  name: string;
  /** 0 to 1. What the chat reads to decide between going ahead and asking. */
  score: number;
};

/** Words that say nothing about what somebody wants. */
const NOISE = new Set([
  "i", "id", "we", "a", "an", "the", "and", "or", "of", "for", "to", "with",
  "want", "wants", "like", "need", "get", "give", "send", "please", "pls",
  "can", "could", "would", "me", "my", "us", "some", "any", "just", "also",
  "add", "order", "buy", "have", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten", "pcs", "pc", "piece", "pieces",
  "plus", "then", "thanks", "thank", "you",
]);

/** Everything lowercase, with the punctuation gone. */
export function flatten(said: string): string {
  return String(said ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The words worth matching on, noise dropped. */
export function words(said: string): string[] {
  return flatten(said)
    .split(" ")
    .filter((word) => word.length > 1 && !NOISE.has(word) && !/^\d+$/.test(word));
}

/**
 * How many of a thing somebody asked for.
 *
 * The first plain number in the sentence, because "2 medium pizzas" puts it
 * at the front and "pizza x2" is not how anybody types. Anything daft is
 * one: a chat is not the place to argue about ordering ninety pizzas, and
 * the shop would ring them anyway.
 */
export function howMany(said: string): number {
  const digits = flatten(said).match(/\b(\d{1,2})\b/);
  if (digits) {
    const asked = Number(digits[1]);
    if (asked >= 1 && asked <= 20) return asked;
  }
  const spelled: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  for (const [word, count] of Object.entries(spelled)) {
    if (new RegExp(`\\b${word}\\b`).test(flatten(said))) return count;
  }
  return 1;
}

/** The pairs of letters in a word, for comparing two spellings of one. */
function pairs(word: string): string[] {
  const out: string[] = [];
  for (let at = 0; at < word.length - 1; at += 1) out.push(word.slice(at, at + 2));
  return out;
}

/**
 * How alike two words look, from 0 to 1.
 *
 * The same word is 1. One word inside another is nearly 1, so "chick"
 * finds "chicken" and nobody has to finish typing. Otherwise it is how
 * many letter pairs they share, which is forgiving of a dropped letter, a
 * doubled one and a swapped pair, and unforgiving of two different words
 * that happen to start the same.
 */
export function alike(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  if (a.length >= 3 && b.startsWith(a)) return 0.93;
  if (b.length >= 3 && a.startsWith(b)) return 0.9;
  if (a.length >= 4 && b.includes(a)) return 0.86;

  const mine = pairs(a);
  const theirs = pairs(b);
  const left = [...theirs];
  let shared = 0;
  for (const pair of mine) {
    const at = left.indexOf(pair);
    if (at > -1) {
      shared += 1;
      left.splice(at, 1);
    }
  }
  return (2 * shared) / (mine.length + theirs.length);
}

/** Near enough to be the same word, allowing for a slip of the thumb. */
const CLOSE = 0.62;

/**
 * How well one thing on the menu answers what was typed.
 *
 * Every word somebody wrote looks for its best match among the words of
 * the candidate, and what comes back is how much of the sentence was
 * accounted for. A candidate that answers every word scores highest, and
 * one that answers a single word out of four is a weak suggestion rather
 * than an answer.
 *
 * The name counts for more than everything else, so a pizza called
 * Margherita beats a pizza that merely mentions one in its description.
 */
export function scoreOne(said: string[], one: Candidate): number {
  if (said.length === 0) return 0;
  const name = words(one.name);
  const extra = (one.also ?? []).flatMap((line) => words(line));
  if (name.length === 0 && extra.length === 0) return 0;

  let total = 0;
  for (const word of said) {
    let best = 0;
    for (const against of name) best = Math.max(best, alike(word, against));
    let loose = 0;
    for (const against of extra) loose = Math.max(loose, alike(word, against) * 0.72);
    total += Math.max(best, loose);
  }

  // What share of what they said this answers.
  const covered = total / said.length;

  // And what share of its own name was asked for, so "pizza" does not beat
  // "BBQ Chicken pizza" when somebody typed "bbq chicken pizza".
  let named = 0;
  for (const against of name) {
    let best = 0;
    for (const word of said) best = Math.max(best, alike(against, word));
    if (best >= CLOSE) named += 1;
  }
  const fullness = name.length === 0 ? 0 : named / name.length;

  return covered * 0.75 + fullness * 0.25;
}

/** How sure the chat is, which is what decides whether it asks. */
export type Sureness = "sure" | "asking" | "lost";

export type Found = {
  hits: Hit[];
  how: Sureness;
};

/** A clear winner goes straight in. */
const SURE = 0.72;
/** Worth putting up as "do you mean". */
const WORTH = 0.34;
/** And a winner has to be this far ahead of the next one to be a winner. */
const AHEAD = 0.14;

/**
 * What somebody probably meant, and how sure we are.
 *
 * "sure" is one answer well clear of the rest, which the chat adds and
 * shows for checking. "asking" is a handful worth putting up as buttons,
 * which is what somebody with a typo gets, and is a tap rather than a
 * dead end. "lost" is nothing close enough to offer, and even then the
 * chat shows the kitchen's own list before it offers a person: being
 * unable to read one sentence is not a reason to throw somebody out.
 */
export function find(said: string, among: Candidate[], most = 4): Found {
  const asked = words(said);
  if (asked.length === 0 || among.length === 0) return { hits: [], how: "lost" };

  const ranked = among
    .map((one) => ({ id: one.id, name: one.name, score: scoreOne(asked, one) }))
    .filter((one) => one.score >= WORTH)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  if (ranked.length === 0) return { hits: [], how: "lost" };

  const hits = ranked.slice(0, most);
  const clear =
    hits[0].score >= SURE && (hits.length === 1 || hits[0].score - hits[1].score >= AHEAD);

  return { hits, how: clear ? "sure" : "asking" };
}

/**
 * Whether somebody is asking for a person rather than for food.
 *
 * Checked before the menu is searched, because "can I speak to someone"
 * matched against a menu finds a chicken sandwich.
 */
export function wantsAPerson(said: string): boolean {
  return /\b(human|person|someone|somebody|agent|talk|speak|call|whatsapp|help me)\b/.test(
    flatten(said)
  );
}

/** Yes, no, or neither, for the questions the chat asks straight. */
export function yesNo(said: string): "yes" | "no" | "" {
  const flat = flatten(said);
  if (/\b(yes|yeah|yep|yh|ya|sure|ok|okay|correct|right|that one|exactly|please do)\b/.test(flat)) {
    return "yes";
  }
  if (/\b(no|nope|nah|wrong|not that|something else|different)\b/.test(flat)) return "no";
  return "";
}

/** Words that appear in a counter's name and say nothing about which one. */
const SHOPWORDS = new Set([
  "pizza", "pizzas", "chicken", "kitchen", "kitchens", "food", "foods",
  "restaurant", "store", "shop", "cafe", "grill", "grills", "express",
  "place", "spot", "joint", "bar", "house", "company", "co", "ltd",
]);

/**
 * The counters somebody named, in the order they named them.
 *
 * "Domino's and KFC" is a sentence about where, not about what, and
 * searching a menu for it finds nothing worth offering. Read first, so the
 * chat can answer the question that was actually asked: what would you
 * like from Domino's, and then what from KFC.
 *
 * Matched on the distinctive words of each name rather than on the whole
 * of it, because nobody types "Domino's Pizza" and "chicken republic" is
 * two words of which one is on half the menu.
 */
export function namedIn(
  said: string,
  shops: { id: string; name: string }[],
  /** How alike a word has to be. Lower it and near misses come back, which
   *  is what "did you mean Chicken Republic" is made of. */
  near = 0.8
): { id: string; name: string }[] {
  const asked = words(said);
  if (asked.length === 0) return [];

  const found: { id: string; name: string; at: number }[] = [];
  for (const shop of shops) {
    const all = words(shop.name);
    // The word that is only theirs. "Chicken Republic" is Republic: asked
    // for chicken wings, the chicken belongs to the wings and half the
    // menu, and a counter picked off it would hijack the sentence.
    const mine = all.filter((word) => !SHOPWORDS.has(word));
    const look = mine.length > 0 ? mine : all;
    if (look.length === 0) continue;

    let where = -1;
    for (const word of look) {
      for (let at = 0; at < asked.length; at += 1) {
        // A short name is matched whole. Three letters are too few for a
        // near miss to mean anything: "kfz" is not KFC, it is a typo
        // nobody can resolve.
        const score = word.length <= 3 ? (asked[at] === word ? 1 : 0) : alike(asked[at], word);
        if (score >= near) where = where === -1 ? at : Math.min(where, at);
      }
    }
    if (where > -1) found.push({ id: shop.id, name: shop.name, at: where });
  }

  return found
    .sort((a, b) => a.at - b.at)
    .map((one) => ({ id: one.id, name: one.name }));
}

/**
 * Whether what somebody typed is plausibly their name.
 *
 * Asked "what should I call you", a fair few people answer with what they
 * want to eat, because that is what they came for and the box is the
 * first one they met. Taking "Domino's" as a name means every message
 * afterwards is addressed to a pizza shop, and the shop's own books fill
 * up with customers called Chicken.
 *
 * Deliberately generous, because a name is not a thing to argue about: it
 * refuses what is plainly food, a counter, or not letters at all, and
 * accepts everything else. Somebody really called Ola Pizza will be asked
 * once and then taken at their word.
 */
export function looksLikeAName(
  said: string,
  kitchens: { id: string; name: string }[] = []
): boolean {
  const flat = flatten(said);
  if (flat === "") return false;
  // Letters, and enough of them to be a name rather than a slip.
  if (!/[a-z]{2}/.test(flat)) return false;
  // A sentence is not a name.
  if (flat.split(" ").length > 4) return false;
  if (namedIn(said, kitchens).length > 0) return false;

  const mine = words(said);
  if (mine.length === 0) return false;
  return !mine.some((word) => FOODWORDS.has(word));
}

/** The words that mean somebody answered the wrong question. */
const FOODWORDS = new Set([
  "pizza", "pizzas", "chicken", "wings", "burger", "burgers", "rice",
  "jollof", "shawarma", "doughnut", "doughnuts", "donut", "donuts",
  "fries", "chips", "coke", "drink", "drinks", "meal", "meals", "food",
  "pasta", "noodles", "salad", "cake", "ice", "cream", "suya", "bread",
  "sandwich", "wrap", "platter", "chops", "bucket", "combo", "order",
  "hungry", "eat",
]);

/**
 * A Nigerian mobile, however it was typed, or nothing.
 *
 * The same rule the rest of the shop keeps, kept here as well so the chat
 * can say "that does not look right" while somebody is still looking at
 * the box, rather than letting them get to the end and find out then.
 */
export function phoneIn(said: string): string | null {
  const digits = String(said ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  let local: string;
  if (digits.startsWith("234")) local = `0${digits.slice(3)}`;
  else if (digits.startsWith("0")) local = digits;
  else if (digits.length === 10) local = `0${digits}`;
  else return null;
  return /^0[789]\d{9}$/.test(local) ? local : null;
}

/**
 * Counters somebody nearly named.
 *
 * "Chiken Republik" is not a counter by the strict reading and is
 * obviously one to a person, so the gap between the two is where "did you
 * mean" lives. Whatever was named outright is left out, because there is
 * nothing to ask about those.
 */
export function nearlyNamed(
  said: string,
  shops: { id: string; name: string }[]
): { id: string; name: string }[] {
  const sure = new Set(namedIn(said, shops).map((one) => one.id));
  return namedIn(said, shops, 0.6).filter((one) => !sure.has(one.id));
}
