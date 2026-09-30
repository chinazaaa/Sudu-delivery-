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
/** When to order by. The other end of the promise is the delivery window
 *  itself, which the poster already knows, so it is not asked for twice. */
const by = valueOf("--by", "1pm");
/**
 * The line that answers "what if it goes wrong".
 *
 * On a flyer aimed at somebody who has never used the shop, this does more
 * than the discount does: a stranger's worry is not the price, it is
 * handing money to a stranger. Say nothing here with --backed "".
 *
 * It names what the shop already does rather than a new promise. "Late"
 * was the first draft and is the wrong word: a window is an estimate, the
 * site says half an hour either way is normal, and nothing anywhere says
 * when late begins. That is an argument waiting to happen in public with a
 * student who is owed nothing. Missing and wrong are not arguable, and
 * same night is a harder commitment than the vague one it replaces.
 */
const backed = valueOf("--backed", "Missing or wrong = full refund, same night");

/**
 * The days, dropped into the middle of a sentence.
 *
 * The poster says them on a line of their own, where "This Thursday" is
 * right. The caption says them after "We deliver", where a capital in the
 * middle of a sentence is not. Only the ones that begin a phrase rather
 * than name a day, so Friday keeps its capital.
 */
const midSentence = (s: string): string => {
  const said = String(s ?? "").trim();
  return /^(This|Next|Every|Only)\b/.test(said)
    ? said.charAt(0).toLowerCase() + said.slice(1)
    : said;
};

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
/** Low enough to leave the food whole above it. The block used to start at
 *  the middle and cover the part of the picture that does the selling: the
 *  photograph is what stops the scroll, the offer is what closes it, and in
 *  that order. */
const CARD_Y = 846;
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
  backed?: string;
}): string {
  // Written as two lists rather than one: the card has to be drawn under
  // the words but cannot be sized until they are measured, and counting
  // backwards through a list of strings to slip it in is the sort of thing
  // that breaks the next time a line is added.
  const card: string[] = [];
  const front: string[] = [];

  // Why it is worth acting on now, in one line rather than two.
  //
  // It used to say "at your hostel by 5pm" directly above "between 3 and
  // 5pm", which is the same fact told twice and told differently, and two
  // versions of when food turns up is worse than one. The deadline and the
  // window belong in the same sentence: order by this, get it then.
  const bySaid = (p.by ?? "").trim();
  const promise =
    bySaid !== "" ? `Order by ${bySaid} \u2192 at your hostel ${p.window}` : `At your hostel ${p.window}`;
  const promiseLines = wrap(promise, 48);

  // The window it runs in, said first and said small. It is what stops the
  // number reading as the new price.
  const tag = (p.only ?? "").trim();
  if (tag !== "") {
    front.push(
      `<rect x="${IN}" y="${CARD_Y + 26}" width="${tag.length * 14 + 38}" height="42" rx="21" fill="${PAPER}"/>`,
      text(IN + 19, CARD_Y + 55, tag.toUpperCase(), 22, "bold", ORANGE)
    );
  }

  const big = p.offer.length > 15 ? 58 : p.offer.length > 12 ? 66 : 74;
  front.push(
    text(IN, CARD_Y + 146, p.offer, big, "bold", PAPER),
    text(IN, CARD_Y + 186, p.from === "" ? "on the whole menu" : `from ${p.from}`, 28, "normal", CREAM),
    `<rect x="${IN}" y="${CARD_Y + 208}" width="100" height="5" rx="3" fill="${PAPER}" opacity="0.5"/>`
  );

  for (const [i, line] of promiseLines.entries()) {
    front.push(text(IN, CARD_Y + 256 + i * 38, line, 29, "bold", PAPER));
  }

  // The days on their own now. The window they used to carry has moved up
  // into the sentence above, where it is said once.
  const daysY = CARD_Y + 256 + promiseLines.length * 38 + 18;
  front.push(text(IN, daysY, p.days, 25, "normal", CREAM));

  // Now the height is known, so the card can be cut to it.
  card.push(
    `<rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${daysY - CARD_Y + 44}" rx="36" fill="${ORANGE}"/>`
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
    text(W / 2, H - PAD - 24, foot, 30, "bold", PAPER, "middle"),
    ...((p.backed ?? "").trim() === ""
      ? []
      : [text(W / 2, H - PAD + 18, (p.backed ?? "").trim(), 25, "normal", CREAM, "middle")]),
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
  console.log(`Promise Order by ${by} \u2192 at your hostel ${window}`);
  console.log(`Backed  ${backed || "nothing said"}`);
  console.log(`Phone   ${phone || "not shown"}`);
  console.log(`Picture ${photo || "none, so plain orange"}`);
  console.log("");

  const shot = await picture(photo);
  mkdirSync(OUT, { recursive: true });

  const path = `${OUT}/${name}.png`;
  await sharp({ create: { width: W, height: H, channels: 4, background: ORANGE } })
    .composite([
      ...(shot ? [{ input: shot, top: 0, left: 0 }] : []),
      { input: Buffer.from(words({ offer, from, days, window, phone, only, by, backed })), top: 0, left: 0 },
    ])
    .png()
    .toFile(path);

  // The caption, so the words on the poster and the words under it agree.
  writeFileSync(
    `${OUT}/${name}.txt`,
    `${offer}${from ? ` from ${from}` : " on the whole menu"}.${only ? ` ${only}.` : ""}

Order by ${by} and it is at your hostel ${window}. We deliver ${midSentence(days)}.${backed ? `\n\n${backed}.` : ""}

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
