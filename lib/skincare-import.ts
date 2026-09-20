/**
 * A shop's whole catalogue, read out of the file it was exported as.
 *
 * Two thousand products is not something anybody types in. What comes out of
 * a shop platform is a CSV with a row per product, and the columns it names
 * are the ones this reads: the title, what it costs, who makes it, which part
 * of the shelf it is on, and the file its picture is expected to arrive as.
 *
 * Anything it cannot read is skipped and counted rather than guessed at. A
 * product with no name or no price is not a product.
 */
export type ImportedProduct = {
  name: string;
  price: number;
  brand: string;
  category: string;
  /** The picture's filename, with no folder: "cerave-foaming-cleanser.png".
   *  It is what a photograph uploaded later is matched against. */
  imageFile: string;
  /** Where the picture is now, if the export carried one. It stands in until
   *  the shop's own photographs are uploaded over it. */
  imageUrl: string;
  /** Every shelf the shop files it under. A product is on more than one on
   *  purpose: a cleanser is under Cleansers and under Korean Skin Care, and
   *  a category that has to pick one loses whichever it did not pick. */
  shelves: string[];
  /** Whether the shop has it. Anything not plainly in stock is off, because
   *  a product that cannot be bought is worse on the shelf than missing: it
   *  is an order somebody places and then has to be rung about. */
  available: boolean;
};

export type Import = {
  products: ImportedProduct[];
  /** Rows that could not be read, so a bad file is visibly bad rather than
   *  quietly half imported. */
  skipped: number;
};

/**
 * One row of a CSV, quotes and all.
 *
 * Written out rather than split on commas, because a product called
 * "Cleanser, 200ml" is one field and splitting would make it two, shifting
 * every column after it by one and putting a price where a brand goes.
 */
