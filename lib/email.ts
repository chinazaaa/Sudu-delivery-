import { safeSettings } from "./settings";

/**
 * Email to the admins, and only to the admins. Customers are messaged on
 * WhatsApp by hand, as the brief asks; email here is the thing that says "go
 * and look", so it never reaches a customer.
 *
 * Resend is the provider because it needs one API key and no server. With no
 * key set, sending is skipped rather than failing whatever asked for it: an
 * order must never be lost because a notification could not go out.
 */
export type EmailKind = "order" | "group" | "abandoned";

export async function emailAdmins(
  subject: string,
  body: string,
  /** The same message with a layout. Clients that refuse it get the words. */
  html?: string,
  /** What this one is about, so it can be turned off on its own. An
   *  afternoon of testing should not cost somebody every notification they
   *  have, and a real order arriving in the middle of that inbox is one
   *  nobody sees. */
  kind?: EmailKind
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const settings = await safeSettings();
  if (kind && muted(settings.email_mute).includes(kind)) return false;

  const to = adminEmails(settings.admin_emails);
  if (to.length === 0) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      // Now that the order waits for this, it cannot be allowed to wait for
      // ever: a provider having a bad night must not hold up a checkout.
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Sudu Delivery <onboarding@resend.dev>",
        to,
        subject,
        text: body,
        ...(html ? { html } : {}),
      }),
    });
    return response.ok;
  } catch {
    // A provider being down is not a reason to fail an order.
    return false;
  }
}

/** One address per line, or separated by commas. Anything that is not an
 *  address is dropped rather than sent, so a stray word in the box cannot
 *  fail a whole email. */
export function emailList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,;]+/)
        .map((line) => line.trim())
        .filter((line) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line))
    ),
  ];
}

/** The same thing, named for the one place it started: the addresses this
 *  shop's own notifications go to. */
export function adminEmails(raw: string): string[] {
  return emailList(raw);
}

/** The kinds turned off. Empty is all of them on, as it always was. */
export function muted(raw: string): EmailKind[] {
  return raw
    .split(/[\n,;]+/)
    .map((one) => one.trim().toLowerCase())
    .filter((one): one is EmailKind =>
      one === "order" || one === "group" || one === "abandoned"
    );
}

/**
 * One email, written by hand in admin and sent to whoever it names.
 *
 * Everything else in this file writes to us. This is the other direction: a
 * letter to a parent, a quote to a hall, an invoice with the PDF on it. It is
 * deliberately a thin wrapper over Resend rather than a template system,
 * because the whole point is that the HTML is written in the box and sent as
 * it stands.
 */
export type Attachment = { filename: string; content: string };

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; why: string };

/**
 * How much can be attached to one email, all the files added together.
 *
 * Resend will carry forty megabytes and Gmail will accept twenty five, so
 * neither of those is the ceiling here. The server action is: a form posted
 * to this app is capped at ten megabytes, and a file that goes over it is
 * refused by the framework before any of this code runs, with an error
 * nobody can act on. Eight leaves room for the rest of the form.
 */
export const ATTACHMENT_LIMIT = 8 * 1024 * 1024;

export async function sendOneEmail(args: {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  /** The same thing without the markup, for a client that will not show it
   *  and for the spam filters that count an HTML-only email against you. */
  text?: string;
  attachments?: Attachment[];
  /** Where a reply should go, when it is not the from address. */
  replyTo?: string;
  /**
   * Headers the message needs beyond the ordinary ones.
   *
   * Only really for In-Reply-To and References, which are what keep an
   * answer in the same conversation in whoever's mail client is reading
   * it. Without them a reply opens as a fresh email below the thing it
   * answers, with nothing to say it is an answer.
   */
  headers?: Record<string, string>;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, why: "No RESEND_API_KEY is set on this deployment." };
  if (args.to.length === 0) return { ok: false, why: "No address to send it to." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      // Long enough for a few megabytes of PDF on a bad connection, short
      // enough that a dead provider does not hold the page open all day.
      signal: AbortSignal.timeout(60000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Sudu Delivery <onboarding@resend.dev>",
        to: args.to,
        ...(args.cc && args.cc.length > 0 ? { cc: args.cc } : {}),
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        ...(args.headers && Object.keys(args.headers).length > 0
          ? { headers: args.headers }
          : {}),
        subject: args.subject,
        html: args.html,
        ...(args.text ? { text: args.text } : {}),
        ...(args.attachments && args.attachments.length > 0
          ? { attachments: args.attachments }
          : {}),
      }),
    });

    const answer: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const said =
        answer && typeof answer === "object" && "message" in answer
          ? String((answer as { message: unknown }).message)
          : `Resend said ${response.status}.`;
      return { ok: false, why: said };
    }

    const id =
      answer && typeof answer === "object" && "id" in answer
        ? String((answer as { id: unknown }).id)
        : "";
    return { ok: true, id };
  } catch (problem) {
    return {
      ok: false,
      why: problem instanceof Error ? problem.message : "Could not reach Resend.",
    };
  }
}

/** The words out of a piece of HTML, for the plain text copy. Rough on
 *  purpose: it is a fallback, not a renderer. */
export function wordsFrom(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
