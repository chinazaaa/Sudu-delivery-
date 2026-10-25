/**
 * Reading what somebody actually said.
 *
 * SuduBot understands a sentence by rule: a list of patterns, a fuzzy
 * search over the menu, and a cascade of guesses about what a line of text
 * was for. It works, and the cost of it working is the number of questions
 * it has to ask. Every ambiguity it cannot resolve becomes another turn,
 * and ordering dinner takes eight messages when it should take three.
 *
 * So this is a layer over the top and nothing more. It reads one sentence
 * and says what was in it: what somebody wants, how many, their name, their
 * number, their block. It does not price anything, it does not decide what
 * is in stock, and it never places an order. Those stay where they are,
 * in code that cannot be talked into a different answer, because a till
 * that can be argued with is not a till.
 *
 * What it buys is turns. "2 chicken pie and a shawarma for Naza, 0704 268
 * 5535, Trezadel" is one message that the rules would have spent five
 * questions on.
 */

/** The most of anything one line may ask for. */
export const MOST = 20;

export type Wanted = {
  /** What they called it, in their words. Searched against the menu by the
   *  code that already knows how to search the menu. */
  what: string;
  qty: number;
};

export type Reading = {
  /** What the sentence was for. */
  kind: "order" | "question" | "greeting" | "other";
  wanted: Wanted[];
  /** Said only where they actually said it. Never invented. */
  name: string;
  phone: string;
  hostel: string;
  /** One sentence back, in the shop's voice. Empty where the rules below
   *  should do the talking instead. */
  say: string;
};

export const NOTHING_READ: Reading = {
  kind: "other",
  wanted: [],
  name: "",
  phone: "",
  hostel: "",
  say: "",
};

/** The shape the model must answer in. Nothing optional: a model that may
 *  leave a field out is a model whose output needs a second guess. */
export const READING_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["kind", "wanted", "name", "phone", "hostel", "say"],
  properties: {
    kind: {
      type: "string" as const,
      enum: ["order", "question", "greeting", "other"],
      description:
        "order when they are naming food or drink they want. question when they are asking something. greeting for hello and small talk. other for anything else.",
    },
    wanted: {
      type: "array" as const,
      description:
        "Each separate thing they asked for, in their own words. Empty unless kind is order.",
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: ["what", "qty"],
        properties: {
          what: {
            type: "string" as const,
            description:
              "The dish as they said it, without the number. Keep their wording: the menu search is good at near misses.",
          },
          qty: { type: "integer" as const, description: "How many. 1 when unsaid." },
        },
      },
    },
    name: {
      type: "string" as const,
      description: "What to call them, only if they said it. Empty otherwise.",
    },
    phone: {
      type: "string" as const,
      description: "Their phone number exactly as typed, only if present. Empty otherwise.",
    },
    hostel: {
      type: "string" as const,
      description: "Their block or hostel, only if they said it. Empty otherwise.",
    },
    say: {
      type: "string" as const,
      description:
        "At most one short sentence to send back. Empty when the shop's own code should answer instead, which is whenever the answer involves a price, what is in stock, or an order being placed.",
    },
  },
};

export type ShopNow = {
  shopName: string;
  /** Counters going out on the next run, so the model knows what exists. */
  counters: string[];
  /** The blocks it may recognise. */
  hostels: string[];
  /** When the next run is, said the way the shop says it. */
  nextRun: string;
  /** When ordering shuts for it. */
  cutOff: string;
  /** False when nothing is open, so it stops talking as though it were.
   *  A car of its own counts: a day with no run is still a day somebody
   *  can order for. */
  open: boolean;
};

/**
 * What the model is told about the shop before it reads anything.
 *
 * Built fresh each time from what is actually open tonight, because a model
 * confidently describing last Tuesday's run is worse than one that says it
 * does not know. The counters are listed so a near miss has something to be
 * near; the blocks so "trezadel" is recognised as a place and not a dish.
 */
export function shopBrief(shop: ShopNow): string {
  const lines = [
    `You read messages for ${shop.shopName}, which delivers food to students at Pan-Atlantic University, Lagos.`,
    "",
    "Your only job is to say what a message contained. You never price anything, never say whether something is in stock, and never confirm an order. The shop's own code does all of that straight afterwards, and it is always right where you disagree.",
    "",
    shop.open
      ? `The next run is ${shop.nextRun}. Ordering for it shuts at ${shop.cutOff}.`
      : "Nothing is open for ordering right now.",
    "",
    /*
     * The day is a choice now, and the model kept answering as though the
     * next run were the only one on offer.
     *
     * It is told the shape rather than the prices, because prices are the
     * one thing it must never say: somebody asking for Monday on a week
     * with no Monday run is asking a question with an answer, and "the
     * next run is Wednesday" is not it.
     */
    "People pick the day they want their food, not a run. Any day can be had: where a run is going that day it travels on the run, and where none is it goes on a car of its own, which costs more. Never say which, and never say what either costs. If somebody asks about a day, say the checkout will show them that day and leave the figures to the shop.",
  ];

  if (shop.counters.length > 0) {
    lines.push("", `Counters on this run: ${shop.counters.join(", ")}.`);
  }
  if (shop.hostels.length > 0) {
    lines.push(`Blocks: ${shop.hostels.join(", ")}.`);
  }

  lines.push(
    "",
    "Rules:",
    "- Put every separate thing they asked for in `wanted`, with the words they used. Do not correct spelling and do not swap in a menu name: the shop's search handles near misses and is better at it than you.",
    /*
     * A cart somebody has pasted.
     *
     * Plenty of people arrive with the order already on screen, and
     * somebody ordering for a birthday almost always does: it was agreed
     * in a group chat, or it is sitting in a basket on another tab. That
     * is the most complete thing anybody ever types here and it was the
     * one the chat handled worst, because a cart copied off a page runs
     * together into one line with no commas in it at all.
     *
     * The shape is always the same: a count, the dish, its choices, the
     * counter, and the price the page printed. Only the first two are
     * wanted; the counter is a shop, not a dish, and the price is a
     * number this shop works out itself.
     */
    "- A pasted cart runs together into one line, like \"1 x Pepperoni Original x Dodo Pizza 2 x Hamburger Meal Fries x Regular x Burger King\". Each count starts a new thing. Put the dish in `what` and the count in `qty`.",
    "- On a line like that, leave out the counter's name and the printed price. Counters are the names listed above; a price is a figure with a naira sign or a plus in front of it. Keep the choices with the dish when they are part of what it is, such as a size or a flavour.",
    "- Only fill name, phone or hostel when they actually said one. An invented phone number sends somebody else's dinner to the wrong block.",
    "- Keep `say` to one short sentence, or empty. Leave it empty whenever the reply needs a price, a stock answer, or a confirmation, because the shop says those itself and two voices saying different numbers is worse than one voice saying none.",
    "- No em-dashes.",
  );

  return lines.join("\n");
}

