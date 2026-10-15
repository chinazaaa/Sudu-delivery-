/**
 * What somebody says they have to spend.
 *
 * Two sentences that look the same and are not: "fifteen k plus delivery"
 * and "thirty thousand all in" are a budget for the food and a budget for
 * the whole bill, and reading one as the other is the chat quoting
 * somebody a figure they never agreed to. Money is the one thing here that
 * must not be guessed at, so where the sentence does not say, this says it
 * does not know and the chat asks.
 */
export type Budget = {
  /** In naira. */
  amount: number;
  /** "food" is before delivery, "all" includes it, "" means they did not
   *  say and somebody has to be asked. */
  kind: "food" | "all" | "";
};

/**
 * The amount, however it was written.
 *
 * "15k", "15,000", "15000", "₦15k" and "fifteen k" are all the same money.
 * Anything under a thousand is read as thousands, because nothing on this
 * menu is a two-figure sum and "I have 15" plainly means fifteen thousand.
 */
export function readBudget(
  said: string,
  /**
   * Whether the chat just asked for a budget.
   *
   * It changes what a bare small number means. Asked "what are you
   * thinking of spending?", "15" is fifteen thousand and nothing else.
   * Found loose in a sentence somebody typed unprompted, "2 medium pizza"
   * is two pizzas, and reading it as a two thousand naira budget would be
   * the chat inventing a constraint nobody set. So small numbers only
   * count where they were asked for.
   */
  asked = false
): Budget | null {
  const flat = String(said ?? "")
    .toLowerCase()
    .replace(/[,₦]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat === "") return null;

  // A number with a k on it wins, because "10k or 15k" is a budget and the
  // bare digits in "pizza 3" are not.
  const withK = flat.match(/(\d+(?:\.\d+)?)\s*k\b/);
  const plain = asked ? flat.match(/\b(\d{1,7})\b/) : flat.match(/\b(\d{3,7})\b/);
  if (!withK && !plain) return null;

  let amount = withK ? parseFloat(withK[1]) * 1000 : Number(plain?.[1] ?? 0);
  // "I have 15" is fifteen thousand. Nothing worth ordering costs fifteen
  // naira, and a budget of fifteen is a budget nobody typed.
  if (amount > 0 && amount < 1000) amount *= 1000;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { amount: Math.round(amount), kind: kindOf(flat) };
}

/** Whether delivery is inside the figure, outside it, or unsaid. */
function kindOf(flat: string): Budget["kind"] {
  if (
    /\b(all in|all-in|altogether|in total|including delivery|with delivery|everything|total)\b/.test(
      flat
    )
  ) {
    return "all";
  }
  if (
    /\b(plus delivery|and delivery|before delivery|excluding delivery|without delivery|on food|for food|for the food|on the food)\b/.test(
      flat
    ) ||
    /\+\s*delivery\b/.test(flat)
  ) {
    return "food";
  }
  return "";
}

/**
 * What is left to spend on food, once the carrying is paid for.
 *
 * Only ever worked out against a fee the shop gave us. A budget that
 * includes delivery has to have it taken off before anything can be
 * suggested, and a budget that does not is already the food figure.
 */
export function toSpend(budget: Budget, fee: number): number {
  if (budget.kind === "all") return Math.max(0, budget.amount - Math.max(0, fee));
  return budget.amount;
}

/** What the whole thing would come to, for saying it back to them. */
export function allIn(budget: Budget, fee: number): number {
  if (budget.kind === "all") return budget.amount;
  return budget.amount + Math.max(0, fee);
}
