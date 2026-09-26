import { headers } from "next/headers";

import { db } from "./supabase";
import { emailAdmins } from "./email";
import { renderEmail, renderText, type Block } from "./email-html";
import { safeSettings } from "./settings";

/**
 * A record of everything deliberately deleted, and a mail about it.
 *
 * An order went missing overnight and the only honest answer was that it
 * could have been any of three buttons or a bug, because nothing wrote down
 * which. That is a bad answer to give somebody whose dinner it was.
 *
 * The whole row goes in with it. A deletion worth asking about is a deletion
 * worth undoing, and a date with no contents only says that something went,
 * which is already obvious.
 *
 * Never throws. Recording a deletion must not be able to fail the deletion
 * itself, or a broken log becomes a shop that cannot tidy anything.
 */

export type Deleted = {
  /** 'order', 'run', 'schedule_day', 'account'. */
  kind: string;
  /** How to say it out loud: "#1019 · Byih · ₦17,650". */
  label: string;
  /** 'admin' where somebody signed in did it, 'customer' where the person
   *  themselves did, 'system' where the shop did it on its own. */
  who?: "admin" | "customer" | "system";
  /** Anything that helps answer "how did this happen": which part of the
   *  shop, which route, or why. Where they came from is added below. */
  detail?: string;
  /** Everything that went. */
  body?: unknown;
};

/**
 * Where the request came from, as far as anything can say.
 *
 * One shared password means an admin is an admin and no more than that, so
 * the address and the browser are the only things that tell two of them
 * apart. Better than nothing, which is what there was.
 */
async function whereFrom(): Promise<string> {
  try {
    const head = await headers();
    const ip =
      head.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      head.get("x-real-ip") ||
      "";
    const agent = head.get("user-agent") ?? "";
    // Just the phone or the browser, not the forty characters of version
    // numbers nobody reads.
    const browser =
      /iPhone|iPad/.test(agent)
        ? "iPhone"
        : /Android/.test(agent)
          ? "Android"
          : /Macintosh/.test(agent)
            ? "Mac"
            : /Windows/.test(agent)
              ? "Windows"
              : "";
    return [ip, browser].filter(Boolean).join(" · ");
  } catch {
    // Outside a request: a cron job, or the shop doing something itself.
    return "";
  }
}

/** Writes it down, and sends the mail. Both are best effort. */
export async function recordDeletion(what: Deleted): Promise<void> {
  const who = what.who ?? "system";
  const from = await whereFrom();
  const detail = [what.detail, from].filter(Boolean).join(" · ");

  try {
    await db().from("deletions").insert({
      kind: what.kind,
      label: what.label,
      who,
      detail,
      body: what.body ?? null,
    });
  } catch {
    /* No table yet, or a bad minute. The mail below still goes. */
  }

  const said =
    who === "admin"
      ? "An admin deleted"
      : who === "customer"
        ? "A customer deleted"
        : "The shop deleted";

  const thing =
    what.kind === "order" ? "an order" : `a ${what.kind.replace("_", " ")}`;
  const title = `Deleted: ${what.label || what.kind}`;

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
  const blocks: Block[] = [
    { kind: "text", text: `${said} ${thing}.` },
    {
      kind: "rows",
      rows: [
        { label: "What", value: what.label || what.kind },
        { label: "Who", value: who },
        ...(detail ? [{ label: "Where from", value: detail }] : []),
        {
          label: "When",
          value: new Intl.DateTimeFormat("en-GB", {
            timeZone: "Africa/Lagos",
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
        },
      ],
    },
    { kind: "button", label: "See the deletions log", href: `${site}/admin/deletions` },
    {
      kind: "note",
      text:
        "It is written down in full, so it can be put back. Reply to this and " +
        "say so if it was not meant to happen.",
    },
  ];

  // The tagline comes from admin like everywhere else, and a mail about a
  // deletion must not be the one thing that fails because settings did.
  const tagline = await safeSettings()
    .then((one) => one.tagline || undefined)
    .catch(() => undefined);

  void emailAdmins(
    title,
    renderText(title, blocks),
    renderEmail(title, blocks, tagline)
  ).catch(() => {});
}

/** The log itself, newest first, for the admin page that reads it. */
export async function recentDeletions(limit = 100): Promise<
  {
    id: string;
    kind: string;
    label: string;
    who: string;
    detail: string;
    body: unknown;
    created_at: string;
  }[]
> {
  const { data, error } = await db()
    .from("deletions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ""),
    kind: String(row.kind ?? ""),
    label: String(row.label ?? ""),
    who: String(row.who ?? ""),
    detail: String(row.detail ?? ""),
    body: row.body ?? null,
    created_at: String(row.created_at ?? ""),
  }));
}
