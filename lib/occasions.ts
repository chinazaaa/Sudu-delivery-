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
    greet: "Lovely. Let me take the basics first — what should I call you?",
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
