/**
 * A poster for whatever is on this week.
 *
 * The nine Instagram posters say what the shop is and never change. This
 * one is the opposite: it is out of date by Sunday, because the point of
 * it is the offer running now and the days it runs on. So it is a poster
 * and nothing cleverer: the words are given to it, it sets them over a
 * photograph, and it writes the caption to go under the post.
 *
 *   npx tsx scripts/offer-poster.ts --photo pizza.jpg
 *   npx tsx scripts/offer-poster.ts --photo pizza.jpg --offer "Free delivery"
 *   npx tsx scripts/offer-poster.ts --photo pizza.jpg --from "KFC" --days "Friday"
 *
 * The photograph can be a file on your machine or an address. Without one
 * it still makes the poster, on plain orange.
 *
 * Every line is a flag with a default, so the usual week is one command and
 * an unusual one is the same command with a word changed.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const W = 1080;
const H = 1350;
const PAD = 88;
const ORANGE = "#ff5a1f";
const PAPER = "#ffffff";
const CREAM = "#ffe6da";

/** The picture is the whole poster.
 *
 * It used to be a photograph on top and a flat orange slab under it, which
 * read as two pictures stacked rather than one poster, and left a third of
 * the page empty beside the words. Food sells food: the photograph fills
 * the frame and the words sit on it, over a shade deep enough to read
 * against whatever the picture happens to be. */
const PHOTO_H = H;

const OUT = "marketing/instagram";

const args = process.argv.slice(2);
const valueOf = (flag: string, fallback: string): string => {
  const at = args.indexOf(flag);
  const said = at === -1 ? "" : (args[at + 1] ?? "");
  return said === "" || said.startsWith("--") ? fallback : said;
};

/** This week, unless a flag says otherwise. */
const offer = valueOf("--offer", "₦2,000 delivery");
const from = valueOf("--from", "Domino's Pizza");
const days = valueOf("--days", "Wednesday, Friday and Saturday");
const window = valueOf("--window", "between 3 and 5pm");
const photo = valueOf("--photo", "");
const name = valueOf("--name", "offer");
/** The WhatsApp number as the shop gives it out. Spaced for reading rather
 *  than dialling: nobody types a number off a poster, they look at it and
 *  then find you. */
const phone = valueOf("--phone", "0903 217 5147");

const safe = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

/** The words, as an SVG laid over the photograph. */
export function words(p: {
  offer: string;
  from: string;
  days: string;
  window: string;
  phone?: string;
}): string {
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs>`,
    // Deep enough at the foot to read white against a photograph of
    // anything, and gone by halfway up so the food is not behind a curtain.
    `<linearGradient id="foot" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#1a0b04" stop-opacity="0"/>` +
      `<stop offset="0.45" stop-color="#1a0b04" stop-opacity="0.72"/>` +
      `<stop offset="1" stop-color="#1a0b04" stop-opacity="0.95"/></linearGradient>`,
    // A lighter one at the top, so the mark has something to sit on.
    `<linearGradient id="head" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#1a0b04" stop-opacity="0.78"/>` +
      `<stop offset="0.6" stop-color="#1a0b04" stop-opacity="0.3"/>` +
      `<stop offset="1" stop-color="#1a0b04" stop-opacity="0"/></linearGradient>`,
    `</defs>`,
    `<rect x="0" y="0" width="${W}" height="300" fill="url(#head)"/>`,
    `<rect x="0" y="${H - 720}" width="${W}" height="720" fill="url(#foot)"/>`,
    text(PAD, 118, "Sudu", 42, "bold", PAPER),
    text(PAD, 152, "Delivery to PAU", 23, "normal", CREAM),
  ];

  // Set from the foot upwards, because the foot is the one edge every one
  // of these shares: the address sits on it and everything stacks off that.
  const dayLines = wrap(p.days, 30);
  const windowY = H - 158;
  const daysTop = windowY - 44 - (dayLines.length - 1) * 46;

  if (p.window !== "") parts.push(text(PAD, windowY, p.window, 33, "normal", CREAM));
  let at = daysTop;
  for (const line of dayLines) {
    parts.push(text(PAD, at, line, 37, "bold", PAPER));
    at += 46;
  }

  // The brand's own colour, as a line rather than a slab. One stripe of
  // orange is enough to say whose poster this is; a block of it buries the
  // photograph the poster is for.
  const ruleY = daysTop - 52;
  parts.push(`<rect x="${PAD}" y="${ruleY}" width="96" height="7" rx="4" fill="${ORANGE}"/>`);

  const fromY = ruleY - 34;
  parts.push(
    text(PAD, fromY, p.from === "" ? "on the whole menu" : `from ${p.from}`, 36, "normal", CREAM)
  );

  // Shrunk where the offer is a long one. "Free delivery" and "₦10,000 off"
  // are not the same width, and a headline that runs off the side is the
  // one thing a poster cannot do.
  const big = p.offer.length > 15 ? 74 : p.offer.length > 12 ? 84 : 96;
  parts.push(text(PAD, fromY - 56, p.offer, big, "bold", PAPER));

  // The address and the number on one line at the foot. Two ways to reach
  // the shop, and a dot between them so it reads as one line rather than
  // two things that happen to be near each other.
  const foot = (p.phone ?? "") === "" ? "sudu.store" : `sudu.store  ·  ${p.phone}`;
  parts.push(text(W / 2, H - PAD + 4, foot, 32, "bold", PAPER, "middle"));
  parts.push("</svg>");
  return parts.join("\n");
}

