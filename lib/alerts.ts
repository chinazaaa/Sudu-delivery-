/**
 * Reading a payment alert, and finding the order it belongs to.
 *
 * Every alert this shop gets comes from Catlog, whatever bank the money
 * actually moved through, so there is one wording to read rather than one
 * per bank. What it carries is an amount, the name on the paying account,
 * and a time.
 *
 * What it does not carry is the narration. The shop asks people to type
 * their order number into the transfer and Catlog does not pass that on, so
 * nothing here can identify an order exactly. Everything below produces a
 * suggestion for somebody to agree with, and the page says so.
 */
export type Alert = {
  /** In naira, whole, the way an order's total is stored. */
  amount: number;
  /** The name on the account that paid, which is their bank's spelling and
   *  usually fuller than the name in the customer book. */
  payer: string;
};

/**
 * What an alert says, out of its subject and its words.
 *
 * The subject alone carries both facts and is the same whether the alert
 * was forwarded by hand or by a rule, so it is read first. The body is the
 * fallback, because a subject can be truncated by whatever passed it along.
 */
export function readAlert(subject: string, text: string): Alert | null {
  // Fwd:, Re:, FW: and the rest, however many times it has been passed
  // along. The name begins after them, and without this the paying account
  // comes out as "Fwd: BEST ETI-INYENE IDONGESIT".
  const bare = String(subject ?? "").replace(/^(\s*(?:fwd?|re|fw)\s*:\s*)+/i, "");
  const fromSubject = said(bare);
  if (fromSubject) return fromSubject;
  return said(String(text ?? ""));
}

/*
 * "BEST ETI-INYENE IDONGESIT just paid you NGN 11,700.00", and the body's
 * "You just received NGN 11,700.00 from BEST ETI-INYENE IDONGESIT."
 *
 * Both orders of the same two facts, because the subject leads with the
 * payer and the sentence leads with the money.
 */
function said(text: string): Alert | null {
  const flat = text.replace(/\s+/g, " ").trim();

  /*
   * Name-shaped characters only, rather than anything that is not a full
   * stop.
   *
   * A forwarded email carries its own header in the body, so a loose
   * capture walks backwards out of the sentence and swallows "shop>
   * Subject:" along with the name. Letters, spaces, hyphens, apostrophes
   * and the full stops in initials are what a name is made of, and none of
   * the furniture around it is.
   */
  const NAME = "[A-Za-z][A-Za-z'\u2019.\\- ]{1,79}?";

  const paidYou = flat.match(
    new RegExp(`(${NAME})\\s+just paid you\\s+NGN\\s*([\\d,]+(?:\\.\\d{2})?)`, "i")
  );
  if (paidYou) {
    const amount = toNaira(paidYou[2]);
    if (amount !== null) return { amount, payer: tidyName(paidYou[1]) };
  }

  const received = flat.match(
    new RegExp(
      `received\\s+NGN\\s*([\\d,]+(?:\\.\\d{2})?)\\s+from\\s+(${NAME})\\s*(?:\\.|Your|$)`,
      "i"
    )
  );
  if (received) {
    const amount = toNaira(received[1]);
    if (amount !== null) return { amount, payer: tidyName(received[2]) };
  }

  return null;
}

/**
 * "11,700.00" as 11700.
 *
 * Kobo is dropped rather than rounded: an order's total is whole naira, and
 * a transfer is never for a fraction of one. Anything that is not a number
 * is nothing, not a zero, because an alert read as zero naira would match
 * every free order in the book.
 */
function toNaira(said: string): number | null {
  const amount = Number(String(said ?? "").replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.floor(amount);
}

/** A name without the forwarding furniture around it. */
function tidyName(said: string): string {
  return String(said ?? "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The words of a name, for comparing two spellings of one person.
 *
 * A transfer carries what the bank has: "BEST ETI-INYENE IDONGESIT". The
 * book has whatever they typed at checkout, which may be "BEST", or their
 * first name, or their surname first. So the comparison is on the words
 * rather than on the whole string, and any word in common is a reason to
 * look.
 *
 * Two letters and under are dropped. Initials and the "of" in a name match
 * everybody, and a suggestion that matches everybody is noise.
 */
export function nameWords(name: string): string[] {
  return String(name ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 2);
}

/** How many words two spellings of a name share. */
export function nameOverlap(a: string, b: string): number {
  const mine = new Set(nameWords(a));
  return nameWords(b).filter((word) => mine.has(word)).length;
}

export type Candidate = {
  id: string;
  orderNo: number | null;
  name: string;
  total: number;
  createdAt: string;
  /** Words shared between the paying account and the name on the order. */
  shared: number;
  /** This order's number appears in the alert itself. Dormant today,
   *  because Catlog does not pass the narration on, and true the moment it
   *  starts to. */
  named: boolean;
};

/**
 * Whether an order's number is written anywhere in the alert.
 *
 * The shop asks people to type their order number into the transfer and
 * Catlog does not pass it on, so this finds nothing today. It is here
 * because the asking stays, and the day the narration comes through this
 * turns a suggestion into a near certainty without anybody changing
 * anything.
 *
 * Looked for as a number on its own rather than under a label, because the
 * label is the part nobody can predict: whatever Catlog ends up calling it,
 * 1036 is still 1036. Whole numbers only, so an order number cannot be
 * found inside the digits of a wallet balance.
 */
export function mentions(text: string, orderNo: number | null): boolean {
  if (orderNo === null || !Number.isFinite(orderNo)) return false;
  // Commas out first: a narration of "1036" is plain, but the amounts
  // around it are grouped, and 1,036 should read as this number too.
  const flat = String(text ?? "").replace(/,/g, "");
  return new RegExp(`(?<![\\d.])${orderNo}(?![\\d.])`).test(flat);
}

/**
 * The orders an alert could be about, best first.
 *
 * Only ones for exactly that amount, because a transfer is for what it is
 * for and an order is charged what it is charged. Among those, the ones
 * whose name shares a word with the paying account come first, then the
 * nearest in time: somebody pays within the hour of ordering, so an order
 * from last week for the same amount is the less likely of the two.
 *
 * Several come back on purpose. Two people paying the same amount on the
 * same run is a real Saturday, and the honest answer there is both of them
 * and a person to choose, rather than a guess presented as a fact.
 */
export function likelyOrders(
  alert: Alert,
  orders: {
    id: string;
    order_no: number | null;
    customer_name: string;
    total: number;
    created_at: string;
  }[],
  at: number = Date.now(),
  /** The alert's own words, for finding an order number in them. Left out
   *  where there are none to read, which changes nothing today. */
  words = ""
): Candidate[] {
  return orders
    .filter((order) => Number(order.total) === alert.amount)
    .map((order) => ({
      id: order.id,
      orderNo: order.order_no,
      name: order.customer_name,
      total: Number(order.total),
      createdAt: order.created_at,
      shared: nameOverlap(alert.payer, order.customer_name),
      named: mentions(words, order.order_no),
    }))
    .sort((a, b) => {
      // An order named in the alert is the one, whatever the names say.
      if (a.named !== b.named) return a.named ? -1 : 1;
      if (b.shared !== a.shared) return b.shared - a.shared;
      const near = (one: Candidate) => {
        const when = new Date(one.createdAt).getTime();
        return Number.isNaN(when) ? Number.MAX_SAFE_INTEGER : Math.abs(at - when);
      };
      return near(a) - near(b);
    });
}
