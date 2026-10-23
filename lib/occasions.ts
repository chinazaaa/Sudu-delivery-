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

export function looksLikeAGift(said: string): boolean {
  const text = String(said ?? "");
  if (text.trim() === "") return false;
  // "for me" said plainly outranks everything: somebody heading this off
  // means it, and a false gift costs two questions nobody wanted.
  if (/\bfor (me|myself)\b/i.test(text)) return false;
  return GIFTY.some((one) => one.test(text));
}