export function readRow(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let at = 0; at < line.length; at += 1) {
    const ch = line[at];
    if (quoted) {
      // "" inside a quoted field is one quote, not the end of it.
      if (ch === '"' && line[at + 1] === '"') {
        cell += '"';
        at += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  return cells.map((one) => one.trim());
}

/** Splits on newlines that are not inside a quoted field. */
function rowsOf(text: string): string[] {
  const rows: string[] = [];
  let row = "";
  let quoted = false;

  for (let at = 0; at < text.length; at += 1) {
    const ch = text[at];
    if (ch === '"') quoted = !quoted;
    if (!quoted && (ch === "\n" || ch === "\r")) {
      if (row.trim() !== "") rows.push(row);
      row = "";
      // \r\n is one break, not two.
      if (ch === "\r" && text[at + 1] === "\n") at += 1;
      continue;
    }
    row += ch;
  }
  if (row.trim() !== "") rows.push(row);
  return rows;
}

/**
 * The shelves a cell names, tidied and de-duplicated.
 *
 * Commas, semicolons and bars all turn up depending on what exported it, and
 * the same shelf twice in one cell is once.
 */
export function shelvesOf(text: string): string[] {
  const found = text
    .split(/[,;|]/)
    .map((one) => tidyCase(one))
    .filter((one) => one !== "" && one.toLowerCase() !== "all");
  return [...new Set(found)];
}

/**
 * Whether the shop actually has it.
 *
 * A column that is not there at all means everything is in stock, because an
 * export that does not track stock is not saying the shelf is empty.
 */
export function inStock(text: string): boolean {
  const said = text.trim().toLowerCase();
  if (said === "") return true;
  return said === "in_stock" || said === "in stock" || said === "yes" || said === "true";
}

/** The way a shelf list is stored, so a filter is an unambiguous substring. */
export function shelfText(shelves: string[]): string {
  return shelves.length === 0 ? "" : `|${shelves.join("|")}|`;
}

/** The basename, so "images/thing.png" and "thing.png" are the same file. */
export function fileOf(path: string): string {
  return path.split(/[\\/]/).pop()?.trim().toLowerCase() ?? "";
}

/**
 * Naira from whatever the export wrote: "5400.00", "₦5,400", "5400".
 *
 * Rounded, because a shop that prices in kobo is a shop nobody has ever seen
 * and a stray decimal is a product that costs five thousand four hundred and
 * a bit.
 */
export function priceOf(text: string): number {
  const digits = text.replace(/[^\d.]/g, "");
  const value = Number(digits);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

/** Title case, because an export shouting FACIAL CARE is still a heading. */
export function tidyCase(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return "";
  // Left alone unless it is shouting: "CeraVe" and "AHA.BHA.PHA" are how
  // they are written, and lowercasing them is worse than a loud heading.
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function parseProducts(text: string): Import {
  const rows = rowsOf(text);
  if (rows.length === 0) return { products: [], skipped: 0 };

  // Read by the names in the header rather than by position, because the next
  // export will have the columns in another order and a shop that imports
  // sideways is worse than one that refuses.
  const header = readRow(rows[0]).map((one) => one.toLowerCase().replace(/\s+/g, "_"));
  const at = (...names: string[]) => {
    for (const name of names) {
      const found = header.indexOf(name);
      if (found !== -1) return found;
    }
    return -1;
  };

  const columns = {
    name: at("title", "name", "product", "product_title"),
    // The real price, not today's promotion. A sale price imported as the
    // price is a discount that never ends and a margin nobody decided on.
    price: at("original_price", "price", "current_price", "amount", "cost"),
    stock: at("stock_status", "stock", "availability", "available"),
    brand: at("vendor", "brand", "make"),
    category: at("product_type", "type", "category", "section"),
    file: at("image_filename", "image_file", "image", "filename"),
    shelves: at("collections", "collection", "tags", "categories"),
    url: at("image_url", "image_src", "src"),
  };

  const products: ImportedProduct[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (const row of rows.slice(1)) {
    const cells = readRow(row);
    const name = (cells[columns.name] ?? "").trim();
    // An export with an empty original price on a product that is not on
    // sale still has to price it, so the asking price stands in.
    const price =
      priceOf(cells[columns.price] ?? "") ||
      priceOf(cells[at("current_price", "price")] ?? "");

    if (name === "" || price <= 0) {
      skipped += 1;
      continue;
    }
    // The same product twice in one file is one product. An export that
    // carries a row per picture would otherwise fill the shelf with copies.
    const key = name.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);

    // The shop's own sections where it has them, and the platform's freeform
    // type only where it does not. The type field is whatever anybody typed
    // into it over the years: "SKIN CARE" and "Skin Care" and a brand name
    // somebody put in the wrong box.
    const shelves = shelvesOf(cells[columns.shelves] ?? "");

    products.push({
      name,
      price,
      brand: (cells[columns.brand] ?? "").trim(),
      shelves,
      // The platform's own freeform type, kept only as the fallback for a
      // product no collection claims. It is whatever anybody typed into that
      // box over the years, which is why it is not the first choice.
      category: tidyCase(cells[columns.category] ?? ""),
      imageFile: fileOf(cells[columns.file] ?? ""),
      imageUrl: (cells[columns.url] ?? "").trim(),
      // Only "in stock" is in stock. A part-stocked product is one somebody
      // orders and then has to be rung about, which is worse than not having
      // seen it at all.
      available: inStock(cells[columns.stock] ?? ""),
    });
  }

  return { products: tidyShelves(products), skipped };
}

/**
 * The shelves worth having, once the whole file has been read.
 *
 * A shop's collections include the ones it uses for plumbing: "Products",
 * "All Products", "Fees products", each holding everything there is. As a
 * filter they narrow nothing, and they push the real shelves off the row, so
 * anything covering most of the catalogue goes.
 *
 * A collection named after a brand goes too. The brand is its own filter and
 * a better one, and the same list twice is one of them in the way.
 */
/**
 * Collections a shop keeps for its own plumbing rather than for shelving.
 *
 * Every platform has them and they all hold everything there is, so as a
 * filter they narrow nothing while taking up the row. Named as well as
 * counted, because a small catalogue has not got enough in it for the
 * counting to tell them apart from a real shelf.
 */
const PLUMBING = new Set([
  "all",
  "all products",
  "products",
  "fees products",
  "home page",
  "frontpage",
  "featured",
  "shop all",
  "catalog",
  "catalogue",
]);

function tidyShelves(products: ImportedProduct[]): ImportedProduct[] {
  if (products.length === 0) return products;

  const count = new Map<string, number>();
  for (const one of products) {
    for (const shelf of one.shelves) count.set(shelf, (count.get(shelf) ?? 0) + 1);
  }

  const brands = new Set(
    products.map((one) => one.brand.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean)
  );
  // Only worth judging on a catalogue big enough to have plumbing in it. On
  // a handful of products every shelf looks like it covers everything,
  // and dropping them would leave nothing to filter by at all.
  const everything = products.length >= 20 ? products.length * 0.7 : Infinity;

  const worth = (shelf: string) =>
    !PLUMBING.has(shelf.toLowerCase()) &&
    (count.get(shelf) ?? 0) < everything &&
    !brands.has(shelf.toLowerCase().replace(/[^a-z0-9]/g, ""));

  return products.map((one) => {
    const shelves = one.shelves.filter(worth);
    return { ...one, shelves, category: shelves[0] ?? one.category };
  });
}
