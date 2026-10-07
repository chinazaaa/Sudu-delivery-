/**
 * The flyers people forward, rather than the ones that go on a wall.
 *
 * The A4 flyers in this folder are built around a square somebody scans
 * from across a corridor. On WhatsApp there is nothing to scan: the picture
 * is already on the phone that would be doing the scanning, and a QR code
 * there is a dead square asking somebody to fetch a second phone. So these
 * carry the address as words, big enough to read and short enough to type,
 * and they are 4:5, which is as tall as WhatsApp will show without cropping
 * the bottom off in the chat list.
 *
 * One script for all of them because they are one design with the words
 * swapped, and four scripts drifting apart is how the hostel flyer and the
 * promoter flyer ended up with different footers.
 *
 *   npx tsx scripts/share-cards.ts
 *   npx tsx scripts/share-cards.ts --only match
 *
 * Nothing here reads the database: scripts cannot see .env.local. What is
 * in `cards` is what the occasions and promoters tables held when it was
 * written, so check a figure before sending a hundred of anything.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

/** 1080 by 1350: WhatsApp shows 4:5 whole, and 1:1 crops the last line. */
const W = 1080;
const H = 1350;
const PAD = 72;

const ORANGE = "#ff5a1f";
const DEEP = "#c2400e";
const INK = "#14110f";
const SHELL = "#fff1ea";
const MUTED = "#6b6360";

const OUT = "marketing/flyers";
const SITE = "sudu.store";
const PHONE = "0903 217 5147";

const args = process.argv.slice(2);
const only = (() => {
  const at = args.indexOf("--only");
  const said = at === -1 ? "" : (args[at + 1] ?? "");
  return said.startsWith("--") ? "" : said;
})();

type Card = {
  /** The filename, and what --only matches. */
  key: string;
  /** Small, over the headline: what sort of thing this is. */
  kicker: string;
  /** The headline, already broken into lines. Nothing here wraps on its
   *  own: a line that wrapped would push the panel into the footer. */
  head: string[];
  /** Under the headline, in grey. */
  sub?: string;
  /** The one coloured line above the panel, where a card has a time on it. */
  urgent?: string;
  /** What is in the orange panel, where the card is just a list. */
  panel?: string[];
  /**
   * Where the card is selling something, the panel is rows instead: what
   * it is called, what is in it, and what it costs. A box nobody can price
   * is a box nobody orders, and "see the website" on a picture somebody is
   * forwarding is a question they have to ask before they can buy.
   */
  rows?: { name: string; what: string; price: number }[];
  /** Grey, under the panel. */
  note?: string;
  /** A code somebody has to type. Drawn as a box rather than a line,
   *  because the whole card is asking for those few letters and a word in
   *  a sentence is a word people read past. */
  code?: string;
  /** The line under the code box, saying where it goes. */
  codeNote?: string;
  /** The sentence the card is for, in black, above the footer. */
  ask: string;
};

