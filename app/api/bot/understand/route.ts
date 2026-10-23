import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";

import {
  NOTHING_READ,
  READING_SCHEMA,
  botModel,
  readIntent,
  shopBrief,
  type ShopNow,
} from "@/lib/bot-brain";

export const dynamic = "force-dynamic";

/**
 * Reading one message, so the bot has to ask fewer questions.
 *
 * Everything about this is built to be optional. There is no key on most
 * days of its life, the key runs out of credit on exactly the evening
 * somebody is hungriest, and the API has a bad minute now and then. In
 * every one of those cases this answers "I read nothing" and the bot falls
 * back to the rules it has always used, which still work and always did.
 *
 * So it never throws, never retries, and never waits long. A reading that
 * arrives after the student has given up is worth less than no reading at
 * all, because the rules would have answered in the meantime.
 *
 * It is also the only place the key exists. The browser never sees it, the
 * same way the browser never sees the database.
 */

/** Longer than this and the rules would have been quicker anyway. */
const WAIT_MS = 6000;

export async function POST(request: Request): Promise<NextResponse> {
  const key = String(process.env.ANTHROPIC_API_KEY ?? "").trim();
  // No key is the ordinary case, not a fault. Said plainly so the bot
  // stops asking on this page load rather than once per sentence.
  if (key === "") {
    return NextResponse.json({ ok: false, off: true, reading: NOTHING_READ });
  }

  try {
    const body = (await request.json()) as { said?: unknown; shop?: unknown };
    const said = String(body.said ?? "").trim().slice(0, 1000);
    if (said === "") {
      return NextResponse.json({ ok: false, reading: NOTHING_READ });
    }

    const given = (body.shop ?? {}) as Record<string, unknown>;
    const list = (value: unknown, most: number) =>
      Array.isArray(value)
        ? value.map((one) => String(one ?? "").trim()).filter(Boolean).slice(0, most)
        : [];

    const shop: ShopNow = {
      shopName: String(given.shopName ?? "Sudu").slice(0, 40),
      counters: list(given.counters, 30),
      hostels: list(given.hostels, 40),
      nextRun: String(given.nextRun ?? "").slice(0, 120),
      cutOff: String(given.cutOff ?? "").slice(0, 60),
      open: given.open === true,
    };

    const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: WAIT_MS });

    const response = await client.messages.create({
      model: botModel(process.env.BOT_MODEL),
      max_tokens: 2000,
      // Low effort on purpose. This is one short sentence being read by
      // somebody standing in a corridor deciding what to have for dinner,
      // and a slower better answer is a worse answer.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: READING_SCHEMA },
      },
      system: [
        {
          type: "text",
          // The brief is the same for every message of an evening, so it
          // sits first and is cached: the part that changes is the
          // sentence, and the sentence goes last.
          text: shopBrief(shop),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: said }],
    });

    /*
     * A refusal is not an error and not a reading.
     *
     * Safety classifiers can decline, and a declined message is one the
     * rules should handle rather than one the student should be told off
     * about. Checked before the content is read, because on a refusal
     * there is nothing in it.
     */
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ ok: false, reading: NOTHING_READ });
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Structured outputs make this unlikely and not impossible. Unread
      // is a fine answer; a half-parsed order is not.
      return NextResponse.json({ ok: false, reading: NOTHING_READ });
    }

    return NextResponse.json({ ok: true, reading: readIntent(parsed) });
  } catch (wrong) {
    /*
     * Out of credit, rate limited, timed out, offline, or a bad minute at
     * the other end. All one answer to the chat: the bot never heard of
     * this, carry on with the rules.
     *
     * Said out loud in the log, though, because the whole point of
     * failing quietly is that nobody notices, and a reading layer that
     * has been broken since the day it shipped would look exactly like
     * one that is working and simply never needed. The browser still
     * learns nothing: a public order box is no place for the shop's
     * error messages.
     */
    console.error("[bot/understand]", wrong);
    return NextResponse.json({ ok: false, reading: NOTHING_READ });
  }
}

/**
 * Is it actually working?
 *
 * The chat cannot tell you. It is built to carry on without the reading
 * layer, and it does that whether the layer is missing, out of credit, or
 * broken in a way nobody has noticed since the day it shipped. Those look
 * identical from the outside, which is exactly the problem with anything
 * that fails politely.
 *
 * So this runs the layer against a handful of sentences the shop actually
 * gets and shows what came back: the model, how long it took, what it
 * read, and the error in full where there was one. Open it while signed
 * into admin and the answer is on the screen rather than in an argument.
 */
const TRY_THESE = [
  "naza, queen",
  "sorry, naza, trezadel",
  "2 chicken pie and a shawarma for John Doe, 0800 000 0000, Trezadel",
  "what time is the run tonight",
  "it is my friend's birthday, send it to Emerald",
];

export async function GET(): Promise<NextResponse> {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Admin only." }, { status: 404 });
  }

  const key = String(process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (key === "") {
    return NextResponse.json({
      working: false,
      why: "ANTHROPIC_API_KEY is not set, so the chat is running on its rules alone.",
      model: botModel(process.env.BOT_MODEL),
    });
  }

  const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: WAIT_MS });
  const model = botModel(process.env.BOT_MODEL);
  const shop: ShopNow = {
    shopName: "Sudu",
    counters: ["Chicken Republic", "KFC"],
    hostels: ["Trezadel", "Queen Mary", "Cooperative Queens", "Emerald"],
    nextRun: "tonight between 6pm and 7.30pm",
    cutOff: "4.30 pm",
    open: true,
  };

  const went: unknown[] = [];
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
        system: [{ type: "text", text: shopBrief(shop) }],
        messages: [{ role: "user", content: said }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      went.push({
        said,
        ms: Date.now() - began,
        stop: response.stop_reason,
        read: readIntent(JSON.parse(text)),
        tokens: response.usage.input_tokens + response.usage.output_tokens,
      });
    } catch (wrong) {
      went.push({
        said,
        ms: Date.now() - began,
        failed: wrong instanceof Error ? `${wrong.name}: ${wrong.message}` : String(wrong),
      });
    }
  }

  const ok = went.filter((one) => (one as { read?: unknown }).read !== undefined).length;
  return NextResponse.json(
    {
      working: ok > 0,
      model,
      read: `${ok} of ${TRY_THESE.length}`,
      went,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
