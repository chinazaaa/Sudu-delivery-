/**
 * A flyer for a hostel wall, whose whole job is one scan.
 *
 * Different from the status square in marketing/: that is read for five
 * seconds on a phone somebody is already holding. This is read from across a
 * corridor, by somebody walking past, and it has to survive being one of
 * nine things taped to the same board. So: one hook, one square, one line
 * saying what the square does.
 *
 * The square goes to WhatsApp rather than to the shop on purpose. The point
 * of a flyer is not an order tonight, it is a number we can talk to: a
 * stranger who scans and says hello is somebody we can answer, price and
 * follow up, and a stranger who browses a menu and leaves is nobody.
 *
 * The message it opens with names the hostel, so the next morning the
 * WhatsApp inbox says which walls are working and which flyers are being
 * walked past. Nothing else has to be set up for that to be true.
 *
 *   npx tsx scripts/hostel-flyer.ts
 *   npx tsx scripts/hostel-flyer.ts --hostels "Queen Mary, Trezadel"
 *   npx tsx scripts/hostel-flyer.ts --hook "Pizza to your block" --each 1000
 */
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import sharp from "sharp";

/** A4 at 200dpi: big enough to print sharply, small enough to send. */
const W = 1654;
const H = 2339;
const PAD = 120;

const ORANGE = "#ff5a1f";
const DEEP = "#c2400e";
const INK = "#14110f";
const PAPER = "#ffffff";
const SHELL = "#fff1ea";
const MUTED = "#6b6360";

const OUT = "marketing/flyers";

const args = process.argv.slice(2);
const valueOf = (flag: string, fallback: string): string => {
  const at = args.indexOf(flag);
  const said = at === -1 ? "" : (args[at + 1] ?? "");
  return said === "" || said.startsWith("--") ? fallback : said;
};

/** Every block on campus, unless somebody names fewer. */
const HOSTELS = [
  "Cooperative Kings",
  "Cooperative Queens",
  "Queen Mary",
  "Trezadel",
  "Faith Hostel",
  "Amethyst Hall",
  "Trinity Hall",
  "Emerald",
  "Pearl",
  "Redwood",
  "Cedar",
  "Pod Living",
];

const hostels = valueOf("--hostels", HOSTELS.join(","))
  .split(",")
  .map((one) => one.trim())
  .filter(Boolean);

/** The number the square opens a chat with, digits only, in full. */
const phone = valueOf("--phone", "2349032175147").replace(/\D/g, "");
/**
 * The hook, in two lines, because a wall is read from a distance and a long
 * sentence at that size wraps badly or shrinks past reading.
 *
 * Not a price. Somebody walking past a board already knows food can be
 * delivered; what they do not know is that the market and the chemist and
 * the thing nobody stocks are all the same errand to us. That is the whole
 * message, and a discount in its place would spend the flyer on an offer
 * that ends while the paper stays up.
 */
const hookTop = valueOf("--hook", "Anything from outside.");
const hookEnd = valueOf("--hook2", "Brought to your block.");

/** What we fetch, as few words as it can be said in. */
const brings = valueOf("--brings", "Restaurants,The local market,Skincare")
  .split(",")
  .map((one) => one.trim())
  .filter(Boolean);

/**
 * A line under the list, for when the list needs qualifying.
 *
 * Off by default: "Anything from outside" at the top already says the list
 * is not the limit, and saying it twice on one page spends the space that
 * makes the square big. Pass --anything to put it back.
 */
const anything = valueOf("--anything", "");
const anythingSaid = valueOf("--anything-said", "");
/** How big the square is drawn, before the page says what room there is. */
const WANTED_QR = 620;

const tagline = valueOf(
  "--tagline",
  "Bridging the gap between PAU and the outside world"
);

