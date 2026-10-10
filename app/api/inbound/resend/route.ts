import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { svixSigned } from "@/lib/svix";

export const dynamic = "force-dynamic";

/**
 * Mail to the shop, arriving.
 *
 * Resend posts here the moment something lands at hello@sudu.store. The
 * payload is the envelope only: who it is from, who it is to, the subject,
 * the message id and a description of each attachment. The words themselves
 * come from a second call, which is why this route talks back to Resend
 * before it writes anything.
 *
 * Refused outright without a secret, rather than running openly. This URL is
 * public and anything that writes rows from the open internet is something
 * somebody will eventually write rows with.
 *
 * Resend keeps every letter whether or not this answers, and retries, so the
 * safe failure here is a bad status code rather than a half-written row: the
 * same letter will come back and the unique id on the table makes the second
 * attempt land on its feet.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET is not set." },
      { status: 503 }
    );
  }

  // Read before parsing: the signature is over these exact bytes, and
  // JSON.stringify of the parsed object is not them.
  const raw = await request.text();

  const signed = svixSigned({
    secret,
    id: request.headers.get("svix-id") ?? "",
    timestamp: request.headers.get("svix-timestamp") ?? "",
    signature: request.headers.get("svix-signature") ?? "",
    body: raw,
  });
  if (!signed) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  let sent: { type?: string; data?: Record<string, unknown> };
  try {
    sent = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "That is not JSON." }, { status: 400 });
  }

  // One event, and everything else acknowledged rather than argued with: a
  // 400 on an event we simply do not handle would have Resend retrying it
  // all day.
  if (sent.type !== "email.received") return NextResponse.json({ ok: true });

  const said = sent.data ?? {};
  const emailId = String(said.email_id ?? said.id ?? "");
  if (emailId === "") return NextResponse.json({ ok: true });

  const list = (value: unknown): string =>
    Array.isArray(value) ? value.map(String).join(", ") : String(value ?? "");

  // The words. A letter with no body is still worth keeping, so a failure
  // here is written down as an empty body rather than dropped: the envelope
  // is on the page either way and the original is still at Resend.
  const full = await fetchBody(emailId);

  const row = {
    email_id: emailId,
    message_id: String(said.message_id ?? ""),
    from_addr: String(full?.from ?? said.from ?? ""),
    to_addr: list(full?.to ?? said.to),
    cc_addr: list(full?.cc ?? said.cc),
    subject: String(full?.subject ?? said.subject ?? ""),
    text_body: String(full?.text ?? ""),
    html_body: String(full?.html ?? ""),
    attachments: Array.isArray(said.attachments) ? said.attachments : [],
    spf: String(full?.authentication?.spf ?? ""),
    dkim: String(full?.authentication?.dkim ?? ""),
    dmarc: String(full?.authentication?.dmarc ?? ""),
    received_at: String(said.created_at ?? new Date().toISOString()),
  };

  const { error } = await db().from("mail").insert(row);
  // The same letter twice is a retry, which is the scheme working rather
  // than a problem: say yes so it stops coming back.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

type Full = {
  from?: string;
  to?: unknown;
  cc?: unknown;
  subject?: string;
  text?: string | null;
  html?: string;
  html_format?: string;
  authentication?: { spf?: string; dkim?: string; dmarc?: string } | null;
};

/**
 * The letter itself, which the webhook does not carry.
 *
 * `cid` rather than the default, so inline images stay as references to
 * attachments instead of being inlined as base64 into a column: a phone
 * photo pasted into an email is several megabytes of data URI, and the row
 * would be mostly that.
 */
async function fetchBody(emailId: string): Promise<Full | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const answer = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!answer.ok) return null;
    return (await answer.json()) as Full;
  } catch {
    return null;
  }
}
