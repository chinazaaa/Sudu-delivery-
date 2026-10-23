/**
 * What an order is for.
 *
 * One tap at the top of the chat that changes everything after it, and the
 * single most useful question the bot can ask. Until now it had no way to
 * hear "this is not for me", so it asked a gift-buyer which block *they*
 * were in and then sent a rider to ring the person being surprised.
 *
 * Deliberately four, and deliberately coarse. The point is not to file the
 * order correctly, it is to know whether there is a second person in it:
 * everything the chat does differently afterwards follows from that. More
 * chips would be more taps for the same two answers.
 */
export type OccasionKey = "me" | "birthday" | "gift" | "parent";

export type Occasion = {
  key: OccasionKey;
  /** What the chip says. */
  said: string;
  /** Whether the food is going to somebody other than the person ordering. */
  gift: boolean;
  /** How the chat opens once it knows, so the next question is not the
   *  same flat sentence four times. */
  greet: string;
  /** What to call the person it is going to, when asking who they are. */
  asks: string;
};

export const OCCASIONS: Occasion[] = [
  {
    key: "me",
    said: "Just for me",
    gift: false,
    greet: "What should I call you?",
    asks: "",
  },
  {
    key: "birthday",
    said: "It's someone's birthday",
    gift: true,
    greet: "Lovely. Let me take the basics first. What should I call you?",
    asks: "Whose birthday is it?",
  },
  {
    key: "gift",
    said: "A gift or a thank you",
    gift: true,
    greet: "Nice of you. What should I call you?",
    asks: "Who is it going to?",
  },
  {
    key: "parent",
    said: "For my child at PAU",
    gift: true,
    greet: "We do a lot of these. What should I call you?",
    asks: "What is your child's first name?",
  },
];

export function occasionBy(key: string): Occasion {
  return OCCASIONS.find((one) => one.key === key) ?? OCCASIONS[0];
}

export const isGift = (key: string): boolean => occasionBy(key).gift;

/**
 * What to call the card, given what the order is for.
 *
 * One product in the shop, called whatever the occasion makes it. A
 * birthday card and a thank you card are the same piece of paper with
 * different words on it, and the words are the thing the person writing
 * them chooses.
 */
export function cardCalled(key: string): string {
  if (key === "birthday") return "birthday card";
  if (key === "parent") return "card";
  if (key === "gift") return "card";
  return "card";
}

/**
 * The person the food is for, in a sentence.
 *
 * "Which block is Ada in?" and "where am I bringing it?" are the same
 * question asked of two different people, and getting it wrong is the whole
 * reason this exists.
 */
export function them(key: string, forName: string): string {
  if (!isGift(key)) return "you";
  return forName.trim() === "" ? "them" : forName.trim();
}

export function theirs(key: string, forName: string): string {
  if (!isGift(key)) return "your";
  const who = forName.trim();
  return who === "" ? "their" : `${who}'s`;
}

/**
 * Whether a sentence sounds like it is for somebody else.
 *
 * The chat used to open by asking. One tap, four chips, and it bought the
 * one fact everything afterwards depends on: whether there is a second
 * person in the order, because a gift goes to the block where the person
 * receiving it sleeps and the buyer has no reason to be there at all.
 *
 * It also cost a message at the top of every conversation, including the
 * nine in ten that are somebody buying their own dinner. So it is not
 * asked any more. It is noticed, and only the orders that look like gifts
 * are asked about.
 *
 * Kept as a plain rule rather than left to the reading layer, because the
 * reading layer is allowed to be absent and this is not: sending a
 * birthday surprise to the wrong block is not a thing to get wrong on the
 * evening somebody forgot to top up an API key.
 */
const GIFTY = [
  /\bgift\b/i,
  /\bbirthday\b/i,
  /\bsurprise\b/i,
  /\banniversary\b/i,
  /\bcongratulat/i,
  /\bfor (my|his|her|their) (friend|girlfriend|boyfriend|sister|brother|daughter|son|child|mum|mom|dad|roommate|room mate|course mate|coursemate)\b/i,
  /\bfor someone\b/i,
  /\bsend (it|this|them|her|him) to\b/i,
  /\bit is for\b/i,
  /\bits for\b/i,
  /\bit's for\b/i,
];

/**
 * A gifty word that is really part of something we sell.
 *
 * "Birthday Cake Remix" is a tub of ice cream at Cold Stone, and somebody
 * pasting a basket with one in it was asked whose birthday it was and then
 * handed a box for the recipient's first name. The order was for them.
 *
 * So the dishes come out of the sentence before the rule reads it. Only
 * the ones that carry a gifty word are worth taking out, which on this
 * shop is a handful, and the rule underneath is unchanged: a plain regex
 * that works whether or not anything else does.
 */
function withoutDishes(said: string, dishes: string[]): string {
  let text = said;
  for (const dish of dishes) {
    const name = dish.trim();
    // Short names are not worth it and are the ones most likely to eat a
    // real word: a counter called "Gift" must not swallow "gift" itself.
    if (name.length < 8) continue;
    if (!GIFTY.some((one) => one.test(name))) continue;
    text = text.split(name).join(" ");
    // And again without case, which is how a pasted basket usually differs.
    const lower = text.toLowerCase();
    let at = lower.indexOf(name.toLowerCase());
    while (at !== -1) {
      text = `${text.slice(0, at)} ${text.slice(at + name.length)}`;
      at = text.toLowerCase().indexOf(name.toLowerCase());
    }
  }
  return text;
}