/** The photograph, cropped to the band it sits in. Null if it cannot be had. */
async function picture(at: string): Promise<Buffer | null> {
  if (at === "") return null;
  try {
    const body = /^https?:\/\//i.test(at)
      ? Buffer.from(
          await (await fetch(at, { signal: AbortSignal.timeout(30_000) })).arrayBuffer()
        )
      : readFileSync(at);
    return await sharp(body)
      // "attention" finds the busiest part of the picture, which on a plate
      // of food is the food rather than the rim.
      .resize({ width: W, height: PHOTO_H, fit: "cover", position: "attention" })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (problem) {
    console.log(
      `  Could not use that picture: ${problem instanceof Error ? problem.message : "unreadable"}`
    );
    return null;
  }
}

async function main() {
  console.log(`Offer   ${offer}`);
  console.log(`From    ${from || "the whole menu"}`);
  console.log(`Days    ${days}`);
  console.log(`Window  ${window}`);
  console.log(`Phone   ${phone || "not shown"}`);
  console.log(`Picture ${photo || "none, so plain orange"}`);
  console.log("");

  const shot = await picture(photo);
  mkdirSync(OUT, { recursive: true });

  const path = `${OUT}/${name}.png`;
  await sharp({ create: { width: W, height: H, channels: 4, background: ORANGE } })
    .composite([
      ...(shot ? [{ input: shot, top: 0, left: 0 }] : []),
      { input: Buffer.from(words({ offer, from, days, window, phone })), top: 0, left: 0 },
    ])
    .png()
    .toFile(path);

  // The caption, so the words on the poster and the words under it agree.
  writeFileSync(
    `${OUT}/${name}.txt`,
    `${offer}${from ? ` from ${from}` : " on the whole menu"}.

We deliver ${days}, ${window}.

No code needed, it comes off at checkout.

sudu.store${phone ? ` or WhatsApp ${phone}` : ""}

#Sudu #PAU #PanAtlanticUniversity #LagosDelivery #CampusLife
#NigerianStudents #StudentLife #Lekki #IbejuLekki #LagosFood
`
  );

  console.log(`Wrote ${path}`);
  console.log(`Wrote ${path.replace(/\.png$/, ".txt")}`);
}

// Only when this is the thing being run, so the layout can be imported and
// looked at without writing anything.
if (process.argv[1]?.endsWith("offer-poster.ts")) {
  main().catch((problem) => {
    console.error(problem instanceof Error ? problem.message : problem);
    process.exit(1);
  });
}