const cards: Card[] = [
  {
    key: "shop",
    kicker: "Delivery to PAU",
    head: ["Anything from", "outside, brought", "to your block."],
    panel: [
      "Restaurants",
      "The local market",
      "Skincare and everything else",
    ],
    note: "One delivery fee, however many places it comes from.",
    ask: "Order at sudu.store, or message us.",
  },
  {
    key: "matriculation",
    kicker: "Matriculation",
    head: ["Mark the day", "from anywhere."],
    sub: "Send one to them, or order your own.",
    rows: [
      {
        name: "Small celebration",
        what: "Cupcakes, ice cream, balloons and a card. One person.",
        price: 30000,
      },
      {
        name: "Cake and treats",
        what: "A six inch cake, ice cream, balloons and a card.",
        price: 45000,
      },
      {
        name: "Pizza and ice cream",
        what: "Two pizzas, wings and ice cream. Four or five people.",
        price: 35000,
      },
      {
        name: "Feed the whole block",
        what: "A pot of chicken, two pizzas, doughnuts, ice cream.",
        price: 55000,
      },
      {
        name: "The whole day",
        what: "Cake, Ferrero Rocher, balloons and a card. A block.",
        price: 60000,
      },
    ],
    note: "Delivery is in the price. Swap anything inside for something else.",
    // Not the address: the footer carries that, and printing it twice
    // reads as a card that does not know what it already said.
    ask: "Order from anywhere. We carry it to their block.",
  },
  {
    key: "match",
    kicker: "Match day",
    head: ["Liverpool", "v Man City"],
    sub: "At Anfield, Sunday 11 October",
    urgent: "Kick-off 4:30pm",
    rows: [
      {
        name: "The Pizza Box",
        what: "Two pizzas, wings and a drink each.",
        price: 32900,
      },
      {
        name: "The Chicken Box",
        what: "Eight pieces, rice, chips and a drink each.",
        price: 32900,
      },
      {
        name: "The Cant-Agree Box",
        what: "A pizza, two Whoppers and fries. Two restaurants, one fee.",
        price: 34196,
      },
    ],
    note: "Each one feeds four to five. Delivery is in the price.",
    ask: "Order by 11am and it beats the whistle.",
  },
  {
    /*
     * The week's flyer. Four or five names people recognise, a day, a
     * deadline and a code: everything else is the website's job.
     *
     * No prices. A card with prices on it is out of date the moment a menu
     * moves, and this one is forwarded for a week rather than printed, so
     * the one number on it is the one we are promising.
     */
    key: "saturday",
    kicker: "This Saturday",
    head: ["₦1,000 off", "your delivery."],
    sub: "Order before 10am, Saturday 10 October",
    panel: [
      "D.O Bowls",
      "Yin Yang",
      "Burger King",
      "Chicken Republic",
      "KFC",
    ],
    note: "And every other restaurant you already order from.",
    code: "SATURDAY",
    codeNote: "Type it in at checkout.",
    ask: "One run, Saturday. Order before 10am.",
  },
  {
    key: "promoters",
    kicker: "Promoters wanted",
    head: ["Get paid for", "every order", "you bring."],
    panel: [
      "₦500 on every order they pay for",
      "₦1,000 when it is a box",
      "They stay yours. Every time they order.",
    ],
    note: "No shift. No stock. Just send people.",
    ask: "Message us and we set you up today.",
  },
];

