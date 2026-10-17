/**
 * Names as they are read, not as they were shouted.
 *
 * Menus arrive the way the kitchen keeps them, and some kitchens keep
 * everything in capitals. On a card beside a dish typed properly it reads as
 * a different shop: ALFREDO next to Alfredo, and a list of sixty where a
 * dozen are shouting at you.
 *
 * The rule is deliberately narrow. A name is only touched when the whole of
 * it is shouting, which is the one case nobody chose on purpose: a name with
 * a single lower case letter anywhere in it was typed by somebody who meant
 * it, and iPhone, BBQ, 7UP and 2PCS all survive untouched because of it.
 */

/** Words that stay down in the middle of a name. Not a style guide: the
 *  handful that read wrong with a capital, and nothing else. */
const SMALL = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

/** Said in capitals by everybody, including the people who write lower case. */
const ACRONYM = /^(bbq|pcs|g|kg|ml|cl|cl|xl|xxl|uht|diy|vip|sms|tv|dj|pau)$/i;

/** Is the whole of this shouting? A run of four capitals and not one lower
 *  case letter anywhere: a name that looks like a word rather than a code. */
export function isShouting(name: string): boolean {
  return !/[a-z]/.test(name) && /[A-Z]{4,}/.test(name);
}

/**
 * All one case, either way.
 *
 * A menu pasted in comes out however it was kept, and some kitchens keep it
 * in capitals while others keep it in lower case. Neither was a decision
 * about how the name should read, so both are tidied. A name with both
 * cases in it was typed by somebody who meant it, and is left exactly as
 * it came: that is what keeps iPhone, BBQ Chicken and 2PCS Chicken whole.
 */
export function oneCase(name: string): boolean {
  if (!/[a-zA-Z]/.test(name)) return false;
  return isShouting(name) || !/[A-Z]/.test(name);
}

/** One word, cased. */
function word(said: string, first: boolean): string {
  // Anything with a digit in it keeps its shape: 2PCS, 250G, 7UP, 510G.
  if (/\d/.test(said)) return said;
  if (ACRONYM.test(said)) return said.toUpperCase();

  const low = said.toLowerCase();
  if (!first && SMALL.has(low)) return low;

  /*
   * Both halves of a hyphen, not just the first.
   *
   * A hyphen joins two words and each of them is a word: RX-ADVANCED came
   * back as "Rx-advanced", which is neither how it was written nor how
   * anybody would write it. A slash is the same thing with a different
   * mark. Everything else inside the word, apostrophes included, is left
   * alone, because "Doughn'T" is the other way to get this wrong.
   */
  return low
    .split(/([-/])/)
    .map((part) => {
      // The first letter there is, which is not always the first
      // character: ®oreo would otherwise come back untouched.
      const at = part.search(/[a-z]/);
      if (at < 0) return part;
      return part.slice(0, at) + part.charAt(at).toUpperCase() + part.slice(at + 1);
    })
    .join("");
}

/**
 * A name kept all in one case, said normally. Everything else exactly as
 * it came.
 */
export function tidyName(name: string): string {
  const said = name.trim();
  if (!oneCase(said)) return said;

  let seen = false;
  return said
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === "") return part;
      const out = word(part, !seen);
      seen = true;
      return out;
    })
    .join("");
}
