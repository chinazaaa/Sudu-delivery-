/**
 * Matching photo filenames to menu items.
 *
 * Twenty pizzas photographed on a laptop are named after themselves:
 * "BBQ Chicken.jpg", "meat-lovers-2.png". Rather than tapping each one against
 * its item, we read the filename and work out what it is. Anything we are not
 * sure about is handed back for a person to place, because a photograph on the
 * wrong pizza is worse than no photograph.
 */

export type Candidate = {
  id: string;
  name: string;
  /** The file this one's picture is expected to arrive as, when the
   *  catalogue it came from named it. Two thousand products cannot be
   *  matched by the look of their names, and they do not have to be: the
   *  export already said which file is which. */
  file?: string;
};

export type Match =
  | { file: string; itemId: string; itemName: string; confident: true }
  | { file: string; itemId: null; itemName: null; confident: false };

/** "BBQ_Chicken (2).jpg" to "bbq chicken" */
export function tidy(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/\(\d+\)\s*$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\d+\s*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NOISE = new Set(["pizza", "the", "and", "with", "a", "of", "large", "medium", "small"]);

function words(text: string): string[] {
  const all = text.split(" ").filter(Boolean);
  const meaty = all.filter((w) => !NOISE.has(w));
  // "Pizza.jpg" is all noise; fall back rather than matching everything.
  return meaty.length ? meaty : all;
}

/** 0 to 1. How much of the filename's wording the item name accounts for. */
export function score(filename: string, itemName: string): number {
  const left = words(tidy(filename));
  const right = words(tidy(itemName));
  if (!left.length || !right.length) return 0;
  if (left.join(" ") === right.join(" ")) return 1;

  const hits = left.filter((word) =>
    right.some((other) => other === word || other.startsWith(word) || word.startsWith(other))
  ).length;

  // Both directions, so "chicken" does not score full marks against
  // "chicken supreme feast".
  const covered = hits / left.length;
  const fills = hits / right.length;
  return (covered + fills) / 2;
}

const SURE = 0.75;
const GAP = 0.15;

/**
 * Each file to at most one item, and each item to at most one file. Files are
 * placed best first, so the clearest match claims an item before a vaguer one
 * can take it.
 */
export function matchPhotos(filenames: string[], items: Candidate[]): Match[] {
  // Anything the catalogue already named, claimed outright. It is not a
  // guess and nothing scored can beat it.
  const byFile = new Map<string, Candidate>();
  for (const item of items) {
    const named = (item.file ?? "").trim().toLowerCase();
    if (named !== "") byFile.set(named, item);
  }

  const exact = new Map<string, Candidate>();
  const spoken = new Set<string>();
  for (const file of filenames) {
    const found = byFile.get(file.trim().toLowerCase());
    if (found && !spoken.has(found.id)) {
      spoken.add(found.id);
      exact.set(file, found);
    }
  }

  const left = filenames.filter((file) => !exact.has(file));
  const scored = left.flatMap((file) => {
    const ranked = items
      .map((item) => ({ item, value: score(file, item.name) }))
      .sort((a, b) => b.value - a.value);

    const best = ranked[0];
    const runnerUp = ranked[1];
    if (!best || best.value < SURE) return [];
    // Two items the filename fits equally well is not a match, it is a guess.
    if (runnerUp && best.value - runnerUp.value < GAP && best.value < 1) return [];
    return [{ file, item: best.item, value: best.value }];
  });

  scored.sort((a, b) => b.value - a.value);

  const taken = new Set<string>(spoken);
  const placed = new Map<string, Candidate>(exact);
  for (const row of scored) {
    if (taken.has(row.item.id)) continue;
    taken.add(row.item.id);
    placed.set(row.file, row.item);
  }

  return filenames.map((file) => {
    const item = placed.get(file);
    return item
      ? { file, itemId: item.id, itemName: item.name, confident: true as const }
      : { file, itemId: null, itemName: null, confident: false as const };
  });
}
