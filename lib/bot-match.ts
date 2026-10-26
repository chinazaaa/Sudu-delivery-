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
  // A number with a unit after it describes the thing, not how many of it:
  // "chicken wings 7pcs" is one portion of seven wings, and read as a
  // quantity it is seven portions and forty-nine wings.
  const flat = flatten(said).replace(
    /\b(\d{1,3})\s*(pcs|pc|pieces|piece|cl|ml|litre|liter|kg|g|inch|in)\b/g,
    " "
  );
  const digits = flat.match(/\b(\d{1,2})\b/);
  if (digits) {
    const asked = Number(digits[1]);
    if (asked >= 1 && asked <= 20) return asked;
  }
  const spelled: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  for (const [word, count] of Object.entries(spelled)) {
    if (new RegExp(`\\b${word}\\b`).test(flat)) return count;
  }
  return 1;
}

/**
 * Whether a number is part of what the thing is called.
 *
 * "Chicken Wings - 4PCS" holds a four, and somebody asking for it by name
 * is asking for one of them rather than for four. Checked against the
 * thing that was actually matched, because only then is it known.
 */
export function countedInName(name: string, qty: number): boolean {
  if (qty <= 1) return false;
  // Not a word boundary: "4PCS" has no space in it, and a boundary looks
  // for one. Only another digit would make this a different number.
  return new RegExp(`(?<!\\d)${qty}(?!\\d)`).test(flatten(name));
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
    hits[0].score >= SURE &&
    (hits.length === 1 || hits[0].score - hits[1].score >= AHEAD) &&
    // One word, and only nearly that word, is never certain.
    heard(asked, hits[0].name) &&
    // And one word that names a whole shelf is never an answer.
    !aKind(asked, ranked);

  return { hits, how: clear ? "sure" : "asking" };
}

/**
 * Whether one word was a dish or a kind of dish.
 *
 * Somebody picked Domino's, was asked what they wanted, and said "pizza".
 * The chat said "Found it: Pizza Sauce Calzone" and added it. Every word
 * of that is true and none of it is what was asked for: at a pizza place
 * "pizza" is not the name of a dish, it is the name of the menu, and the
 * one it landed on won by being first in a long list of things with the
 * word in them.
 *
 * So a single word that is in the name of several things on offer is a
 * kind rather than a thing, and a kind is a question. "Zinger" is still
 * one dish and still goes straight in; "pizza", "rice", "chicken",
 * "burger" put the real ones up to be tapped.
 *
 * Only on a single word. "chicken bbq" is two, agrees with one dish, and
 * was never ambiguous.
 */
const A_FEW = 3;

function aKind(asked: string[], ranked: { name: string }[]): boolean {
  if (asked.length !== 1) return false;
  const word = asked[0];
  if (word.length < 3) return false;
  const inName = ranked.filter((one) =>
    words(one.name).some((part) => part === word || part.startsWith(word))
  );
  return inName.length >= A_FEW;
}

/**
 * Whether the winner was actually recognised, or merely resembled.
 *
 * "Can I change my order" put a packet of hangers in somebody's basket.
 * Every word of it but one is noise, so the search ran on "change" alone;
 * "change" and "hangers" share four letter pairs out of six, which scores
 * 0.73 on the bigrams and sailed past the floor for certainty. The chat
 * said "Found it: Hangers, 6" and added it.
 *
 * The bigrams are right for a typo and wrong for this. They measure how
 * alike two words look, and two unrelated words can look alike, which is
 * survivable when four words all agree and a disaster when the whole
 * sentence came down to one.
 *
 * So a single-word search has to have really hit something: the same word,
 * or the start of one, or a word inside one. "zinger" still finds Zinger
 * Burger, "chiken" still finds Chicken, and a lone word that merely
 * resembles a dish becomes a question rather than an answer. Nothing is
 * lost by asking; a wrong thing in the basket costs somebody money.
 */
function heard(asked: string[], name: string): boolean {
  if (asked.length > 1) return true;

  const word = asked[0];
  return words(name).some(
    (against) =>
      against === word ||
      (word.length >= 4 && against.startsWith(word)) ||
      (against.length >= 4 && word.startsWith(against)) ||
      (word.length >= 5 && against.includes(word)) ||
      (against.length >= 5 && word.includes(against))
  );
}

/**
 * A sentence shaped like a question rather than like an order.
 *
 * Checked before the menu is searched, for the same reason "can I speak to
 * someone" is: a question run through a menu finds food, because a menu is
 * all it has to find. "Can I change my order", "do you deliver on Sunday"
 * and "how much is delivery" are all people talking to the shop, and the
 * shop has answers for them that are not a dish.
 *
 * A question mark is the giveaway where somebody typed one. Most people do
 * not, so the opening word is read as well: the words below start a
 * question and almost never start an order. "Can I get jollof" does start
 * one, which is why this only decides where to look first and never
 * decides that the answer is not food.
 */
