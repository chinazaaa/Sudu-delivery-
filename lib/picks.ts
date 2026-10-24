/**
 * What somebody chose, said so nobody has to guess which question it answers.
 *
 * A choice is stored as a bare word: "Regular", "Fries", "Coca-Cola". Three
 * of those in a row on an order tell you a size, a side and a drink were
 * picked, but not which is which, and a free choice reads like noise beside
 * the ones that cost money. So the group the choice came from is carried
 * with it and said out loud: "Size: Regular".
 *
 * The group is only known for a choice whose option is still on the menu.
 * Anything older, or off the menu since, keeps its bare word rather than
 * going missing.
 */
export type Chosen = {
  /** "Size", "Side". Empty when the menu no longer knows. */
  group: string;
  /** "Regular". */
  name: string;
};

/** One choice, with the question it answers when that is known. */
export function saidPick(pick: Chosen): string {
  const group = pick.group.trim();
  const name = pick.name.trim();
  if (group === "" || name === "") return name;
  // A group whose name already says the choice would stutter: a "Regular"
  // out of a group called "Regular" is said once.
  if (group.toLowerCase() === name.toLowerCase()) return name;
  return `${group}: ${name}`;
}

/**
 * Every choice on a line, said out loud, with the bare names as the answer
 * when nothing knows any better.
 */
export function saidPicks(picks: Chosen[] | undefined, choices: string[]): string[] {
  if (picks === undefined || picks.length === 0) return choices;
  return picks.map(saidPick);
}

/** The same, run together for one line of text. */
export function saidPicksLine(
  picks: Chosen[] | undefined,
  choices: string[],
  joiner = ", "
): string {
  return saidPicks(picks, choices).join(joiner);
}
