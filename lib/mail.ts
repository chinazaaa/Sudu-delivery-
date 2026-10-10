import { db } from "./supabase";

/**
 * Letters to the shop, and what was said back.
 *
 * Mail to hello@sudu.store has always arrived at Resend and could only be
 * read there: a second place to remember to look, and no way to answer from
 * the screen where everything else about that person already is. This is
 * the same post, in admin, with a box to reply from.
 */
/**
 * The address the shop reads, and the one a reply should come back to.
 *
 * Not the address replies are sent *from*: Resend sends from whatever this
 * deployment is set up with, which may be a no-reply. Reply-To is what a
 * mail client uses when somebody presses reply, and it has to be the
 * address that actually arrives here.
 */
export const READS_AT = process.env.MAIL_REPLY_TO || "hello@sudu.store";

/**
 * Where bank alerts are forwarded, which is not where people write from.
 *
 * Both arrive through the same webhook, because Resend receives for the
 * whole domain, and both are worth reading in the same place. They are not
 * worth reading in the same list: a shop gets a handful of letters a week
 * and an alert per payment, so mixed together the letters are buried by the
 * end of a Saturday.
 */
export const ALERTS_AT = process.env.MAIL_ALERTS_AT || "payments@sudu.store";

/**
 * Whether a letter is a forwarded alert rather than somebody writing.
 *
 * Read off who it was sent to. The From line is the bank, or Gmail, or
 * whatever the forwarding did to it, and none of those is a thing to sort
 * on; the address it was sent to is the decision the shop made.
 */
export function isAlert(to: string): boolean {
  const at = ALERTS_AT.toLowerCase();
  return at !== "" && String(to ?? "").toLowerCase().includes(at);
}

export type Attachment = {
  id: string;
  filename: string;
  content_type: string;
  size: number;
};

export type Letter = {
  id: string;
  emailId: string;
  messageId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  text: string;
  html: string;
  attachments: Attachment[];
  /** What the sending domain said about itself, worth seeing beside a
   *  letter claiming to be a bank. */
  checks: { spf: string; dkim: string; dmarc: string };
  receivedAt: string;
  readAt: string | null;
  repliedAt: string | null;
  doneAt: string | null;
};

export type Reply = { id: string; body: string; sentAt: string };

/* The columns, named once. A letter is read in three places and a select
 * written out three times is three places for a column to be forgotten. */
const COLUMNS =
  "id, email_id, message_id, from_addr, to_addr, cc_addr, subject, text_body, " +
  "html_body, attachments, spf, dkim, dmarc, received_at, read_at, replied_at, done_at";

function toLetter(row: Record<string, unknown>): Letter {
  const said = (key: string) => String(row[key] ?? "");
  return {
    id: said("id"),
    emailId: said("email_id"),
    messageId: said("message_id"),
    from: said("from_addr"),
    to: said("to_addr"),
    cc: said("cc_addr"),
    subject: said("subject"),
    text: said("text_body"),
    html: said("html_body"),
    attachments: Array.isArray(row.attachments)
      ? (row.attachments as Attachment[])
      : [],
    checks: { spf: said("spf"), dkim: said("dkim"), dmarc: said("dmarc") },
    receivedAt: said("received_at"),
    readAt: (row.read_at as string | null) ?? null,
    repliedAt: (row.replied_at as string | null) ?? null,
    doneAt: (row.done_at as string | null) ?? null,
  };
}

/**
 * The post, newest first.
 *
 * Tolerant of a database without the table, like every other read that runs
 * on a page somebody opens: no mail is the right answer for a shop that has
 * not had the migration run, because that shop has none.
 */
export async function everything(limit = 200): Promise<Letter[]> {
  try {
    const { data, error } = await db()
      .from("mail")
      .select(COLUMNS)
      .order("received_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(toLetter);
  } catch {
    return [];
  }
}

/** Letters somebody wrote. Alerts are their own list. */
export async function inbox(limit = 200): Promise<Letter[]> {
  return (await everything(limit)).filter((one) => !isAlert(one.to));
}

/** Forwarded bank alerts, newest first. */
export async function alerts(limit = 200): Promise<Letter[]> {
  return (await everything(limit)).filter((one) => isAlert(one.to));
}

export async function oneLetter(id: string): Promise<Letter | null> {
  try {
    const { data, error } = await db()
      .from("mail")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return toLetter(data as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function repliesTo(mailId: string): Promise<Reply[]> {
  try {
    const { data, error } = await db()
      .from("mail_replies")
      .select("id, body, sent_at")
      .eq("mail_id", mailId)
      .order("sent_at", { ascending: true });
    if (error) return [];
    return ((data ?? []) as { id: string; body: string; sent_at: string }[]).map(
      (row) => ({ id: row.id, body: row.body, sentAt: row.sent_at })
    );
  } catch {
    return [];
  }
}

/**
 * Letters nobody has dealt with: unanswered and not put aside.
 *
 * Read rather than unread, because reading a letter on a phone at a bus
 * stop is not answering it, and a count that empties itself the moment
 * somebody glances at it is a count that hides work.
 */
export async function waitingMail(): Promise<number> {
  try {
    const { count } = await db()
      .from("mail")
      .select("id", { count: "exact", head: true })
      .is("replied_at", null)
      .is("done_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * The name on a From header, or the address where there is no name.
 *
 * "Kayla <kayla@example.com>" is how nearly every client writes it, and a
 * list of raw From headers is a list nobody can scan.
 */
export function senderName(from: string): string {
  const said = String(from ?? "").trim();
  const named = said.match(/^\s*"?([^"<]*?)"?\s*</);
  const name = (named?.[1] ?? "").trim();
  if (name !== "") return name;
  return addressOf(said) || said;
}

/** Just the address out of a From header, for replying to it. */
export function addressOf(from: string): string {
  const said = String(from ?? "").trim();
  const angled = said.match(/<([^>]+)>/);
  const bare = (angled?.[1] ?? said).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bare) ? bare : "";
}

/**
 * The first line of a letter, for the list.
 *
 * Off the plain text rather than the HTML, because the markup version of
 * "hello" is four hundred characters of table before the word.
 */
export function snippet(text: string, most = 120): string {
  const flat = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length <= most ? flat : `${flat.slice(0, most - 1).trimEnd()}…`;
}

/**
 * What a reply is called.
 *
 * One "Re:" however many times a conversation goes back and forth, because
 * mail clients that add their own are how a subject ends up as Re: Re: Re:
 * Re: an order.
 */
export function replySubject(subject: string): string {
  const said = String(subject ?? "").trim();
  if (said === "") return "Re: your email";
  return /^re:/i.test(said) ? said : `Re: ${said}`;
}

/**
 * Whether the sending domain vouched for this letter.
 *
 * Not a spam filter and not presented as one. It is the one thing worth
 * knowing beside an email claiming to be a bank, and the honest summary is
 * three words rather than a verdict.
 */
export function vouchedFor(checks: { spf: string; dkim: string; dmarc: string }): boolean {
  const ok = (said: string) => String(said ?? "").toLowerCase() === "pass";
  return ok(checks.spf) && ok(checks.dkim);
}
