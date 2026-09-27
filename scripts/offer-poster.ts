/**
 * This week's poster: one counter, what is on, and the car it goes on.
 *
 * The nine Instagram posters say what the shop is, and they do not change.
 * This one is the opposite: it is out of date by Sunday, because the whole
 * point of it is the offer that is on right now and the run it rides. That
 * makes it the post worth making every week, and the one nobody can write
 * by hand without eventually quoting a price the shop is not charging.
 *
 * So every word of it is read out of the database: the offer from the
 * coupon that is live, the counters from what that coupon is attached to,
 * the run from what is open, and the picture from the menu itself.
 *
 *   npx tsx scripts/offer-poster.ts                 # what it would make
 *   npx tsx scripts/offer-poster.ts --go            # make it
 *   npx tsx scripts/offer-poster.ts --go --code DOM2K
 *   npx tsx scripts/offer-poster.ts --go --dish "Pepperoni"
 *
 * The picture comes out of your own storage, which is why this runs from a
 * laptop rather than from here: the shop's images are not reachable from a
 * sandbox. Falls back to a plain poster if the photograph cannot be had.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const W = 1080;
const H = 1350;
const PAD = 88;
const ORANGE = "#ff5a1f";
const INK = "#14110f";
const PAPER = "#ffffff";
const CREAM = "#ffe6da";

/** Where the picture sits: most of the poster, with the words under it.
 *  The food is the reason anybody stops scrolling, so it gets the room. */
const PHOTO_H = 780;

const OUT = "marketing/instagram";

function env(): { url: string; key: string } {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const found = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (found && !process.env[found[1]]) {
          process.env[found[1]] = found[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* Fine if the variables are already in the shell. */
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or run this\n" +
        "from the project root where .env.local has them."
    );
    process.exit(1);
  }
  return { url, key };
}

const args = process.argv.slice(2);
const go = args.includes("--go");
const valueOf = (flag: string): string => {
  const at = args.indexOf(flag);
  return at === -1 ? "" : (args[at + 1] ?? "");
};

/** Opened on first use, so the layout can be looked at without credentials. */
let client: ReturnType<typeof createClient> | null = null;
function db() {
  if (!client) {
    const { url, key } = env();
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

/** A line starts with a capital, even when the word inside it does not. */
const upper = (s: string) => (s === "" ? s : s[0].toUpperCase() + s.slice(1));

const safe = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The day a run goes, said the way somebody would say it. */
function dayWord(date: string): string {
  const at = new Date(`${date}T12:00:00+01:00`);
  const today = new Date();
  const days = Math.round(
    (at.getTime() - new Date(`${today.toISOString().slice(0, 10)}T12:00:00+01:00`).getTime()) /
      86_400_000
  );
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
  }).format(at);
}

/** "2:30pm", from a stored instant, on the shop's clock. */
function clock(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(new Date(iso))
    .replace(/\s/g, "")
    .toLowerCase();
}

/** Break a line on spaces, at roughly this many characters. */
function wrap(s: string, per: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of s.split(/\s+/)) {
    if (line && line.length + 1 + word.length > per) {
      out.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) out.push(line);
  return out;
}

export type Plan = {
  code: string;
  headline: string;
  counters: string[];
  dish: string;
  photo: string;
  run: string;
  order: string;
};

async function plan(): Promise<Plan | null> {
  const wanted = valueOf("--code");

  const { data: coupons, error } = await db()
    .from("coupons")
    .select("code, applies_to, amount, note, automatic, active")
    .eq("active", true);
  if (error) throw new Error(error.message);

  const live = (coupons ?? []) as {
    code: string;
    applies_to: string;
    amount: number;
    note: string;
    automatic: boolean;
  }[];

  // An automatic offer is the one worth a poster: nobody can type it, so
  // nobody finds it unless the shop says so. A code people have to type is
  // a different post, and it has to name the code.
  const offer =
    (wanted ? live.find((one) => one.code === wanted) : null) ??
    live.find((one) => one.automatic) ??
    live[0];
  if (!offer) return null;

  const { data: joins } = await db()
    .from("coupon_restaurants")
    .select("restaurant_id")
    .eq("coupon_code", offer.code);
  const ids = (joins ?? []).map((one) => (one as { restaurant_id: string }).restaurant_id);

  const { data: places } = ids.length
    ? await db().from("restaurants").select("id, name").in("id", ids).eq("active", true)
    : { data: [] as { id: string; name: string }[] };
  const counters = (places ?? []).map((one) => (one as { name: string }).name);

  // The picture: the dearest photographed thing on the counters the offer
  // is on, which is reliably the centrepiece rather than a sachet of
  // seasoning. A named dish wins over that, for a week the shop wants to
  // push one thing.
  const askedDish = valueOf("--dish");
  let items = db()
    .from("menu_items")
    .select("name, image_url, price_food, restaurant_id")
    .neq("image_url", "")
    .eq("available", true)
    .order("price_food", { ascending: false })
    .limit(1);
  if (ids.length > 0) items = items.in("restaurant_id", ids);
  if (askedDish) items = items.ilike("name", `%${askedDish}%`);

  const { data: picked } = await items;
  const dish = (picked ?? [])[0] as { name: string; image_url: string } | undefined;

  const { data: runs } = await db()
    .from("batches")
    .select("run_date, delivery_window_text, cut_off_at, status, kind")
    .eq("status", "open")
    .neq("kind", "box")
    .gte("run_date", new Date().toISOString().slice(0, 10))
    .order("run_date")
    .limit(1);
  const run = (runs ?? [])[0] as
    | { run_date: string; delivery_window_text: string; cut_off_at: string }
    | undefined;

  return {
    code: offer.code,
    headline:
      offer.applies_to === "fee"
        ? offer.amount === 0
          ? "Free delivery"
          : `${naira(offer.amount)} delivery`
        : `${naira(offer.amount)} off`,
    counters,
    dish: dish?.name ?? "",
    photo: dish?.image_url ?? "",
    run: run ? upper(`${dayWord(run.run_date)}, ${run.delivery_window_text.toLowerCase()}`) : "",
    order: run ? `Order by ${clock(run.cut_off_at)}` : "",
  };
}

