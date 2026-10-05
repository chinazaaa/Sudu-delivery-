/**
 * A flyer for a match everybody is already going to watch.
 *
 * Different from the hostel flyer, which sells the shop to somebody who has
 * not heard of it. This one has a deadline on it, and the deadline is the
 * whole point: the food has to be bought, driven and carried before kick
 * off, so the only sentence that matters is the one saying when ordering
 * stops. Everything else on the page is there to get the eye to that line.
 *
 * The square goes to the occasion's own page rather than to WhatsApp. For a
 * match there is something to buy and a clock running, so the shortest path
 * from a wall to a paid order is the page with the boxes on it. Pass
 * --whatsapp to send it to a chat instead, for a hostel group where people
 * would rather ask than browse.
 *
 * Nothing here reads the database: the scripts cannot see .env.local. The
 * defaults are this match as the occasions table has it, so check them
 * against admin before printing a hundred of anything.
 *
 *   npx tsx scripts/match-flyer.ts
 *   npx tsx scripts/match-flyer.ts --match "Arsenal v Spurs" --when "Sunday 18 October"
 *   npx tsx scripts/match-flyer.ts --whatsapp
 */
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import sharp from "sharp";

/** A4 at 200dpi, the same as the other flyers, so they print off one setting. */
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
const has = (flag: string) => args.includes(flag);
const valueOf = (flag: string, fallback: string): string => {
  const at = args.indexOf(flag);
  const said = at === -1 ? "" : (args[at + 1] ?? "");
  return said === "" || said.startsWith("--") ? fallback : said;
};

/** The occasion, as the occasions table has it. */
const slug = valueOf("--slug", "liverpool-man-city");
const match = valueOf("--match", "Liverpool v Man City");
const when = valueOf("--when", "Sunday 11 October");
const where = valueOf("--where", "At Anfield");

/**
 * The two times, in Lagos.
 *
 * Stored as 15:30 and 10:00 UTC, which is half four and eleven here. A
 * flyer printing UTC would be a flyer telling somebody to order two hours
 * after ordering closed.
 */
const kickOff = valueOf("--kick-off", "4:30pm");
const closes = valueOf("--closes", "11am");

const phone = valueOf("--phone", "2349032175147").replace(/\D/g, "");
const site = valueOf("--site", "sudu.store");

/** What is on the page the square opens. */
const boxes = valueOf(
  "--boxes",
  ["The Pizza Box", "The Chicken Box", "The Cant-Agree Box"].join("|")
)
  .split("|")
  .map((one) => one.trim())
  .filter(Boolean);

const serves = valueOf("--serves", "Each one feeds four to five.");

const tagline = valueOf(
  "--tagline",
  "Bridging the gap between PAU and the outside world"
);

const WANTED_QR = 560;

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

/** The Sudu bag, the same drawing as the other flyers. */
const mark = (x: number, y: number, size: number) => `
  <g transform="translate(${x} ${y}) scale(${size / 512})">
    <rect width="512" height="512" rx="116" fill="${ORANGE}"/>
    <path d="M116 180h280l-27 248a44 44 0 0 1-44 39H187a44 44 0 0 1-44-39z" fill="${SHELL}"/>
    <path d="M196 180v-26a60 60 0 0 1 120 0v26" fill="none" stroke="${SHELL}" stroke-width="28" stroke-linecap="round"/>
    <path d="M316 272C316 240 202 240 202 294C202 338 316 330 316 372C316 426 202 426 202 392"
          fill="none" stroke="${ORANGE}" stroke-width="34" stroke-linecap="round"/>
  </g>`;

const opener = `Hi Sudu, I'd like a box for the ${match} match.`;

async function flyer(): Promise<void> {
  const link = has("--whatsapp")
    ? `https://wa.me/${phone}?text=${encodeURIComponent(opener)}`
    : `https://${site}/occasions/${slug}`;

  const mid = W / 2;

  /*
   * Baselines written out rather than worked out in place, as on the other
   * two flyers: a line computed from the one above it ends up printed over
   * the square the first time any of the words change length.
   */
  const listTop = 820;
  const listHeight = 110 + boxes.length * 82;
  const servesAt = listTop + listHeight + 76;
  const deadlineAt = servesAt + 92;
  const plateTop = deadlineAt + 60;

  const lastAt = H - 110;
  const siteAt = H - 170;

  const roomForPlate = siteAt - 90 - plateTop;
  const QR = Math.max(380, Math.min(WANTED_QR, roomForPlate - 310 - 80));

  const square = await QRCode.toString(link, {
    type: "svg",
    margin: 0,
    width: QR,
    color: { dark: INK, light: "#0000" },
  });

  const qrTop = plateTop + 80;
  const plateHeight = QR + 310;

  const parts: string[] = [
    `<rect width="${W}" height="${H}" fill="${SHELL}"/>`,

    mark(mid - 60, 110, 120),
    text(mid, 316, "Sudu", 70, "800", INK),
    text(mid, 372, "Match day", 38, "normal", MUTED),

    // The match, as big as it goes. Nobody reads a flyer for a match they
    // are not watching, so this is the line that stops them or does not.
    text(mid, 500, match, 86, "800", INK),
    text(mid, 578, `${where}, ${when}`, 42, "normal", MUTED),
    text(mid, 660, `Kick-off ${kickOff}`, 52, "800", DEEP),

    `<rect x="${PAD}" y="${listTop}" width="${W - PAD * 2}" height="${listHeight}" rx="40" fill="${ORANGE}"/>`,
    ...boxes.map((one, at) =>
      text(mid, listTop + 96 + at * 82, one, 52, "700", "#ffffff")
    ),

    text(mid, servesAt, serves, 40, "normal", MUTED),

    // The sentence the whole page is for.
    text(mid, deadlineAt, `Order by ${closes}. It is at your block before kick-off.`, 42, "800", INK),

    `<rect x="${(W - (QR + 180)) / 2}" y="${plateTop}" width="${QR + 180}" height="${plateHeight}" rx="48" fill="${PAPER}"/>`,
  ];

  const front: string[] = [
    text(
      mid,
      qrTop + QR + 108,
      has("--whatsapp") ? "Scan to order on WhatsApp" : "Scan to see the boxes",
      52,
      "800",
      INK
    ),
    text(
      mid,
      qrTop + QR + 162,
      has("--whatsapp")
        ? "It opens a chat. Tell us which box."
        : "Swap anything in them for something else.",
      34,
      "normal",
      MUTED
    ),

    text(mid, siteAt, site, 62, "800", INK),
    text(mid, lastAt, tagline, 34, "normal", MUTED),
  ];

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    parts.join("") +
    front.join("") +
    `</svg>`;

  const name = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const path = `${OUT}/flyer-match-${name}.png`;

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

  writeFileSync(`${OUT}/flyer-match-${name}.txt`, `${link}\n`);
  console.log(path);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`Match     ${match}, ${when}`);
  console.log(`Kick-off  ${kickOff}, orders close ${closes}`);
  console.log("");
  await flyer();
  console.log("");
  console.log(`A4 at 200dpi, in ${OUT}.`);
}

void main();
