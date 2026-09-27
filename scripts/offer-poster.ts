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
/**
 * What makes this a promotion rather than a new price.
 *
 * A cut that runs three days a week for ever is not an offer, it is the
 * price, and a shop cannot walk that back once people have learned it. A
 * window can end without anybody feeling something was taken away.
 */
const only = valueOf("--only", "This week only");
/** The two ends of the promise: when to order, and when it is at the door. */
const by = valueOf("--by", "1pm");
const arrive = valueOf("--arrive", "5pm");

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

/** The card the offer sits on: over the photograph, not in it. */
const CARD_X = 48;
const CARD_W = W - CARD_X * 2;
const CARD_Y = 680;
const IN = CARD_X + 44;

/** The words, as an SVG laid over the photograph. */
export function words(p: {
  offer: string;
  from: string;
  days: string;
  window: string;
  phone?: string;
  only?: string;
  by?: string;
  arrive?: string;
}): string {
  // Written as two lists rather than one: the card has to be drawn under
  // the words but cannot be sized until they are measured, and counting
  // backwards through a list of strings to slip it in is the sort of thing
  // that breaks the next time a line is added.
  const card: string[] = [];
  const front: string[] = [];

  // Why it is worth acting on now: the two ends of the promise. A price on
  // its own is a fact; a price with a deadline and an arrival is an offer.
  const bySaid = (p.by ?? "").trim();
  const arriveSaid = (p.arrive ?? "").trim();
  const promise =
    bySaid !== "" && arriveSaid !== ""
      ? `Order by ${bySaid}, at your hostel by ${arriveSaid}`
      : bySaid !== ""
        ? `Order by ${bySaid}`
        : "";
  // Wrapped to what the card is actually wide enough for. Narrower than
  // that broke a line which fitted, and the runt landed on the days.
  const promiseLines = promise === "" ? [] : wrap(promise, 42);

  // The window it runs in, said first and said small. It is what stops the
  // number reading as the new price.
  const tag = (p.only ?? "").trim();
  if (tag !== "") {
    front.push(
      `<rect x="${IN}" y="${CARD_Y + 32}" width="${tag.length * 15 + 40}" height="46" rx="23" fill="${PAPER}"/>`,
      text(IN + 20, CARD_Y + 63, tag.toUpperCase(), 23, "bold", ORANGE)
    );
  }

  const big = p.offer.length > 15 ? 62 : p.offer.length > 12 ? 72 : 80;
  front.push(
    text(IN, CARD_Y + 178, p.offer, big, "bold", PAPER),
    text(IN, CARD_Y + 222, p.from === "" ? "on the whole menu" : `from ${p.from}`, 30, "normal", CREAM),
    `<rect x="${IN}" y="${CARD_Y + 246}" width="110" height="6" rx="3" fill="${PAPER}" opacity="0.5"/>`
  );

  for (const [i, line] of promiseLines.entries()) {
    front.push(text(IN, CARD_Y + 302 + i * 42, line, 31, "bold", PAPER));
  }

  const daysY = CARD_Y + 302 + Math.max(1, promiseLines.length) * 42 + 22;
  front.push(text(IN, daysY, `${p.days}, ${p.window}`, 26, "normal", CREAM));

  // Now the height is known, so the card can be cut to it.
  card.push(
    `<rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${daysY - CARD_Y + 58}" rx="40" fill="${ORANGE}"/>`
  );

  const foot = (p.phone ?? "") === "" ? "sudu.store" : `sudu.store  ·  ${p.phone}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs>`,
    `<linearGradient id="head" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#1a0b04" stop-opacity="0.78"/>` +
      `<stop offset="0.6" stop-color="#1a0b04" stop-opacity="0.3"/>` +
      `<stop offset="1" stop-color="#1a0b04" stop-opacity="0"/></linearGradient>`,
    `<linearGradient id="foot" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#1a0b04" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="#1a0b04" stop-opacity="0.9"/></linearGradient>`,
    `</defs>`,
    `<rect x="0" y="0" width="${W}" height="300" fill="url(#head)"/>`,
    `<rect x="0" y="${H - 330}" width="${W}" height="330" fill="url(#foot)"/>`,
    text(PAD, 118, "Sudu", 42, "bold", PAPER),
    text(PAD, 152, "Delivery to PAU", 23, "normal", CREAM),
    ...card,
    ...front,
    text(W / 2, H - PAD + 4, foot, 32, "bold", PAPER, "middle"),
    "</svg>",
  ].join("\n");
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
  console.log(`Window  ${only || "no end named"}`);
  console.log(`Promise Order by ${by}, at your hostel by ${arrive}`);
  console.log(`Phone   ${phone || "not shown"}`);
  console.log(`Picture ${photo || "none, so plain orange"}`);
  console.log("");

  const shot = await picture(photo);
  mkdirSync(OUT, { recursive: true });

  const path = `${OUT}/${name}.png`;
  await sharp({ create: { width: W, height: H, channels: 4, background: ORANGE } })
    .composite([
      ...(shot ? [{ input: shot, top: 0, left: 0 }] : []),
      { input: Buffer.from(words({ offer, from, days, window, phone, only, by, arrive })), top: 0, left: 0 },
    ])
    .png()
    .toFile(path);

  // The caption, so the words on the poster and the words under it agree.
  writeFileSync(
    `${OUT}/${name}.txt`,
    `${offer}${from ? ` from ${from}` : " on the whole menu"}.${only ? ` ${only}.` : ""}

Order by ${by} and it is at your hostel by ${arrive}. We deliver ${days}, ${window}.

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