/** The words, as an SVG laid over the photograph. */
export function words(p: Plan): string {
  const where =
    p.counters.length === 0
      ? "on the whole menu"
      : p.counters.length === 1
        ? `from ${p.counters[0]}`
        : `from ${p.counters.slice(0, -1).join(", ")} and ${p.counters[p.counters.length - 1]}`;

  const whereLines = wrap(where, 34);
  const text = (
    x: number,
    y: number,
    s: string,
    size: number,
    weight: string,
    fill: string,
    anchor = "start"
  ) =>
    `<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="${size}" ` +
    `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${safe(s)}</text>`;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    // The ground under the words. The photograph fills the top itself.
    `<rect x="0" y="${PHOTO_H}" width="${W}" height="${H - PHOTO_H}" fill="${ORANGE}"/>`,
    // A wash at the foot of the picture, so the mark on it stays readable
    // whatever the photograph happens to be.
    `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#000" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient></defs>`,
    `<rect x="0" y="${PHOTO_H - 200}" width="${W}" height="200" fill="url(#fade)"/>`,
    text(PAD, PHOTO_H - 54, "Sudu", 40, "bold", PAPER),
    text(PAD, PHOTO_H - 22, "Delivery to PAU", 22, "normal", CREAM),
  ];

  let y = PHOTO_H + 116;
  // Shrunk where the offer is a long one. "Free delivery" and "₦10,000 off"
  // are not the same width, and a headline that runs off the side is the
  // one thing a poster cannot do.
  const big = p.headline.length > 15 ? 68 : p.headline.length > 12 ? 78 : 88;
  parts.push(text(PAD, y, p.headline, big, "bold", PAPER));
  y += 56;
  for (const line of whereLines) {
    parts.push(text(PAD, y, line, 34, "normal", CREAM));
    y += 44;
  }

  if (p.run !== "") {
    y += 34;
    parts.push(
      `<rect x="${PAD}" y="${y - 34}" width="${W - PAD * 2}" height="2" fill="${PAPER}" opacity="0.3"/>`
    );
    parts.push(text(PAD, y + 16, p.run, 34, "bold", PAPER));
    if (p.order !== "") parts.push(text(PAD, y + 58, p.order, 30, "normal", CREAM));
  }

  parts.push(text(W / 2, H - PAD + 6, "sudu.store", 32, "bold", PAPER, "middle"));
  parts.push("</svg>");
  return parts.join("\n");
}

/** The photograph, cropped to the band it sits in. Null if it cannot be had. */
async function picture(at: string): Promise<Buffer | null> {
  if (!at) return null;
  try {
    const answer = await fetch(at, { signal: AbortSignal.timeout(30_000) });
    if (!answer.ok) return null;
    const body = Buffer.from(await answer.arrayBuffer());
    return await sharp(body)
      .resize({ width: W, height: PHOTO_H, fit: "cover", position: "attention" })
      .toBuffer();
  } catch {
    return null;
  }
}

async function main() {
  const p = await plan();
  if (!p) {
    console.log("No offer is on, so there is nothing to make a poster about.");
    return;
  }

  console.log(`Offer   ${p.headline} (${p.code})`);
  console.log(`Where   ${p.counters.join(", ") || "the whole menu"}`);
  console.log(`Run     ${p.run || "none open"}`);
  console.log(`        ${p.order}`);
  console.log(`Picture ${p.dish || "none"}`);

  if (!go) {
    console.log("\nThis was a dry run. Nothing was written.");
    console.log("Run it again with --go to make it.");
    return;
  }

  const shot = await picture(p.photo);
  if (!shot) {
    console.log("\nThe photograph could not be fetched, so this one is words only.");
  }

  mkdirSync(OUT, { recursive: true });
  const svg = Buffer.from(words(p));
  const base = sharp({
    create: { width: W, height: H, channels: 4, background: ORANGE },
  });

  const layers = [
    ...(shot ? [{ input: shot, top: 0, left: 0 }] : []),
    { input: svg, top: 0, left: 0 },
  ];

  const path = `${OUT}/offer-${p.code.toLowerCase()}.png`;
  await base.composite(layers).png().toFile(path);

  // The caption, so the words on the poster and the words under it agree.
  const where = p.counters.length ? p.counters.join(", ") : "the whole menu";
  writeFileSync(
    `${OUT}/offer-${p.code.toLowerCase()}.txt`,
    [
      `${p.headline} ${p.counters.length ? `from ${where}` : "on the whole menu"}.`,
      "",
      p.run ? `Going ${p.run}. ${p.order}.` : "",
      "",
      "No code needed, it comes off at checkout.",
      "",
      "sudu.store",
      "",
      "#Sudu #PAU #PanAtlanticUniversity #LagosDelivery #CampusLife",
      "#NigerianStudents #StudentLife #Lekki #IbejuLekki #LagosFood",
    ]
      .filter((line) => line !== "" || true)
      .join("\n")
  );

  console.log(`\nWrote ${path}`);
  console.log(`Wrote ${path.replace(/\.png$/, ".txt")}`);
}

// Only when this is the thing being run. Imported for its layout, it must
// not go looking for credentials or write anything.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop() ?? "")) {
  main().catch((problem) => {
    console.error(problem instanceof Error ? problem.message : problem);
    process.exit(1);
  });
}
