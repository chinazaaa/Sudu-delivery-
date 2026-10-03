/**
 * The bring-a-friend offer, as an image to send on WhatsApp.
 *
 * Not a wall flyer: there is no square to scan, because the message it
 * arrives attached to already carries the link, and a QR code on a picture
 * somebody is holding in their hand is a thing to photograph with the phone
 * they are reading it on. The image's whole job is to make the offer
 * understood in the two seconds before a thumb moves on.
 *
 * The number doing the work is not the thousand, it is "no limit". A flat
 * "₦1,000 off when you refer a friend" is read as a coupon and forgotten; a
 * ladder that visibly keeps going is read as an amount somebody decides the
 * size of. So the page is the ladder.
 *
 * Two shapes, because WhatsApp crops differently in the two places this gets
 * sent. Chat is 4:5, which previews whole without being tapped. Status is
 * 9:16, which fills the screen.
 *
 *   npx tsx scripts/invite-flyer.ts
 *   npx tsx scripts/invite-flyer.ts --back 1500 --per 2
 *   npx tsx scripts/invite-flyer.ts --hook "Feed your friends." --hook2 "Get paid for it."
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

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

const naira = (amount: number): string => `₦${amount.toLocaleString("en-NG")}`;

/** What comes back, and how many paying friends it takes to earn it. */
const back = Math.max(100, Number(valueOf("--back", "1000")) || 1000);
const per = Math.max(1, Number(valueOf("--per", "2")) || 2);

const site = valueOf("--site", "sudu.store");
const hookTop = valueOf("--hook", `Bring ${per} friends.`);
const hookEnd = valueOf("--hook2", `Get ${naira(back)} back.`);

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
 * Four rungs: three reads as a list, five reads as a table, and the last one
 * is far enough out that nothing about it reads as a cap.
 */
const rungs = [per, per * 2, per * 3, per * 10].map((friends) => ({
  friends,
  gets: (friends / per) * back,
}));

/**
 * The page as a stack of blocks, each saying how tall it is before anything
 * is drawn.
 *
 * Written this way because the first cut used fixed offsets and the picture
 * came out with the headline printed through the wordmark and the last two
 * lines through each other. A phone picture is one glance: anything touching
 * anything else is not untidy, it is unreadable. So each block reports a
 * height, the leftover space is shared out as equal gaps, and nothing can
 * land on anything else however the wording changes.
 */
type Block = { height: number; draw: (y: number) => string[] };

async function draw(W: number, H: number, name: string): Promise<void> {
  const mid = W / 2;
  const tall = H / W > 1.5;

  const edge = tall ? 120 : 84;
  const side = tall ? 86 : 72;
  const big = tall ? 100 : 78;
  const rowH = tall ? 138 : 110;

  const header: Block = {
    height: 104 + 92 + 46,
    draw: (y) => [
      mark(mid - 52, y, 104),
      text(mid, y + 104 + 70, "Sudu", tall ? 62 : 54, "800", INK),
      text(
        mid,
        y + 104 + 70 + 44,
        "Food, market and errands, to your block",
        tall ? 31 : 27,
        "normal",
        MUTED
      ),
    ],
  };

  const hook: Block = {
    height: big * 2 + 18 + 62,
    draw: (y) => [
      text(mid, y + big, hookTop, big, "800", INK),
      text(mid, y + big * 2 + 18, hookEnd, big, "800", DEEP),
      text(
        mid,
        y + big * 2 + 18 + 58,
        "Every time. There is no limit.",
        tall ? 38 : 33,
        "700",
        MUTED
      ),
    ],
  };

  const ladder: Block = {
    height: rungs.length * rowH,
    draw: (y) =>
      rungs.flatMap((rung, index) => {
        const top = y + index * rowH;
        const last = index === rungs.length - 1;
        return [
          `<rect x="${side}" y="${top}" width="${W - side * 2}" height="${rowH - 16}" rx="24" fill="${
            last ? ORANGE : PAPER
          }"/>`,
          text(
            side + 42,
            top + (rowH - 16) / 2 + (tall ? 17 : 15),
            `${rung.friends} friends`,
            tall ? 48 : 42,
            "700",
            last ? PAPER : INK,
            "start"
          ),
          text(
            W - side - 42,
            top + (rowH - 16) / 2 + (tall ? 18 : 16),
            `${naira(rung.gets)} back`,
            tall ? 52 : 45,
            "800",
            last ? PAPER : DEEP,
            "end"
          ),
        ];
      }),
  };

  // The condition, at a size somebody reads, rather than as small print.
  // Terms discovered afterwards are worse than terms read up front.
  const terms: Block = {
    height: 90,
    draw: (y) => [
      text(mid, y + 38, "They have to order and pay.", tall ? 40 : 35, "700", INK),
      text(
        mid,
        y + 84,
        "It comes back on your own order.",
        tall ? 35 : 31,
        "normal",
        MUTED
      ),
    ],
  };

  /*
   * What to actually do, because an offer nobody can act on is a poster.
   *
   * One line, and no word about how we know who sent them. That is said in
   * the WhatsApp message this picture is attached to, where it can be put in
   * somebody's own words and changed without redrawing anything. Printing it
   * here would also plant a name in the order note, which is a box that
   * exists for something else.
   */
  const how: Block = {
    height: 56,
    draw: (y) => [
      text(mid, y + 48, `Send them ${site}`, tall ? 48 : 42, "800", DEEP),
    ],
  };

  /*
   * No line naming the university. Everybody this is sent to is already a
   * student here, and a picture read in one glance cannot afford a sentence
   * telling its reader something they know about themselves.
   */
  const blocks = [header, hook, ladder, terms, how];
  const used = blocks.reduce((sum, one) => sum + one.height, 0);
  const gap = Math.max(10, (H - edge * 2 - used) / (blocks.length - 1));

  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${SHELL}"/>`];
  let y = edge;
  for (const block of blocks) {
    parts.push(...block.draw(y));
    y += block.height + gap;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join(
    ""
  )}</svg>`;

  mkdirSync(OUT, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${name}.png`);
  writeFileSync(`${OUT}/${name}.svg`, svg);
  console.log(`${OUT}/${name}.png  ${W}x${H}  gap ${Math.round(gap)}`);
}

async function run(): Promise<void> {
  // Chat previews whole at 4:5; status fills the screen at 9:16.
  await draw(1080, 1350, "invite-friends");
  await draw(1080, 1920, "invite-friends-status");
}

run().catch((problem) => {
  console.error(problem);
  process.exit(1);
});
