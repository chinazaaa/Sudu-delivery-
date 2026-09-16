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