const safe = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const text = (
  x: number,
  y: number,
  said: string,
  size: number,
  weight: string,
  fill: string,
  anchor = "middle"
) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="DejaVu Sans, Liberation Sans, sans-serif" ` +
  `font-size="${size}" font-weight="${weight}" fill="${fill}">${safe(said)}</text>`;

/** The Sudu bag, the same drawing as everywhere else. */
const mark = (x: number, y: number, size: number) => `
  <g transform="translate(${x} ${y}) scale(${size / 512})">
    <rect width="512" height="512" rx="116" fill="${ORANGE}"/>
    <path d="M116 180h280l-27 248a44 44 0 0 1-44 39H187a44 44 0 0 1-44-39z" fill="${SHELL}"/>
    <path d="M196 180v-26a60 60 0 0 1 120 0v26" fill="none" stroke="${SHELL}" stroke-width="28" stroke-linecap="round"/>
    <path d="M316 272C316 240 202 240 202 294C202 338 316 330 316 372C316 426 202 426 202 392"
          fill="none" stroke="${ORANGE}" stroke-width="34" stroke-linecap="round"/>
  </g>`;

/**
 * What the chat opens with.
 *
 * Written as the person, not as us, because WhatsApp puts it in their box
 * for them to send: anything that reads like a shop talking gets deleted
 * before it is sent, and then there is no message and no number.
 */
const opener = (hostel: string) =>
  `Hi Sudu, I'm in ${hostel} and I'd like to order.`;

async function flyer(hostel: string): Promise<void> {
  const link = `https://wa.me/${phone}?text=${encodeURIComponent(opener(hostel))}`;

  const mid = W / 2;

  /*
   * The page, down the middle, as a list of baselines.
   *
   * Written out rather than worked out in place: every time a line moved,
   * something below it ended up printed over the square, and on a wall that
   * is a flyer nobody can scan rather than a flyer that looks untidy.
   */
  const listTop = 710;
  const listHeight = 60 + brings.length * 74;
  const elseAt = listTop + listHeight + 88;
  const plateTop =
    anything === "" ? listTop + listHeight + 110 : elseAt + 130;

  /*
   * The footer is measured up from the paper's edge and the square is given
   * what is left, rather than the square being a number and the footer
   * hoping. Three times now a line has moved and printed the last sentence
   * off the bottom of the page, which on a wall is a flyer with a sentence
   * missing and no way to tell from the file.
   */
  const lastAt = H - 110;
  const siteAt = H - 170;

  const roomForPlate = siteAt - 90 - plateTop;
  // 310 is what sits under the square: eighty to its baseline, the two
  // lines saying what it is for, and air under the last of them. At 250 the
  // second line printed over the edge of the white and out onto the paper.
  const QR = Math.max(420, Math.min(WANTED_QR, roomForPlate - 310 - 80));

  // Drawn at the size it is printed at, so the modules land on whole pixels
  // and a phone reads it from across a corridor rather than from a foot away.
  const square = await QRCode.toString(link, {
    type: "svg",
    margin: 0,
    width: QR,
    color: { dark: INK, light: "#0000" },
  });

  const qrTop = plateTop + 80;
  const plateHeight = QR + 310;
  const scanAt = qrTop + QR + 100;

  const parts: string[] = [
    `<rect width="${W}" height="${H}" fill="${SHELL}"/>`,

    // The shop, small, at the top. Nobody scans because of a logo.
    mark(mid - 60, 120, 120),
    text(mid, 330, "Sudu", 78, "800", INK),
    text(mid, 390, `Delivery to ${hostel}`, 40, "normal", MUTED),

    // The hook, as big as it goes, over two lines.
    text(mid, 540, hookTop, 92, "800", INK),
    text(mid, 640, hookEnd, 92, "800", INK),

    // What we fetch. Three words rather than three sentences: this is read
    // from across a corridor by somebody who has not stopped walking.
    `<rect x="${PAD}" y="710" width="${W - PAD * 2}" height="${110 + brings.length * 74}" rx="40" fill="${ORANGE}"/>`,
    ...brings.map((one, at) =>
      text(mid, 800 + at * 74, one, 56, "700", "#ffffff")
    ),

    // And the line that is actually the point: that list is not the limit.
    text(mid, 710 + 110 + brings.length * 74 + 92, anything, 60, "800", DEEP),
    text(mid, 710 + 110 + brings.length * 74 + 146, anythingSaid, 38, "normal", MUTED),

    // The square, on its own paper so it reads as a thing to point at.
    `<rect x="${(W - (QR + 180)) / 2}" y="${plateTop}" width="${QR + 180}" height="${plateHeight}" rx="48" fill="${PAPER}"/>`,
  ];

  const front: string[] = [
    text(mid, qrTop + QR + 108, "Scan to order on WhatsApp", 54, "800", INK),
    text(mid, qrTop + QR + 162, "It opens a chat. Tell us what you want.", 36, "normal", MUTED),

    text(mid, siteAt, "sudu.store", 62, "800", INK),
    text(mid, lastAt, tagline, 34, "normal", MUTED),
  ];

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    parts.join("") +
    front.join("") +
    `</svg>`;

  const name = hostel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const path = `${OUT}/flyer-${name}.png`;

  await sharp(Buffer.from(svg))
    .composite([
      {
        input: Buffer.from(square),
        top: qrTop,
        left: Math.round((W - QR) / 2),
      },
    ])
    .png()
    .toFile(path);

  writeFileSync(`${OUT}/flyer-${name}.txt`, `${link}\n`);
  console.log(`${hostel.padEnd(28)} ${path}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`WhatsApp  +${phone}`);
  console.log(`Hook      ${hookTop} ${hookEnd}`);
  console.log(`Brings    ${brings.join(", ")}`);
  console.log("");
  for (const hostel of hostels) await flyer(hostel);
  console.log("");
  console.log(`${hostels.length} flyers in ${OUT}. A4 at 200dpi.`);
}

void main();
