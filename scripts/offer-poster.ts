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

/** The picture gets most of the poster: the food is why anybody stops. */
const PHOTO_H = 780;

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
const window = valueOf("--window", "between 12 and 3pm");
const photo = valueOf("--photo", "");
const name = valueOf("--name", "offer");

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
}): string {
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect x="0" y="${PHOTO_H}" width="${W}" height="${H - PHOTO_H}" fill="${ORANGE}"/>`,
    // A wash at the foot of the picture, so the mark stays readable over
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
  const big = p.offer.length > 15 ? 68 : p.offer.length > 12 ? 78 : 88;
  parts.push(text(PAD, y, p.offer, big, "bold", PAPER));

  y += 56;
  for (const line of wrap(p.from === "" ? "on the whole menu" : `from ${p.from}`, 34)) {
    parts.push(text(PAD, y, line, 34, "normal", CREAM));
    y += 44;
  }

  if (p.days !== "" || p.window !== "") {
    y += 34;
    parts.push(
      `<rect x="${PAD}" y="${y - 34}" width="${W - PAD * 2}" height="2" fill="${PAPER}" opacity="0.3"/>`
    );
    let at = y + 16;
    for (const line of wrap(p.days, 30)) {
      parts.push(text(PAD, at, line, 34, "bold", PAPER));
      at += 44;
    }
    if (p.window !== "") parts.push(text(PAD, at + 6, p.window, 30, "normal", CREAM));
  }

  parts.push(text(W / 2, H - PAD + 6, "sudu.store", 32, "bold", PAPER, "middle"));
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
  console.log(`Picture ${photo || "none, so plain orange"}`);
  console.log("");

  const shot = await picture(photo);
  mkdirSync(OUT, { recursive: true });

  const path = `${OUT}/${name}.png`;
  await sharp({ create: { width: W, height: H, channels: 4, background: ORANGE } })
    .composite([
      ...(shot ? [{ input: shot, top: 0, left: 0 }] : []),
      { input: Buffer.from(words({ offer, from, days, window })), top: 0, left: 0 },
    ])
    .png()
    .toFile(path);

  // The caption, so the words on the poster and the words under it agree.
  writeFileSync(
    `${OUT}/${name}.txt`,
    `${offer}${from ? ` from ${from}` : " on the whole menu"}.

We deliver ${days}, ${window}.

No code needed, it comes off at checkout.

sudu.store

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
