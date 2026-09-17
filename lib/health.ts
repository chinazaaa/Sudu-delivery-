import { db } from "./supabase";

export type KeyKind = "service_role" | "public" | "unknown";

/**
 * Supabase hands out two keys and they look alike. The public one is subject
 * to row level security, and because this schema has no policies, using it
 * makes every query come back empty instead of failing. That reads as "no data
 * yet", which is the most confusing possible symptom, so name it instead.
 */
export function keyKind(): KeyKind {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (key.startsWith("sb_secret_")) return "service_role";
  if (key.startsWith("sb_publishable_")) return "public";

  const payload = key.split(".")[1];
  if (!payload) return "unknown";

  try {
    const role = JSON.parse(Buffer.from(payload, "base64url").toString()).role;
    if (role === "service_role") return "service_role";
    if (role === "anon" || role === "authenticated") return "public";
  } catch {
    /* Not a JWT. Fall through. */
  }
  return "unknown";
}

export type Diagnosis =
  | { ok: true }
  | { ok: false; title: string; detail: string };

/**
 * Called when a screen has nothing to show, to say why. There are only two
 * real causes: the schema was never run, or the key cannot see it.
 */
export async function diagnoseEmpty(): Promise<Diagnosis> {
  const kind = keyKind();

  if (kind === "public") {
    return {
      ok: false,
      title: "Wrong Supabase key",
      detail:
        "SUPABASE_SERVICE_ROLE_KEY holds a publishable key, so every query comes " +
        "back empty. Copy the service_role secret from Supabase, Project Settings, " +
        "API, into the Vercel variable, and redeploy.",
    };
  }

  const { error } = await db().from("restaurants").select("id").limit(1);
  if (error) {
    return {
      ok: false,
      title: "Supabase is not answering",
      detail: `${error.message}. If it mentions the schema cache, run supabase/setup.sql.`,
    };
  }

  return {
    ok: false,
    title: "Nothing in the database yet",
    detail:
      "The connection works but there are no rows. Run supabase/setup.sql in the " +
      "Supabase SQL editor once, then reload this page.",
  };
}

/**
 * Whether the promoter pages have the columns they need.
 *
 * The PIN column and the payouts table arrived after the first schema, so a
 * database set up before then saves nothing and says nothing. Checked up
 * front so the page can say what to run, rather than leaving a form that
 * empties itself.
 */
export async function promoterSchema(): Promise<{ ok: boolean; missing: string }> {
  const { error: pinError } = await db().from("promoters").select("pin").limit(1);
  if (pinError) return { ok: false, missing: "the PIN column on promoters" };

  const { error: payoutError } = await db().from("promoter_payouts").select("id").limit(1);
  if (payoutError) return { ok: false, missing: "the promoter_payouts table" };

  return { ok: true, missing: "" };
}

/**
 * Which settings columns the code expects and the database has not got.
 *
 * A setting saved to a column that does not exist used to fail in silence and
 * now fails loudly, and neither is much use while you are standing in front of
 * the form. Asked first, the page can say so and put the box away.
 */
export async function missingSettings(names: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const name of names) {
    const { error } = await db().from("settings").select(name).limit(1);
    if (error) missing.push(name);
  }
  return missing;
}
