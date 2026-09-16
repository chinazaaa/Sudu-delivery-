export type ParsedItem = {
  category: string;
  name: string;
  price: number;
  description: string;
  /** False for anything the shop had marked out of stock when it was copied. */
  available: boolean;
};

/** Lines a menu page carries that are not food. */
const NOISE = new Set([
  "add to order",
  "customize",
  "customise",
  "tap to select a size",
  "sort by:",
  "quantity:0",
  "−",
  "+",
]);

/**
 * The word a menu page puts between an item and its description:
 * "BREADSTICKS Bread - Hot and fresh...". Matched greedily and from the right,
 * because an item's own name can contain a dash: "Roasted Chicken - 2PCS
 * Wings - ROASTED CHICKEN ONLY".
 */
const ITEM_LINE =
  /^(.*)\s+(pizza|bread|breads|sides|side|drinks|drink|wings|chicken|dessert|desserts|sauce|extras)\s+-\s*(.*)$/i;

/**
 * Two formats, because people paste what they have.
 *
 * The tidy one, a line per item:
 *     Category | Name | Price | Description
 *
 * And the one you get by selecting a menu page and copying it:
 *     BREADS
 *     BREADSTICKS Bread - Hot and fresh oven-baked Breadsticks
 *     BREADSTICKS
 *
 * where a bare capitalised line is a category, an item carries its type and
 * description after a dash, and the name repeats underneath as a label.
 */
/**
 * Which part of the menu an item belongs to, taken from the word the page puts
 * before the dash. This is more reliable than the headings, because Domino's
 * uses CHICKEN both as a pizza flavour group and as a section of its own: the
 * pizzas under it still say "Pizza -", and the chicken says "Wings -".
 */
const SECTION_OF: Record<string, string> = {
  pizza: "Pizza",
  bread: "Breads",
  breads: "Breads",
  wings: "Chicken",
  chicken: "Chicken",
  sides: "Extras",
  side: "Extras",
  extras: "Extras",
  sauce: "Extras",
  drink: "Drinks",
  drinks: "Drinks",
  dessert: "Desserts",
  desserts: "Desserts",
};

export const CATEGORY_SEPARATOR = " · ";

const PRICE_LINE = /^(?:from\s*)?[₦n]\s*[\d,]+(?:\.\d+)?$/i;
const SOLD_OUT = /^out of stock$/i;

/**
 * A listing copied from a delivery app, where each item is a block of lines
 * and the price sits on its own:
 *
 *     Burgers & sandwiches
 *     Chief Burger
 *     Enjoy a Mighty Chief Burger made with...
 *     ₦5,100
 *     Add
 *
 * The category only appears above the first item under it, so a block of three
 * text lines carries one, and a block of two does not.
 */
function parseBlockText(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  let category = "";
  let buffer: string[] = [];

  const flush = (price: number, available: boolean) => {
    const lines = buffer.filter(Boolean);
    buffer = [];
    if (lines.length === 0) return;

    if (lines.length >= 3) {
      category = lines[0];
      items.push({
        category,
        name: lines[1],
        description: lines.slice(2).join(" "),
        price,
        available,
      });
      return;
    }
    items.push({
      category,
      name: lines[0],
      description: lines[1] ?? "",
      price,
      available,
    });
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim().replace(/\s+/g, " ");
    if (!line) continue;
    // The repeated image caption, not the word itself: an item can be called
    // "Streetwise Chowdeck" and dropping it would take its category with it.
    if (/menu & delivery|order online \|/i.test(line)) continue;
    if (/^(chowdeck|glovo|jumia food|uber eats)$/i.test(line)) continue;
    if (/^(add|customi[sz]e|add to order)$/i.test(line)) continue;

    if (SOLD_OUT.test(line)) {
      flush(0, false);
      continue;
    }
    if (PRICE_LINE.test(line)) {
      flush(toPrice(line), true);
      continue;
    }
    buffer.push(line);
  }

  // A description repeating the name adds nothing on a card.
  return items.map((item) =>
    item.description.toLowerCase() === item.name.toLowerCase()
      ? { ...item, description: "" }
      : item
  );
}

export function parseMenuText(text: string): ParsedItem[] {
  // A listing with prices on their own lines is a different shape entirely.
  if (text.split("\n").some((line) => PRICE_LINE.test(line.trim()))) {
    return parseBlockText(text);
  }
  return parseHeadingText(text);
}

function parseHeadingText(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  let heading = "";

  /** "Pizza · Veggie", or just "Breads" when the heading adds nothing. */
  const category = (section: string) =>
    heading && heading.toLowerCase() !== section.toLowerCase()
      ? `${section}${CATEGORY_SEPARATOR}${heading}`
      : section;

  for (const raw of text.split("\n")) {
    const line = raw.trim().replace(/\s+/g, " ");
    if (!line || line.startsWith("#")) continue;
    if (NOISE.has(line.toLowerCase())) continue;

    if (line.includes("|") || /\t/.test(line)) {
      const parts = line.split(/\s*[|\t]\s*/).map((part) => part.trim());
      const [first, second, third, fourth] = parts;

      // With three or more fields the first is the category.
      const hasCategory = parts.length >= 3;
      const name = hasCategory ? second : first;
      const priceText = hasCategory ? third : second;
      const description = (hasCategory ? fourth : third) ?? "";
      if (!name) continue;

      items.push({
        category: hasCategory ? first : heading,
        name: titleCase(name),
        price: toPrice(priceText),
        description: description.trim(),
        available: toPrice(priceText) > 0,
      });
      continue;
    }

    // A label repeating the item above it. Checked first, because such a label
    // can itself contain a dash and would otherwise read as a new item.
    const previous = items[items.length - 1];
    if (previous && previous.name.toLowerCase() === titleCase(line).toLowerCase()) {
      continue;
    }

    const parts = line.match(ITEM_LINE);
    if (parts) {
      const name = parts[1].trim();
      const section = SECTION_OF[parts[2].toLowerCase()] ?? titleCase(parts[2]);
      const description = parts[3].trim();
      items.push({
        category: category(section),
        name: titleCase(name),
        price: 0,
        description:
          description.toLowerCase() === name.toLowerCase() ? "" : sentence(description),
        available: false,
      });
      continue;
    }
    if (line === line.toUpperCase() && line.split(" ").length <= 3 && !/\d/.test(line)) {
      heading = titleCase(line);
      continue;
    }
    // Anything else with a number in it is probably an item and a price.
    const priced = line.match(/^(.+?)\s+([₦n]?[\d,.]+)$/i);
    if (priced) {
      items.push({
        category: heading,
        name: titleCase(priced[1]),
        price: toPrice(priced[2]),
        description: "",
        available: toPrice(priced[2]) > 0,
      });
    }
  }

  return items;
}

function toPrice(text: string | undefined): number {
  const value = Math.round(Number(String(text ?? "").replace(/[^\d.]/g, "")));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

const ACRONYMS = /^(bbq|pcs|g|ml|cl|kg|sms|vip)$/i;

/** "BBQ MEGA MEAT" reads better as "BBQ Mega Meat" on a card. */
function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      // Anything with a number keeps its shape: 2PCS, 250G, 7UP.
      if (/\d/.test(word)) return word.toUpperCase();
      if (ACRONYMS.test(word)) return word.toUpperCase();
      if (word === "-") return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
}

/** Descriptions copied off a menu are often shouted. */
function sentence(text: string): string {
  if (text !== text.toUpperCase()) return text;
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