/** A whole number of something, inside what one order may sensibly ask for. */
export function howMany(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MOST, n);
}

/**
 * The model's answer, made safe to act on.
 *
 * Everything is re-checked here rather than trusted, because this is the
 * seam where something outside the shop's own code starts influencing it.
 * A field of the wrong type, a quantity of nine thousand, a name that is
 * actually a paragraph: none of those should reach the rest of the bot, and
 * none of them are worth an error either. They are simply dropped.
 */
export function readIntent(raw: unknown): Reading {
  if (typeof raw !== "object" || raw === null) return NOTHING_READ;
  const got = raw as Record<string, unknown>;

  const kind = ["order", "question", "greeting", "other"].includes(String(got.kind))
    ? (String(got.kind) as Reading["kind"])
    : "other";

  const wanted = Array.isArray(got.wanted)
    ? got.wanted
        .map((one) => {
          const row = (one ?? {}) as Record<string, unknown>;
          return { what: String(row.what ?? "").trim().slice(0, 120), qty: howMany(row.qty) };
        })
        .filter((one) => one.what !== "")
        .slice(0, 20)
    : [];

  const said = (value: unknown, most: number) =>
    String(value ?? "").trim().slice(0, most);

  return {
    kind,
    // Nothing wanted is not an order, whatever it called itself.
    ...(kind === "order" && wanted.length === 0 ? { kind: "other" as const } : {}),
    wanted,
    name: said(got.name, 60),
    phone: said(got.phone, 24),
    hostel: said(got.hostel, 60),
    say: said(got.say, 300),
  };
}

/**
 * Whether a reading is worth acting on at all.
 *
 * A greeting with nothing in it is the model agreeing there was nothing to
 * read, and the rules below handle those better than a sentence of small
 * talk would.
 */
export function worthActingOn(reading: Reading): boolean {
  return (
    reading.wanted.length > 0 ||
    reading.name !== "" ||
    reading.phone !== "" ||
    reading.hostel !== ""
  );
}

/**
 * Which model reads the sentences.
 *
 * Haiku by default, because the job is small and sharply bounded: one
 * short message, a fixed set of fields, and a schema the API enforces on
 * the way out. That is the shape of task the smallest model is for, and it
 * is roughly forty times cheaper than the largest, which on a shop doing a
 * few runs a week is the difference between pennies a year and pennies a
 * month.
 *
 * Switchable from the environment rather than from the code, because the
 * honest position is that nobody has watched it read a hundred real
 * messages yet. If it turns out to fumble Nigerian phrasing, or to miss
 * that "can I change my order" is a question rather than a dish, moving up
 * is a setting rather than a deploy.
 */
export const BOT_MODELS = {
  haiku: "claude-haiku-5-5",
  sonnet: "claude-sonnet-5-5",
  opus: "claude-opus-5-5",
} as const;

export function botModel(asked: string | undefined | null): string {
  const said = String(asked ?? "").trim().toLowerCase();
  if (said === "") return BOT_MODELS.haiku;
  // A full model id passes through, so a model released after this was
  // written can be used without changing it.
  if (said.startsWith("claude-")) return said;
  return (BOT_MODELS as Record<string, string>)[said] ?? BOT_MODELS.haiku;
}

/**
 * Whether somebody is correcting what they just said.
 *
 * "sorry, naza, trezadel" is not an order for three things. It is the
 * same two details again with the block changed, and the word at the
 * front is the whole signal: nobody says sorry to a menu.
 *
 * It matters because details are otherwise only ever allowed to fill a
 * blank. That is the right rule for a stray sentence halfway down an
 * order, and exactly the wrong one here, where the person is trying to
 * tell the shop it has the wrong block. Blanks get filled; corrections
 * get to overwrite.
 */
/* The word boundary applies only to the word alternatives: "no," ends in
   a comma, and a boundary after a comma followed by a space never matches,
   so a trailing \b silently turned off half this rule. */
const SORRY = /^\s*(?:(?:sorry|oops|actually|i meant|i mean|my bad|correction|wait)\b|no[,!.\s])/i;

export function isCorrection(said: string): boolean {
  return SORRY.test(String(said ?? ""));
}