export function looksLikeAQuestion(said: string): boolean {
  const text = String(said ?? "").trim();
  if (text.endsWith("?")) return true;

  const first = flatten(text).split(" ")[0] ?? "";
  return [
    "can", "could", "do", "does", "did", "is", "are", "was", "will", "would",
    "should", "what", "whats", "when", "where", "why", "who", "which", "how",
    "am", "have", "has", "may", "must", "shall",
  ].includes(first);
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
  return whyNotAName(said, kitchens) === "";
}

/** Why an answer to "what should I call you?" is not a name, if it is not. */
export type NotAName = "" | "nothing" | "sentence" | "food" | "errand";

/**
 * Words that cannot be anybody's name, however the name is spelt.
 *
 * The point of this list is what is *not* on it. Plenty of Nigerian names
 * are ordinary English words, and a list built by feel ends up refusing
 * them: Grace, Faith, Hope, Peace, Joy, Blessing, Favour, Precious,
 * Charity, Patience, Mercy, Comfort, Gift, Promise, Success, Miracle,
 * Destiny, Wisdom, Goodluck, Sunday, Monday, Emmanuel, Prince, King,
 * Queen. Every one of those is somebody, and a chat that tells them their
 * name is not a name is worse than one that greets a pizza.
 *
 * So this is only the words that mean somebody answered a different
 * question: what they came to do, what they want from us, and the hello
 * they typed before reading. Nothing here is a name in any language,
 * because none of it is a word anybody is given.
 */
const NOT_NAMES = new Set([
  // What they came to do.
  "order", "ordering", "reorder", "delivery", "deliver", "booking", "book",
  "enquiry", "enquiries", "inquiry", "inquiries", "question", "questions",
  "complaint", "complaints", "refund", "refunds", "payment", "payments",
  "transfer", "receipt", "invoice", "price", "prices", "pricing", "cost",
  "menu", "menus", "list", "catalogue", "support", "help", "info",
  "information", "details", "cancel", "cancellation", "checkout",
  "sudu", "shop", "store",
  // Nobody in particular.
  "customer", "client", "user", "guest", "admin", "anonymous", "someone",
  "somebody", "anybody", "nobody", "myself", "person", "human", "bot",
  "name", "names", "unknown", "nothing", "none", "nil", "na", "anything",
  "something", "whatever", "idk", "dunno", "test", "testing", "asap",
  // A hello rather than an answer.
  "hello", "hi", "hey", "yo", "sup", "morning", "afternoon", "evening",
  "greetings", "please", "thanks", "ok", "okay", "yes", "no", "yeah",
  "yep", "nope", "sure", "maybe",
]);

/**
 * The same judgement as looksLikeAName, but it says which way it failed.
 *
 * Because the sentence the chat says back has to match: somebody who typed
 * "pizza" is told we will get to the food in a second, and somebody who
 * typed "inquiry" is told that is what they are after rather than what
 * they are called. One wording for both is a chat that is not listening,
 * and being told you answered the wrong question in the wrong words is
 * the moment people decide the thing is broken.
 *
 * Still generous either way. It refuses what is plainly food, plainly an
 * errand, or plainly not letters, and accepts everything else: a name is
 * not a thing to argue about, and somebody really called Ola Pizza will be
 * asked once and then taken at their word.
 */
export function whyNotAName(
  said: string,
  kitchens: { id: string; name: string }[] = []
): NotAName {
  const given = nameIn(said);
  const flat = flatten(given);
  if (flat === "") return "nothing";
  // Letters, and enough of them to be a name rather than a slip.
  if (!/[a-z]{2}/.test(flat)) return "nothing";
  // A sentence is not a name.
  if (flat.split(" ").length > 4) return "sentence";
  if (namedIn(given, kitchens).length > 0) return "food";

  const mine = words(given);
  if (mine.length === 0) {
    // Everything in it was filtered as noise, so there is no name in there.
    return flat.split(" ").some((word) => NOT_NAMES.has(word)) ? "errand" : "nothing";
  }
  if (mine.some((word) => FOODWORDS.has(word))) return "food";
  if (mine.some((word) => NOT_NAMES.has(word))) return "errand";
  // A word the noise filter dropped can still be the giveaway: "ok" and
  // "yes" never survive it, and neither is a name.
  if (flat.split(" ").every((word) => NOT_NAMES.has(word))) return "errand";
  return "";
}

/**
 * The name out of however somebody said it.
 *
 * "My name is Chinaza" was being stored as "My", because the first word of
 * the answer is the name right up until somebody is polite about it. The
 * introductions come off, and what is left is taken as given: anything
 * clever here would be a chat arguing with somebody about their own name.
 */
