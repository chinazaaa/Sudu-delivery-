/**
 * A flyer for recruiting promoters, not customers.
 *
 * The hostel flyer sells the service to somebody who wants dinner. This one
 * is read by somebody deciding whether to work, so it has to answer the
 * only question they have: what do I get, and how much work is it. Two
 * numbers and a square, in that order.
 *
 * The numbers are the real ones out of `promoters`: a flyer promising a
 * rate the page then does not pay is worse than no flyer, because the
 * person who signed up reads the truth on their own earnings page a week
 * later. Pass --rate and --box only when the scheme itself changes.
 *
 * The square goes to WhatsApp rather than to a form. Somebody deciding
 * whether to take on work wants to ask a question first, and a form cannot
 * answer it.
 *
 *   npx tsx scripts/promoter-flyer.ts
 *   npx tsx scripts/promoter-flyer.ts --rate 500 --box 1000
 *   npx tsx scripts/promoter-flyer.ts --hook "Bring us orders." --hook2 "Get paid per order."
 */
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import sharp from "sharp";

/** A4 at 200dpi, same as the hostel flyer, so they print off one setting. */
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

const phone = valueOf("--phone", "2349032175147").replace(/\D/g, "");

/** What the scheme actually pays, straight off the promoters table. */
const rate = Number(valueOf("--rate", "500"));
const box = Number(valueOf("--box", "1000"));

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

/**
 * The hook, over two lines.
 *
 * Says paid rather than earn because earn reads like a scheme and paid
 * reads like a job, and the people worth having are the ones who hear a
 * job.
 */
const hookTop = valueOf("--hook", "Get paid for");
const hookEnd = valueOf("--hook2", "every order you bring.");

/**
 * The offer, in three lines, each one a thing they did not know.
 *
 * The third is the one that matters and the one nobody expects: the
 * customer is bound to whoever brought them on their first order and is
 * never reassigned, so a person they sign up in October is still paying
 * them in March. Without that line this is a one-off errand; with it, it
 * is a reason to keep going.
 */
const offerDefault = [
  `${naira(rate)} on every order they pay for`,
  `${naira(box)} when it is a box`,
  "They stay yours. Every time they order.",
];

// Split on a pipe, not a comma: the rates are written with thousands
// separators, and a comma-separated flag cut the thousand off every line.
const offer = valueOf("--offer", offerDefault.join("|"))
  .split("|")
  .map((one) => one.trim())
  .filter(Boolean);

const asked = valueOf("--asked", "No shift. No stock. Just send people.");

const tagline = valueOf(
  "--tagline",
  "Bridging the gap between PAU and the outside world"
);

const WANTED_QR = 620;

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

/**
 * What the chat opens with.
 *
 * In their words, not ours, because WhatsApp puts it in their box to send
 * and anything that reads like a shop talking gets deleted first.
 */
const opener = "Hi Sudu, I'd like to be a promoter.";

async function flyer(): Promise<void> {
  const link = `https://wa.me/${phone}?text=${encodeURIComponent(opener)}`;

  const mid = W / 2;

  /*
   * Baselines written out rather than worked out in place, the same as the
   * hostel flyer: every time a line was computed from the one above it,
   * something ended up printed over the square.
   */
  const listTop = 710;
  const listHeight = 110 + offer.length * 82;
  const askedAt = listTop + listHeight + 86;
  const plateTop = askedAt + 70;

  const lastAt = H - 110;
  const siteAt = H - 170;

  const roomForPlate = siteAt - 90 - plateTop;
  // 310 is what sits under the square: its two lines of caption and the air
  // under them. Below 420 the square stops reading from arm's length.
  const QR = Math.max(420, Math.min(WANTED_QR, roomForPlate - 310 - 80));

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

    mark(mid - 60, 120, 120),
    text(mid, 330, "Sudu", 78, "800", INK),
    text(mid, 390, "Promoters wanted", 40, "normal", MUTED),

    text(mid, 540, hookTop, 92, "800", INK),
    text(mid, 640, hookEnd, 78, "800", INK),

    `<rect x="${PAD}" y="${listTop}" width="${W - PAD * 2}" height="${listHeight}" rx="40" fill="${ORANGE}"/>`,
    ...offer.map((one, at) =>
      text(mid, listTop + 96 + at * 82, one, 50, "700", "#ffffff")
    ),

    text(mid, askedAt, asked, 42, "800", DEEP),

    `<rect x="${(W - (QR + 180)) / 2}" y="${plateTop}" width="${QR + 180}" height="${plateHeight}" rx="48" fill="${PAPER}"/>`,
  ];

  const front: string[] = [
    text(mid, qrTop + QR + 108, "Scan to ask on WhatsApp", 54, "800", INK),
    text(mid, qrTop + QR + 162, "It opens a chat. We set you up the same day.", 34, "normal", MUTED),

    text(mid, siteAt, "sudu.store", 62, "800", INK),
    text(mid, lastAt, tagline, 34, "normal", MUTED),
  ];

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    parts.join("") +
    front.join("") +
    `</svg>`;

  const path = `${OUT}/flyer-promoters.png`;

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

  writeFileSync(`${OUT}/flyer-promoters.txt`, `${link}\n`);
  console.log(path);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`WhatsApp  +${phone}`);
  console.log(`Pays      ${naira(rate)} an order, ${naira(box)} a box`);
  console.log("");
  await flyer();
  console.log("");
  console.log(`A4 at 200dpi, in ${OUT}.`);
}

void main();