const safe = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const at = (
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

const text = (
  y: number,
  said: string,
  size: number,
  weight: string,
  fill: string
) => at(W / 2, y, said, size, weight, fill);

const naira = (amount: number) => `\u20a6${amount.toLocaleString("en-NG")}`;

/** The Sudu bag, the same drawing as the A4 flyers. */
const mark = (x: number, y: number, size: number) => `
  <g transform="translate(${x} ${y}) scale(${size / 512})">
    <rect width="512" height="512" rx="116" fill="${ORANGE}"/>
    <path d="M116 180h280l-27 248a44 44 0 0 1-44 39H187a44 44 0 0 1-44-39z" fill="${SHELL}"/>
    <path d="M196 180v-26a60 60 0 0 1 120 0v26" fill="none" stroke="${SHELL}" stroke-width="28" stroke-linecap="round"/>
    <path d="M316 272C316 240 202 240 202 294C202 338 316 330 316 372C316 426 202 426 202 392"
          fill="none" stroke="${ORANGE}" stroke-width="34" stroke-linecap="round"/>
  </g>`;

async function card(one: Card): Promise<void> {
  /*
   * Measured down from the top and up from the bottom, meeting at the
   * panel, rather than every line being a number somebody guessed. The
   * cards carry two to five lines in the panel and two to three in the
   * headline, and fixed offsets printed the longest one over its own
   * footer.
   */
  let y = 128;
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${SHELL}"/>`];

  parts.push(mark(W / 2 - 39, 64, 78));
  parts.push(text((y += 60), "Sudu", 44, "800", INK));
  parts.push(text((y += 38), one.kicker, 26, "normal", MUTED));

  y += 78;
  for (const line of one.head) {
    parts.push(text(y, line, 58, "800", INK));
    y += 68;
  }

  if (one.sub) {
    y += 8;
    parts.push(text(y, one.sub, 28, "normal", MUTED));
    y += 42;
  }

  if (one.urgent) {
    y += 10;
    parts.push(text(y, one.urgent, 36, "800", DEEP));
    y += 44;
  }

  // The footer is measured up from the paper's edge, and the panel gets
  // what is left between it and the headline.
  const tagAt = H - 56;
  const reachAt = H - 104;
  const siteAt = H - 158;
  const askAt = siteAt - 86;

  const ROW = 88;
  const panelHeight = one.rows
    ? 30 + one.rows.length * ROW
    : 44 + (one.panel ?? []).length * 58;
  /*
   * The panel floats in whatever is left between the headline and the
   * sentence above the footer, rather than sitting straight under the
   * headline. A three line panel on a tall headline otherwise left a hand's
   * width of empty cream above the footer, which reads as a card somebody
   * forgot to finish.
   */
  // The note is a line of its own under the panel, and the gap plus the
  // line is 76. Counting only the gap is how a five row panel printed its
  // note straight through the sentence above the footer.
  // The code box and its line, when there is one: 20 above it, 88 of box,
  // and 40 more for the line under it.
  const codeHeight = one.code ? 20 + 88 + (one.codeNote ? 40 : 0) : 0;
  const blockHeight = panelHeight + (one.note ? 76 : 0) + codeHeight;
  const room = askAt - 30 - y;
  const panelTop = y + Math.max(28, Math.round((room - blockHeight) / 2));

  parts.push(
    `<rect x="${PAD}" y="${panelTop}" width="${W - PAD * 2}" height="${panelHeight}" rx="32" fill="${ORANGE}"/>`
  );
  if (one.rows) {
    const left = PAD + 36;
    const right = W - PAD - 36;
    one.rows.forEach((row, n) => {
      const top = panelTop + 54 + n * ROW;
      parts.push(at(left, top, row.name, 30, "800", "#ffffff", "start"));
      parts.push(at(right, top, naira(row.price), 30, "800", "#ffffff", "end"));
      parts.push(at(left, top + 36, row.what, 22, "normal", "#ffe3d6", "start"));
    });
  } else {
    (one.panel ?? []).forEach((line, n) => {
      parts.push(text(panelTop + 60 + n * 58, line, 34, "700", "#ffffff"));
    });
  }

  if (one.note) {
    parts.push(text(panelTop + panelHeight + 44, one.note, 26, "normal", MUTED));
  }

  if (one.code) {
    const top = panelTop + panelHeight + (one.note ? 76 : 0) + 20;
    const wide = 440;
    parts.push(
      `<rect x="${(W - wide) / 2}" y="${top}" width="${wide}" height="88" rx="22" ` +
        `fill="none" stroke="${DEEP}" stroke-width="5" stroke-dasharray="14 10"/>`
    );
    parts.push(text(top + 60, one.code, 50, "800", DEEP));
    if (one.codeNote) {
      parts.push(text(top + 88 + 32, one.codeNote, 24, "normal", MUTED));
    }
  }

  parts.push(text(askAt, one.ask, 32, "800", INK));
  parts.push(text(siteAt, SITE, 44, "800", INK));
  parts.push(text(reachAt, `WhatsApp ${PHONE}`, 28, "normal", MUTED));
  parts.push(
    text(tagAt, "Bridging the gap between PAU and the outside world", 24, "normal", MUTED)
  );

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    parts.join("") +
    `</svg>`;

  const path = `${OUT}/share-${one.key}.png`;
  await sharp(Buffer.from(svg)).png().toFile(path);
  console.log(`${one.key.padEnd(16)} ${path}`);

  // The panel's last line and the sentence above the footer must not meet.
  const bottomOfNote = panelTop + panelHeight + (one.note ? 76 : 0) + codeHeight;
  if (bottomOfNote > askAt - 24) {
    console.log(`  ${one.key}: the words are too tall for the card.`);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const wanted = only ? cards.filter((one) => one.key === only) : cards;
  if (wanted.length === 0) {
    console.log(`No card called "${only}". Try: ${cards.map((c) => c.key).join(", ")}`);
    return;
  }
  for (const one of wanted) await card(one);
  writeFileSync(`${OUT}/share-cards.txt`, `${SITE}\nWhatsApp ${PHONE}\n`);
  console.log("");
  console.log(`${wanted.length} cards, 1080x1350, in ${OUT}.`);
}

void main();
