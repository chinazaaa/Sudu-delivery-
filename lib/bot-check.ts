import Anthropic from "@anthropic-ai/sdk";

import {
  READING_SCHEMA,
  botModel,
  readIntent,
  shopBrief,
  type Reading,
  type ShopNow,
} from "./bot-brain";

/**
 * Whether the chat's reading layer is actually working.
 *
 * The chat itself cannot tell you. It is built to carry on without the
 * layer, and it does that whether the layer is absent, out of credit, or
 * broken in a way nobody has noticed since the day it shipped. All three
 * look identical from outside, which is the standing cost of anything
 * that fails politely, and it is paid by whoever is trying to work out
 * why the bot seems no cleverer than it was.
 *
 * So this runs it against sentences the shop really gets and reports what
 * came back, errors in full. Nothing here is clever: the point is that it
 * is the one thing in the system that is allowed to say no.
 */

/** The sentences, which are the ones that have actually gone wrong. */
export const TRY_THESE = [
  "naza, queen",
  "sorry, naza, trezadel",
  "2 chicken pie and a shawarma for John Doe, 0800 000 0000, Trezadel",
  "what time is the run tonight",
  "it is my friend's birthday, send it to Emerald",
];

export type Went = {
  said: string;
  ms: number;
  read?: Reading;
  failed?: string;
  tokens?: number;
};

export type Checked = {
  working: boolean;
  model: string;
  why: string;
  went: Went[];
};

export async function checkReading(shop: ShopNow): Promise<Checked> {
  const model = botModel(process.env.BOT_MODEL);
  const key = String(process.env.ANTHROPIC_API_KEY ?? "").trim();

  if (key === "") {
    return {
      working: false,
      model,
      why: "ANTHROPIC_API_KEY is not set, so the chat is running on its own rules alone. That is a working shop, not a broken one, but nothing here is being read.",
      went: [],
    };
  }

  const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: 20000 });
  const brief = shopBrief(shop);
  const went: Went[] = [];

  for (const said of TRY_THESE) {
    const began = Date.now();
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 2000,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: READING_SCHEMA },
        },
        system: [{ type: "text", text: brief }],
        messages: [{ role: "user", content: said }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      went.push({
        said,
        ms: Date.now() - began,
        read: readIntent(JSON.parse(text)),
        tokens: response.usage.input_tokens + response.usage.output_tokens,
      });
    } catch (wrong) {
      went.push({
        said,
        ms: Date.now() - began,
        failed:
          wrong instanceof Error ? `${wrong.name}: ${wrong.message}` : String(wrong),
      });
    }
  }

  const read = went.filter((one) => one.read !== undefined).length;
  return {
    working: read > 0,
    model,
    why:
      read === went.length
        ? "Every sentence was read. Anything the bot still gets wrong is in how the shop's own rules act on the reading, not in the reading."
        : read === 0
          ? "Nothing was read. The error beside each line says why, and until it is fixed the chat is running on its rules alone."
          : "Some were read and some were not, which usually means a rate limit or a timeout rather than anything wrong with the request.",
    went,
  };
}
