/**
 * The flyer for the bring-a-friend offer.
 *
 * One number does the work here, and it is not the discount: it is "no
 * limit". A flat "₦1,000 off when you refer a friend" is read as a coupon
 * and forgotten. A ladder that visibly keeps going is read as an amount
 * somebody can decide how big it gets, and that is the thing worth printing.
 *
 * So the page is the ladder. The hook names the trade in six words, the
 * ladder shows it compounding, and the line under it says the one condition
 * that makes it real: they have to pay. Everything else is small.
 *
 * The square goes to WhatsApp rather than to the shop, for the same reason
 * the hostel flyer does: the point is a number we can talk to. Its opener
 * names the offer, so the morning after a wall goes up the inbox says which
 * paper is working without anything being set up to measure it.
 *
 *   npx tsx scripts/invite-flyer.ts
 *   npx tsx scripts/invite-flyer.ts --back 1500 --per 2
 *   npx tsx scripts/invite-flyer.ts --hook "Feed your friends." --hook2 "Get paid for it."
 */
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import sharp from "sharp";

/** A4 at 200dpi: big enough to print sharply, small enough to send. */
const W = 1654;
const H = 2339;

const ORANGE = "#ff5a1f";
const DEEP = "#c2400e";
const INK = "#14110f";
const SHELL = "#fff1ea";
const PAPER = "#ffffff";
const MUTED = "#6b6360";

const OUT = "marketing/flyers";

const args = process.argv.slice(2);
const valueOf = (flag: string, fallback: string): string => {
  const at = args.indexOf(flag);
  const said = at === -1 ? "" : (args[at + 1] ?? "");
  return said === "" || said.startsWith("--") ? fallback : said;
};

/** What comes back, and how many paying friends it takes to earn it. */
const back = Math.max(100, Number(valueOf("--back", "1000")) || 1000);
const per = Math.max(1, Number(valueOf("--per", "2")) || 2);

const phone = valueOf("--phone", "2349032175147").replace(/\D/g, "");
const site = valueOf("--site", "sudu.store");

const hookTop = valueOf("--hook", `Bring ${per} friends.`);
const hookEnd = valueOf("--hook2", `Get ${naira(back)} back.`);

function naira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

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
 * Written as the person rather than as us: WhatsApp puts it in their box for
 * them to send, and anything that reads like a shop talking gets deleted
 * before it is sent. Then there is no message and no number.
 */
const opener = `Hi Sudu, I want to bring my friends and get the ${naira(back)} back.`;

async function flyer(): Promise<void> {
  const link = `https://wa.me/${phone}?text=${encodeURIComponent(opener)}`;
  const mid = W / 2;

  /*
   * The ladder, which is the whole argument. Four rungs, because three reads
   * as a list and five reads as a table, and the last one is far enough out
   * to make the point that nothing stops it.
   */
  const rungs = [per, per * 2, per * 3, per * 10].map((friends) => ({
    friends,
    gets: (friends / per) * back,
  }));

  /*
   * The footer is measured up from the paper's edge and the square takes
   * what is left, rather than the square being a number and the footer
   * hoping. On the last flyer a line moved three times and printed the final
   * sentence off the bottom of the page, which on a wall is a flyer with a
   * sentence missing and no way to tell from the file.
   */
  const lastAt = H - 108;
  const siteAt = H - 172;

  const ladderTop = 760;
  const rowH = 128;
  const ladderHeight = rungs.length * rowH;
  const noteAt = ladderTop + ladderHeight + 96;
  const plateTop = noteAt + 70;

  const roomForPlate = siteAt - 86 - plateTop;
  // 300 is what sits under the square: its baseline, the two lines saying
  // what it is for, and air under the last of them.
  const QR = Math.max(380, Math.min(560, roomForPlate - 300 - 70));
  const qrTop = plateTop + 76;
  const plateHeight = QR + 300;
  const scanAt = qrTop + QR + 96;

  const square = await QRCode.toString(link, {
    type: "svg",
    margin: 0,
    width: QR,
    color: { dark: INK, light: "#0000" },
  });

  const parts: string[] = [
    `<rect width="${W}" height="${H}" fill="${SHELL}"/>`,

    mark(mid - 56, 112, 112),
    text(mid, 312, "Sudu", 72, "800", INK),
    text(mid, 368, "Food, market and errands, to your block", 36, "normal", MUTED),

    // The hook, as big as it goes, over two lines.
    text(mid, 520, hookTop, 96, "800", INK),
    text(mid, 628, hookEnd, 96, "800", DEEP),

    text(
      mid,
      704,
      "Every time, however many times you do it.",
      40,
      "normal",
      MUTED
    ),
  ];

  // The ladder. Friends on the left, money on the right, one rule between.
  rungs.forEach((rung, index) => {
    const y = ladderTop + index * rowH;
    const last = index === rungs.length - 1;
    parts.push(
      `<rect x="150" y="${y}" width="${W - 300}" height="${rowH - 16}" rx="28" fill="${
        last ? ORANGE : PAPER
      }"/>`,
      text(
        210,
        y + 76,
        `${rung.friends} friends`,
        52,
        "700",
        last ? PAPER : INK,
        "start"
      ),
      text(
        W - 210,
        y + 76,
        `${naira(rung.gets)} back`,
        56,
        "800",
        last ? PAPER : DEEP,
        "end"
      )
    );
  });

  parts.push(
    text(mid, noteAt, "It does not stop there. There is no limit.", 42, "700", INK),

    // The one condition, said plainly rather than in small print, because a
    // promise somebody finds out about later is worse than one they read.
    text(
      mid,
      noteAt + 58,
      "They have to order and pay. It comes back on your own order.",
      34,
      "normal",
      MUTED
    ),

    // The square, on white, so it reads off a printed page.
    `<rect x="${mid - QR / 2 - 70}" y="${plateTop}" width="${QR + 140}" height="${plateHeight}" rx="48" fill="${PAPER}"/>`,
    `<g transform="translate(${mid - QR / 2} ${qrTop})">${square}</g>`,
    text(mid, scanAt, "Scan to start", 50, "800", INK),
    text(mid, scanAt + 56, "It opens a chat with us on WhatsApp", 32, "normal", MUTED),

    text(mid, siteAt, site, 46, "800", DEEP),
    text(mid, lastAt, "Pan-Atlantic University", 32, "normal", MUTED)
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join(
    ""
  )}</svg>`;

  mkdirSync(OUT, { recursive: true });
  const file = `${OUT}/invite-friends.png`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  writeFileSync(`${OUT}/invite-friends.svg`, svg);
  console.log(`${file}  ${W}x${H}  ->  ${link}`);
}

flyer().catch((problem) => {
  console.error(problem);
  process.exit(1);
});