/**
 * Whether this sentence is about somebody else.
 *
 * `dishes` is what the shop sells, so a dish with a gifty word in its name
 * is read as the dish it is rather than as an occasion. Left out, the rule
 * behaves exactly as it always has.
 */
export function looksLikeAGift(said: string, dishes: string[] = []): boolean {
  const whole = String(said ?? "");
  if (whole.trim() === "") return false;
  // "for me" said plainly outranks everything: somebody heading this off
  // means it, and a false gift costs two questions nobody wanted.
  if (/\bfor (me|myself)\b/i.test(whole)) return false;

  const text = dishes.length > 0 ? withoutDishes(whole, dishes) : whole;
  if (text.trim() === "") return false;
  return GIFTY.some((one) => one.test(text));
}

/*
 * The part of a sentence that is actually an order.
 *
 * "Need to order for my son" is a whole sentence with no food in it. Taken
 * to the menu as written it matched Sonia tinned tomatoes, because "son"
 * sits inside "Sonia", and somebody who had just told us who the food was
 * going to was handed three jars of tomato purée and asked which one they
 * meant.
 *
 * So the gift phrasing and the polite run-up come off before anything is
 * searched. What is left is either the food or nothing, and nothing is a
 * question worth asking rather than a search worth running.
 */
const GIFT_PHRASES = [
  /\bfor (?:my|his|her|their) (?:friend|girlfriend|boyfriend|sister|brother|daughter|son|child|mum|mom|dad|roommate|room mate|course mate|coursemate)\b/gi,
  /\bfor (?:someone|somebody|him|her|them|my friend)\b/gi,
  /\bas a (?:gift|surprise|present)\b/gi,
  /\bit(?:'s| is)? for\b.*$/gi,
  /\bits for\b.*$/gi,
  /\bsend (?:it|this|them|her|him) to\b.*$/gi,
  /\bfor (?:his|her|their|my) (?:birthday|anniversary)\b/gi,
  /\b(?:birthday|anniversary) (?:gift|surprise|present)\b/gi,
  /\bcongratulations?\b/gi,
];

/** The run-up to an order, which is manners rather than food. */
const OPENER =
  /^[\s,.!-]*(?:hi|hey|hello|good (?:morning|afternoon|evening)|please|pls|abeg)?[\s,.!-]*(?:can|could|may|would|will)?\s*(?:i(?:'| a)?m |i |you )?(?:just )?(?:would like|want|wanna|need|like|have|wish|get|send)?\s*(?:to )?(?:place |make )?(?:an? )?(?:order|get|buy|have|take)?\s*(?:for|some|me)?[\s,.:;-]*/i;

/** Words that are never the name of anything on a shelf. */
const EMPTY_WORDS = new Set([
  "a", "an", "the", "it", "this", "that", "some", "any", "thing", "things",
  "something", "anything", "food", "order", "please", "pls", "now", "today",
  "tonight", "tomorrow", "and", "or", "for", "to", "my", "his", "her",
  "their", "me", "you", "us", "them", "we", "i",
  // A gift is an occasion, not a thing on a shelf. Left in, "a gift for
  // someone" went to the menu as the word "gift".
  "gift", "present", "surprise", "treat",
]);

/**
 * What is left of a sentence once the manners and the gift phrasing are off.
 *
 * Empty means there was never anything to search for, which is the honest
 * answer for "need to order for my son" and the one that stops the menu
 * being asked about somebody's child.
 */
export function orderPart(said: string): string {
  let text = String(said ?? "");
  for (const phrase of GIFT_PHRASES) text = text.replace(phrase, " ");
  text = text.replace(OPENER, " ");
  text = text.replace(/\s+/g, " ").trim();

  // Nothing but filler is nothing. A single letter is not a dish either,
  // and the search is happy to find something for it, which is the whole
  // problem.
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9']+/i)
    .filter((one) => one !== "" && !EMPTY_WORDS.has(one));
  if (words.length === 0) return "";
  if (words.every((one) => one.length < 3) && !/\d/.test(text)) return "";

  return text;
}

/**
 * A basket somebody has pasted, rather than a sentence they have written.
 *
 * Two or more quantities in one message is a cart: "1 × Pepperoni Original
 * × Dodo Pizza Medium × 1 × Assorted doughnuts". Whatever words are in the
 * dish names, that is an order being placed, and the questions a sentence
 * deserves are the wrong ones to ask of it.
 *
 * Two rather than one, because "2 chicken pie for my sister" is one
 * quantity and a real gift, and the question belongs there.
 */
export function looksLikeABasket(said: string): boolean {
  const text = String(said ?? "");
  // "1 x", "2 ×", "3 X" — a number and a times sign, which is how every
  // cart on every site writes a line.
  const timesed = text.match(/\b\d+\s*[x×]\s*\S/gi) ?? [];
  if (timesed.length >= 2) return true;

  // Or several lines each opening with a count, which is the other shape a
  // pasted order comes in.
  const counted = text
    .split("\n")
    .filter((line) => /^\s*\d+\s*[x×.)\-]?\s*\S/i.test(line));
  return counted.length >= 2;
}