export function nameIn(said: string): string {
  let text = String(said ?? "").trim();

  const lead =
    /^(?:my name is|my name's|the name is|my name|i am|i'm|im|it is|it's|its|this is|you can call me|call me|they call me|name)\b[\s:,-]*/i;
  for (let pass = 0; pass < 2; pass += 1) {
    const shorter = text.replace(lead, "").trim();
    if (shorter === text) break;
    text = shorter;
  }

  return text.replace(/[\s.,!]+$/, "").trim();
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

/**
 * The same sentence with the counter's name taken out of it.
 *
 * Once a counter is doing the filtering, its own name is no longer a word
 * about food: left in, "Domino's half and half" is three words of which
 * one can never be matched, and every dish on that menu is marked down
 * for it equally. Taken out, what is left is what they actually want.
 */
export function without(
  said: string,
  shops: { id: string; name: string }[]
): string {
  const theirs = new Set(
    shops.flatMap((shop) => words(shop.name).filter((word) => !SHOPWORDS.has(word)))
  );
  if (theirs.size === 0) return said;

  const kept = flatten(said)
    .split(" ")
    // "Domino's" flattens to "domino s", and the orphaned s is not a word
    // about food either.
    .filter((word) => word.length > 1)
    .filter((word) => {
      for (const mine of theirs) {
        const near = mine.length <= 3 ? (word === mine ? 1 : 0) : alike(word, mine);
        if (near >= 0.8) return false;
      }
      return true;
    });

  const left = kept.join(" ").trim();
  // Nothing but the counter's name: give the sentence back rather than
  // searching a whole menu for an empty string.
  return left === "" ? said : left;
}

/** The two halves of a change: what goes, and what takes its place. */
export type Swap = {
  /** What they no longer want, in their own words. Empty where they only
   *  said "change it", which means whatever is being talked about. */
  drop: string;
  /** What they want instead. Empty where they only asked for something to
   *  be taken off. */
  want: string;
};

/**
 * Apostrophes, which flattening turns into orphaned letters.
 *
 * "I don't want" flattens to "i don t want", and every pattern about not
 * wanting something then has to carry a stray t. Put back as one word, the
 * patterns read like the sentences they are about.
 */
function knit(flat: string): string {
  return flat
    .replace(/\bdon t\b/g, "dont")
    .replace(/\bdoesn t\b/g, "doesnt")
    .replace(/\bwon t\b/g, "wont")
    .replace(/\bcan t\b/g, "cant")
    .replace(/\bi d\b/g, "id")
    .replace(/\bi ve\b/g, "ive");
}

/** Where one half of a change sentence stops and the other begins. */
const TURN =
  /\b(?:anymore|any more|no more|instead|rather|and then|but|i want|id like|id prefer|change it|make it|swap it|please)\b/;

/**
 * One half of a change sentence, with the grammar filed off.
 *
 * What is left has to be something the finder can look up, so the leading
 * articles go, the trailing courtesies go, and the sentence is cut where it
 * turns into the other half: "chicken from kfc anymore i want chicken
 * republic" is a thing to drop and a thing to add, not one long dish.
 *
 * "From KFC" is deliberately kept. It is the half of the phrase that says
 * which of five chickens they meant, and the finder reads counters out of a
 * sentence already.
 */
function half(part: string): string {
  let text = part.trim();

  const cut = text.search(TURN);
  if (cut > 0) text = text.slice(0, cut);

  let was = "";
  while (was !== text) {
    was = text;
    text = text
      .replace(
        /^(?:the|my|a|an|that|this|it|them|those|of|to|for|want|wanted|order|ordered|get|have)\s+/,
        ""
      )
      .trim();
  }

  return text
    .replace(/\s+(?:please|thanks|thank you|instead|anymore|any more)$/, "")
    .replace(/^(?:it|that|this|them)$/, "")
    .trim();
}

/**
 * A sentence that changes an order already half placed.
 *
 * "I don't want chicken from KFC anymore, I want to change it to Chicken
 * Republic" is one sentence doing two jobs, and until the chat could read
 * it the only answer was to start the whole order again. It is also, by
 * some distance, the most common thing anybody says after seeing a bill.
 *
 * Both halves are optional. "Remove the jollof" is a drop with nothing to
 * put back; "change it to Chicken Republic" is a swap for whatever is
 * being talked about, which the chat already knows. Neither half found and
 * this is not a change at all, so it goes back as nothing and the sentence
 * is treated as the ordinary order it probably is.
 */
export function asksToSwap(said: string): Swap | null {
  const flat = knit(flatten(said));
  const changing = /\b(?:change|swap|switch|replace|instead)\b/.test(flat);
  const dropping =
    /\b(?:dont|no longer|remove|cancel|delete|drop|scratch|forget|take off|take out)\b/.test(
      flat
    );
  if (!changing && !dropping) return null;

  let drop = "";
  let want = "";

  /*
   * Each pattern is tried and the grammar filed off before it is kept,
   * because a pattern can match and still say nothing: "change it to
   * Chicken Republic" offers "it" as the thing to drop, and "it" is the
   * sentence pointing at something the chat already knows rather than at a
   * dish. Filed down to nothing, it lets the next pattern have a go.
   */
  const keep = (part: string | undefined, into: "drop" | "want"): void => {
    const got = half(part ?? "");
    if (got === "") return;
    if (into === "drop" && drop === "") drop = got;
    if (into === "want" && want === "") want = got;
  };

  // "Instead of the jollof give me fried rice", and the same sentence said
  // the other way round.
  const instead = flat.match(/\binstead of (.+)$/);
  if (instead) {
    const rest = instead[1];
    const split = rest.match(
      /^(.+?)\s+(?:give me|gimme|i want|id like|can i get|can i have|let me have|make it|do|use|put)\s+(.+)$/
    );
    if (split) {
      keep(split[1], "drop");
      keep(split[2], "want");
    } else {
      keep(rest, "drop");
      keep(flat.slice(0, instead.index ?? 0), "want");
    }
  }

  // "Change the chicken to Chicken Republic", which is both halves in one
  // clause and the clearest thing anybody says.
  const swapped = flat.match(
    /\b(?:change|swap|switch|replace)\s+(.*?)\s+(?:to|for|with|into)\s+(.+)$/
  );
  if (swapped) {
    keep(swapped[1], "drop");
    keep(swapped[2], "want");
  }

  // Said as two sentences: the thing that is off, then the thing that is on.
  const gone = flat.match(
    /\b(?:dont want|dont need|do not want|no longer want|no longer need|remove|cancel|delete|drop|scratch|forget|take off|take out)\s+(.+)$/
  );
  if (gone) keep(gone[1], "drop");

  const asked = flat.match(
    /\b(?:i want|id like|id prefer|give me|gimme|can i get|can i have|make it|rather have|rather)\s+(.+)$/
  );
  if (asked) keep(asked[1], "want");

  // "Want" can catch the half that was already read as the drop, where
  // somebody says "I don't want the chicken" and nothing else.
  if (want !== "" && want === drop) want = "";
  if (drop === "" && want === "") return null;

  return { drop, want };
}

/**
 * Which line of an order somebody means, by name.
 *
 * The same matcher the menu search uses, pointed at a basket of four things
 * instead of a menu of four hundred. "The chicken" has to find "Zinger
 * Burger Meal" from KFC, so the counter's name counts as well as the
 * dish's: somebody who says "the KFC one" has said enough.
 */
export function lineLike(
  said: string,
  lines: { name: string; shop?: string }[],
  /* Higher than the menu search's floor, and for the opposite reason: a
   * menu of four hundred can afford to offer a near miss as a question,
   * while a basket of three has to come back with nothing rather than
   * removing the only line that scored at all. "Ice cream" against jollof
   * rice scores a third on the bigrams alone. */
  least = 0.45
): number {
  const asked = words(said);
  if (asked.length === 0 || lines.length === 0) return -1;

  let best = -1;
  let score = 0;
  lines.forEach((line, which) => {
    const mine = scoreOne(asked, {
      id: String(which),
      name: `${line.name} ${line.shop ?? ""}`.trim(),
    });
    if (mine > score) {
      score = mine;
      best = which;
    }
  });

  return score >= least ? best : -1;
}

/** A number at the front of a phrase, in digits or in words. */
const COUNTED =
  /^\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\b/i;

/**
 * An order written out as a list, split into the things on it.
 *
 * Plenty of people arrive with the order already written down: it was
 * agreed in a group chat, or typed into a notepad while everybody said what
 * they wanted, and it gets pasted in whole. "5 jollof, 2 zinger burger, 1
 * coke" is five, two and one of three different things, and read as one
 * sentence it matches nothing at all.
 *
 * Commas, new lines, semicolons and plus signs are a list and are always
 * split on. "And" is not: "fish and chips", "jollof rice and chicken" and
 * "half and half" are all one dish, and splitting those is worse than not
 * splitting at all. So it only counts as a join where both sides start with
 * a number, which is how a list written out loud reads and is not how any
 * dish on the menu is named.
 *
 * Nothing that looks like one thing comes back as a list, so an ordinary
 * sentence is still handled by the ordinary search.
 */
export function splitOrder(said: string): string[] {
  const text = String(said ?? "").trim();
  if (text === "") return [];

  /*
   * A pasted cart first.
   *
   * It has no commas and no new lines of its own, but it does have prices
   * in it, and "+N9,700" split on the comma gives a line called "700".
   * Cutting at the counts has to happen on the whole thing or not at all.
   */
  const basket = basketLines(text);
  if (basket.length > 0) return basket;

  const parts = text
    .split(/\s*(?:\r?\n|[,;]|\s\+\s|\sthen\s|\salso\s)\s*/i)
    .flatMap((part) => {
      // "2 pizza and 1 coke" is two things. "Fish and chips" is one.
      const joined = part.split(/\s+and\s+/i);
      if (joined.length === 2 && joined.every((side) => COUNTED.test(side))) {
        return joined;
      }
      return [part];
    })
    .map((part) =>
      part
        .replace(/^\s*(?:and|plus|with|also)\s+/i, "")
        .replace(/\s*(?:please|thanks|thank you|thats all|that is all)\s*$/i, "")
        .trim()
    )
    .filter((part) => part !== "" && words(part).length > 0);

  return parts.length >= 2 ? parts : [];
}

/**
 * A basket pasted in whole, split into its lines.
 *
 * Somebody with an order already on screen copies it and pastes it here,
 * which is the most complete thing anybody ever types and was the one the
 * chat handled worst. A cart copied off a page has no commas and no new
 * lines in it: the browser runs the whole table together, and what is left
 * marking one line from the next is the quantity at the front of each.
 *
 *   I want to order the below 1 x Chicken BBQ Medium x Original x Dodo
 *   Pizza 1 x Pepperoni Original x Dodo Pizza Medium x 1 x Assorted
 *   doughnuts Half dozen (6) +N9,700 x Krispy Kreme
 *
 * Read as one sentence that matches nothing, which is the chat telling
 * somebody who has done more work than anybody else that it cannot find
 * their order.
 *
 * So it cuts before each count. The counter's name is left on the line,
 * because the search scores the dish and the counter together and "Dodo
 * Pizza" is most of what makes Pepperoni Original findable. The prices
 * come off, because a figure the shop did not work out is not something
 * to search for and not something to trust.
 */
export function basketLines(said: string): string[] {
  const text = String(said ?? "").trim();
  if (text === "") return [];

  // Before each count: a number, a times sign, a space and a letter. The
  // times sign is what makes it a cart line rather than a dish with a
  // number in its name, so "7 Up" and "5 Alive" are never cut.
  const cut = text.split(/\s+(?=\d+\s*[x×✕✖*]\s+[A-Za-z])/);
  if (cut.length < 2) return [];

  const lines = cut
    .map((part) =>
      part
        // The price the page printed beside the line. Not a thing to
        // search for, and not a number this shop would stand behind
        // coming back in through a paste.
        .replace(/\+?\s*[₦N#]\s*\d[\d,. ]*/g, " ")
        // And a plus with nothing left after it, which is what the page
        // printed before the figure.
        .replace(/\s\+(?=\s|$)/g, " ")
        // A times sign left hanging where an option or a counter used to
        // be, which is most lines once the page's columns run together.
        .replace(/\s[x×✕✖*]\s*$/i, "")
        // A word left dangling at the end because the next line was cut
        // away from it: "2 x chicken pie and" is one line and a conjunction.
        .replace(/\s+(?:and|plus|with|also|then|,)\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    // The run-up, which is somebody saying they are about to paste
    // something rather than naming anything.
    .filter((part) => /^\d+\s*[x×✕✖*]\s+/i.test(part))
    .map((part) =>
      // The times sign between the count and the dish, so the line reads
      // as "2 hamburger meal" and the count is read the way it is read
      // everywhere else.
      part.replace(/^(\d+)\s*[x×✕✖*]\s+/i, "$1 ")
    )
    .filter((part) => words(part).length > 0);

  return lines.length >= 2 ? lines : [];
}

/**
 * What somebody wants, where they said it instead of saying a dish.
 *
 * Every one of these is a sentence that matched nothing on any menu and so
 * got "I cannot find that anywhere on the shop", which is the chat calling
 * a reasonable person wrong. Each has a right next question instead, and
 * the shop's own written answers are tried before any of them.
 */
export type Intent =
  | ""
  | "vague-order"
  /** A question, a complaint, or a refund: somebody with something to say. */
  | "question"
  /**
   * Where is my order.
   *
   * The most asked thing after what delivery costs, and the one the chat
   * used to answer by pointing at another page. It knows the answer.
   */
  | "mine"
  /** What delivery costs, which is the single most asked thing. */
  | "fees"
  /** What there is, rather than which one of it. */
  | "menu"
  /** Help or support, which is two different jobs until you ask which. */
  | "help"
  /**
   * A box rather than a dish.
   *
   * The shop sells made-up boxes -- gifts, care packages, a birthday, a
   * movie night -- and none of them is on the food menu, because a box is
   * a shelf of its own with its own pages. Searched for as a dish it finds
   * nothing, and "I cannot find that anywhere on the shop" is the chat
   * saying no to a thing the shop is actively selling.
   */
  | "box"
  /**
   * They genuinely do not know what they want.
   *
   * The commonest thing anybody says to a person behind a counter, and
   * the one answer a menu search can do nothing with. Asking "what would
   * you like?" again is the chat repeating the question they have just
   * said they cannot answer.
   */
  | "unsure";

/**
 * Words that on their own mean "you decide".
 *
 * A sentence of nothing but these is somebody asking to be helped rather
 * than naming a dish. Kept apart from the phrase patterns because they are
 * only safe as a whole sentence: the shop sells a Choose Your Own Shake
 * and a Surprise Serum, and catching these words anywhere would put both
 * out of reach.
 */
const UNSURE = new Set([
  "pick", "picks", "choose", "chose", "decide", "surprise", "random",
  "anything", "any", "whatever", "something", "suggest", "suggestion",
  "suggestions", "recommend", "recommendation", "recommendations", "idea",
  "ideas", "options", "unsure", "best", "nice", "good",
]);

/** Words that mean "I want to order" and nothing more specific. */
const VAGUE = new Set([
  "order", "orders", "ordering", "food", "foods", "hungry", "eat", "eating",
  "buy", "something", "anything", "stuff", "whatever", "delivery", "deliver",
  "lunch", "dinner", "breakfast",
]);

/**
 * The small words a sentence about wanting something is made of.
 *
 * The noise list is built for matching dish names, where "am" and "now"
 * never appear and so never needed filtering. "I am hungry now" is four
 * words of which one carries anything, and without these it reads as a
 * sentence with real words in it.
 */
const FILLER = new Set([
  "am", "im", "is", "are", "was", "be", "been", "do", "does", "did", "dont",
  "really", "very", "quite", "now", "today", "tonight", "later", "already",
  "so", "well", "actually", "maybe", "think", "guess", "wanna", "gonna",
  "make", "place", "put", "like", "looking", "look", "trying", "try",
  "hi", "hello", "hey", "good", "day", "sir", "ma", "abeg", "biko", "jare",
  /*
   * Pointing at something rather than naming it.
   *
   * "I want to order the below" is somebody about to paste a list, and
   * searched as written it found Yellow Pepper: "below" and "yellow" are
   * one letter and a shuffle apart, and a menu is all the search has to
   * offer. None of these is the name of anything on any shelf, and every
   * one of them is a person saying the food is coming next.
   */
  "below", "above", "following", "attached", "listed", "list", "these",
  "those", "items", "item",
]);

/**
 * An answer that is about ordering rather than an order.
 *
 * Asked what they fancy, plenty of people say "I want to order", because
 * every other chat box on the internet opens by asking which department
 * they want. Searched for, "i want to order" matches nothing and the chat
 * says it cannot find it anywhere on the shop, which reads as broken.
 *
 * And some people have not come to order at all. "I have an enquiry" is a
 * person with a question, and the shop would rather hear it than have them
 * pushed round a menu they are not shopping from.
 *
 * Anything with a real word in it is left alone: "I want to order from
 * Domino's" names a counter and goes to the search like anything else, and
 * "where is my order" is a question about an order rather than either of
 * these. Lunch and dinner sit in the vague list rather than the food one
 * because "I want lunch" is a sentence about wanting lunch, and nothing on
 * the menu is called it.
 */
/**
 * "Can I order from Domino's?"
 *
 * A question about whether a kitchen is on, which deserves a yes and then
 * the next question, rather than a yes and a full stop. Somebody who asks
 * this is somebody who wants to order from them, so the answer ends by
 * asking what they would like.
 *
 * Only a question. "2 dodo pizza" names a kitchen too and is an order, not
 * an enquiry, and sending it here would make somebody type their order
 * twice. So the sentence has to be asking, and it has to carry no count.
 *
 * Returns the kitchen it is about, or null.
 */
export function kitchenAsked(
  said: string,
  kitchens: { id: string; name: string }[]
): { id: string; name: string } | null {
  if (kitchens.length === 0) return null;
  const flat = knit(flatten(said));
  if (flat === "") return null;

  // Asking rather than ordering.
  const asking =
    /\b(can|could|do|does|are|is|have|got|possible|able)\b/.test(flat) ||
    /\?/.test(said);
  if (!asking) return null;

  // A count turns it into an order, and an order already has somewhere
  // better to go.
  if (/\b\d+\b/.test(flat)) return null;
  if (/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/.test(flat)) {
    return null;
  }

  const found = namedIn(said, kitchens);
  // Exactly one. Two named kitchens is a comparison, which is a different
  // conversation and a worse thing to guess at.
  if (found.length !== 1) return null;

  return found[0];
}

/**
 * The place somebody named that we do not buy from.
 *
 * "Can I order from Pizza Hut?" is a reasonable question with a good
 * answer, and searching the whole sentence as though it were a dish is
 * not it: that ends in "I cannot find can i order from pizza hut anywhere
 * on the shop", which reads as a chat that was not listening.
 *
 * Asked only after the kitchens have been checked, so anything we do
 * carry has already been answered with a yes. What comes back is the name
 * they used, to say back to them and to put on the list of things people
 * ask for.
 *
 * Empty where there is no place in the sentence to name.
 */
export function placeAsked(said: string): string {
  const flat = knit(flatten(said));
  if (flat === "") return "";

  // It has to be asking to order, or this catches half the sentences
  // anybody types. "From" alone is in "is the chicken from today".
  if (!/\b(order|buy|get|deliver|delivery|have|carry|stock)\b/.test(flat)) {
    return "";
  }

  const at = flat.match(/\b(?:from|at)\b\s+(.+)$/);
  if (!at) return "";

  const name = at[1]
    .replace(/\b(please|pls|thanks|today|tomorrow|tonight|now)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Ourselves, and the words that are not a place at all.
  if (name === "" || /^(you|us|there|here|them|it|anywhere|somewhere)$/.test(name)) {
    return "";
  }
  // One word of two letters is not a restaurant, it is a typo.
  if (name.length < 3) return "";

  return name;
}

/**
 * What kind of place a name is, where the name says so.
 *
 * "Pizza Hut" is pizza, and so is Domino's: the word is in both names and
 * no table is needed. A handful of chains say nothing about themselves,
 * so those are listed, and the list is short on purpose because a wrong
 * guess here recommends somebody chicken when they wanted a doughnut.
 */
const KINDS = [
  "pizza",
  "chicken",
  "burger",
  "shawarma",
  "sushi",
  "grill",
  "doughnut",
  "donut",
  "coffee",
  "cake",
  "pasta",
  "noodle",
  "juice",
  "smoothie",
];

/** Chains whose name does not say what they sell. Deliberately few. */
const CHAINS: Record<string, string> = {
  kfc: "chicken",
  mcdonalds: "burger",
  mcdonald: "burger",
  subway: "sandwich",
  starbucks: "coffee",
  coldstone: "ice cream",
};

/*
 * Counters that are not a restaurant.
 *
 * The shop's own shelf and the market are real counters and real orders,
 * and they are the wrong answer to "can I order from Pizza Hut": nobody
 * asking for a pizza wants to be sent to a market stall.
 */
const NOT_A_KITCHEN = /\b(shop|market|store|supermarket|pharmacy|chemist|skincare)\b/i;

/** The food word a name carries, or empty. */
export function kindOf(name: string): string {
  const flat = flatten(name);
  for (const [chain, kind] of Object.entries(CHAINS)) {
    if (flat.replace(/\s+/g, "").includes(chain)) return kind;
  }
  for (const kind of KINDS) {
    if (new RegExp(`\\b${kind}s?\\b`).test(flat)) return kind;
  }
  return "";
}

/**
 * Who to suggest instead of a place we do not buy from.
 *
 * Somebody asking for Pizza Hut wants pizza, and sending them a list with
 * a doughnut shop at the top of it is the chat answering a different
 * question. Where the kind is clear, only the counters that sell that
 * kind are named. Where it is not, a few of the restaurants are, and
 * never the shop's own shelf or the market: nobody asking for a pizza
 * wants to be sent to a market stall.
 */
export function insteadOf(
  place: string,
  kitchens: { id: string; name: string }[],
  most = 4
): { id: string; name: string }[] {
  const real = kitchens.filter((one) => !NOT_A_KITCHEN.test(one.name));
  const kind = kindOf(place);

  if (kind !== "") {
    const same = real.filter((one) => kindOf(one.name) === kind);
    if (same.length > 0) return same.slice(0, most);
  }

  return real.slice(0, most);
}

export function intentOf(said: string): Intent {
  /* The apostrophes put back, so "I don't know" is the same sentence as
     "I dont know". Flattening alone leaves an orphaned t, and every
     pattern about not knowing something then has to carry it. */
  const flat = knit(flatten(said));
  if (flat === "") return "";

  /*
   * "Where is my order."
   *
   * Before the complaint case, because "my order has not arrived" carries
   * neither of those words but is plainly this, and before the fees case,
   * because "where is my delivery" carries the word delivery and is not a
   * question about the price of one.
   *
   * It has to be about theirs. "Where do you deliver" is a question about
   * the shop and already has a written answer; "my" or "I" is what makes
   * it about the person asking. An order number works instead, because
   * somebody who types one is holding a receipt.
   */
  if (
    /\b(my|mine|our|i)\b/.test(flat) || /#?\b\d{4}\b/.test(flat)
  ) {
    if (
      /\b(where|wheres|track|tracking|status|update|arrived|arriving|coming|come|delayed|late|eta|how far|still waiting|not here|hasnt arrived|has not arrived|didnt arrive|did not arrive)\b/.test(
        flat
      ) &&
      /\b(order|orders|food|delivery|deliveries|package|parcel|stuff|things|items)\b/.test(flat)
    ) {
      return "mine";
    }
  }

  if (
    /\b(enquiry|enquiries|enquire|inquiry|inquiries|inquire|complaint|complaints|complain|question|questions|refund|refunds|refunded|my money back)\b/.test(
      flat
    )
  ) {
    return "question";
  }

  /*
   * What delivery costs.
   *
   * Narrow on purpose: it has to carry the word delivery, or a fee, or
   * shipping. "How much is the pizza" is a question about a pizza and
   * belongs in the search, where the menu can answer it exactly.
   */
  if (
    /\b(delivery|deliveries|shipping)\b/.test(flat) ||
    /\b(fee|fees|charge|charges)\b/.test(flat)
  ) {
    if (!/\b(hostel|address|where|when|time|late|track|driver|rider)\b/.test(flat)) {
      return "fees";
    }
  }

  /*
   * A box, a hamper, a care package.
   *
   * Only where the sentence is about the box itself. "Box of chicken" and
   * "bucket" are food and belong in the menu search, so the word has to
   * be doing the work: a gift box, a care package, something curated or
   * put together.
   */
  if (
    /\b(gift box|giftbox|gift basket|hamper|care package|care pack|goodie bag|goody bag|curate|curated|custom box|build a box|make a box|put together a box|surprise box|treat box)\b/.test(
      flat
    ) ||
    (/\bbox\b/.test(flat) && /\b(gift|birthday|curate|make|build|create|custom|send)\b/.test(flat))
  ) {
    return "box";
  }

  /*
   * "I don't know."
   *
   * Checked before the vague-order case, because "anything" belongs here
   * rather than there: somebody who says anything is not asking to be
   * asked again, they are asking to be helped.
   */
  if (
    /\b(dont know|do not know|dunno|no idea|not sure|unsure|cant decide|cannot decide|you choose|you pick|you decide|up to you|your choice|something nice|im not sure|pick for me|choose for me|decide for me|pick something|choose something|pick one|choose one|what do you recommend|you know best)\b/.test(
      flat
    )
  ) {
    return "unsure";
  }

  /*
   * "Pick." "Surprise me." "Anything."
   *
   * A whole sentence made of nothing but asking-to-be-helped. Done this
   * way round rather than as bare words in the pattern above, because the
   * shop really sells a Choose Your Own Shake and a Surprise Serum, and a
   * rule that caught "surprise" anywhere would stop anybody buying the
   * serum. Every word has to be one of these: "surprise serum" keeps a
   * word that is not, so it goes to the menu where it belongs.
   */
  const left = flat
    .split(" ")
    .filter((word) => word !== "" && !FILLER.has(word) && !NOISE.has(word));
  if (left.length > 0 && left.every((word) => UNSURE.has(word))) return "unsure";

  /*
   * What there is, as against which one of it.
   *
   * Including the counters themselves. "What restaurants do you deliver
   * from" went to the shop's written answers, which had nothing about
   * restaurants in them, and came back offering "Where do you deliver?" --
   * a different question, about PAU, which the chat then answered. The
   * person had asked which kitchens we buy from and been told where we
   * drive to.
   *
   * The counters are the one answer the chat already holds and that can
   * never go stale, because it is read off what is open tonight. A general
   * word only: "order from Dominos" names one and belongs in the search,
   * and nothing on any shelf is called a restaurant.
   */
  if (
    /\b(menu|menus|catalogue|available|availability|what do you (?:have|sell|offer))\b/.test(flat) ||
    /\b(restaurants?|kitchens?|counters?|vendors?|outlets?|eateries|eatery)\b/.test(flat)
  ) {
    return "menu";
  }

  /*
   * Help, which is two jobs until you ask which.
   *
   * Half the people who type it want a hand ordering, which is the one
   * thing the chat is for. The other half want something only a person can
   * do. Guessing either way is wrong half the time, so it asks.
   */
  if (/\b(help|support|assist|assistance|stuck|issue|problem)\b/.test(flat)) {
    return "help";
  }

  const mine = words(said).filter((word) => !FILLER.has(word));
  if (mine.length > 0 && mine.every((word) => VAGUE.has(word))) return "vague-order";
  // "I want to order" is every word filtered as noise but the one, so the
  // whole flattened sentence is checked as well.
  if (
    flat
      .split(" ")
      .every((word) => VAGUE.has(word) || NOISE.has(word) || FILLER.has(word))
  ) {
    return flat.split(" ").some((word) => VAGUE.has(word)) ? "vague-order" : "";
  }
  return "";
}

/** A line of an order, and how many of it they now want. */
export type Amount = {
  /** Which line, in their words. Empty where they said "make it two" and
   *  the chat has to know which one is being talked about. */
  which: string;
  qty: number;
};

/** Numbers as people write them when they are not using digits. */
const COUNTS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const countOf = (word: string): number => {
  const digits = Number(word);
  if (Number.isFinite(digits) && digits > 0) return Math.round(digits);
  return COUNTS[word] ?? 0;
};

const NUMBER = "\\d+|one|two|three|four|five|six|seven|eight|nine|ten";

/**
 * Changing how many of something, rather than what it is.
 *
 * "Make the BBQ chicken one" is the commonest edit anybody makes to an
 * order and the swap matcher could not see it at all. Worse, "change the
 * BBQ chicken to 1" looked exactly like a swap: it read "1" as the thing
 * they wanted instead, so it would have taken the pizza off and gone
 * looking through the menu for a dish called one.
 *
 * A number on its own is never a dish. That is the whole rule here: where
 * the thing being asked for is only a figure, the figure is a count of
 * what is already there.
 *
 * Checked before the swap matcher, and only ever against an order that
 * already has something in it, so "2 medium pizza" typed at the ordering
 * question is still two pizzas.
 */
export function asksForQty(said: string): Amount | null {
  const flat = knit(flatten(said));
  if (flat === "") return null;

  const tidy = (part: string): string =>
    half(part).replace(/^(?:just|only|about)\s+/, "").trim();

  // "Make the BBQ chicken one", "set the pizza to 2", "change it to 3".
  const made = flat.match(
    new RegExp(`\\b(?:make|set|change)\\s+(.*?)\\s+(?:to\\s+)?(?:just\\s+|only\\s+)?(${NUMBER})\\b`)
  );
  if (made) {
    const qty = countOf(made[2]);
    if (qty > 0) return { which: tidy(made[1]), qty };
  }

  // "I only want one BBQ chicken", "just 2 of the pizza".
  const only = flat.match(
    new RegExp(`\\b(?:just|only)\\s+(?:want\\s+|need\\s+|have\\s+)?(${NUMBER})\\s+(?:of\\s+)?(.+)$`)
  );
  if (only) {
    const qty = countOf(only[1]);
    if (qty > 0) return { which: tidy(only[2]), qty };
  }

  // "1 BBQ chicken instead of 2", where the second figure is the old one.
  const swapped = flat.match(
    new RegExp(`\\b(${NUMBER})\\s+(.+?)\\s+instead of\\s+(?:${NUMBER})\\b`)
  );
  if (swapped) {
    const qty = countOf(swapped[1]);
    if (qty > 0) return { which: tidy(swapped[2]), qty };
  }

  return null;
}
