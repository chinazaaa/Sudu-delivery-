/**
 * Bring the catalogue's photographs onto our own storage.
 *
 * Most of the menu came in from imports, and an import brings the address
 * the picture was exported from, not the picture. So a good deal of the
 * shop is being illustrated by other people's servers: a competitor's file
 * host, a shop CDN, somebody's S3 bucket. Every one of those is a picture
 * they can change or delete, on a page we are responsible for, and the day
 * one of them notices the traffic is the day the shop looks broken.
 *
 * This fetches each one and puts it in our own bucket, then points the row
 * at the copy. It is run from a laptop rather than from the site because it
 * is a long job that must not be half done by a request timing out, and
 * because a mistake here is easier to watch happening than to read about
 * afterwards.
 *
 *   npx tsx scripts/rehost-images.ts                  # say what it would do
 *   npx tsx scripts/rehost-images.ts --go             # actually do it
 *   npx tsx scripts/rehost-images.ts --go --limit 20  # a few first
 *   npx tsx scripts/rehost-images.ts --go --host files.chowdeck.com
 *
 * It is safe to stop and safe to run again. A row is only updated once its
 * copy is uploaded, so an interrupted run leaves finished rows finished and
 * unfinished rows exactly as they were; running it again picks up the rest.
 *
 * Needs the same two variables the site needs, which .env.local already has:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const BUCKET = "menu";
const FOLDER = "items";

/** What marks a picture as already ours. */
const OURS = "/storage/v1/object/public/";

/** How many at once. Enough to be quick, few enough to be a good neighbour
 *  to the host we are fetching from and to our own storage. */
const AT_ONCE = 4;

/** A picture bigger than this is not a menu photograph, it is a mistake. */
const TOO_BIG = 12 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

type Row = { id: string; name: string; image_url: string };

function env(): { url: string; key: string } {
  // .env.local is where Next keeps these, so reading it means nobody has to
  // export anything by hand before running this.
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const found = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (found && !process.env[found[1]]) {
          process.env[found[1]] = found[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // Not there, which is fine if the variables are already in the shell.
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or run this\n" +
        "from the project root where .env.local has them."
    );
    process.exit(1);
  }
  return { url, key };
}

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const valueOf = (flag: string): string => {
  const at = args.indexOf(flag);
  return at === -1 ? "" : (args[at + 1] ?? "");
};

const go = has("--go");
const onlyHost = valueOf("--host");
const limit = Number(valueOf("--limit")) || 0;

const { url, key } = env();
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Every row still pointing somewhere that is not ours. */
async function theirs(): Promise<Row[]> {
  const out: Row[] = [];
  const PAGE = 1000;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("menu_items")
      .select("id, name, image_url")
      .neq("image_url", "")
      .not("image_url", "is", null)
      .range(from, from + PAGE - 1)
      .order("id");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Row[];
    out.push(
      ...rows.filter((row) => {
        const at = row.image_url ?? "";
        if (at === "" || at.startsWith("/") || at.includes(OURS)) return false;
        if (onlyHost !== "" && !at.includes(onlyHost)) return false;
        return /^https?:\/\//i.test(at);
      })
    );
    if (rows.length < PAGE) break;
  }

  return limit > 0 ? out.slice(0, limit) : out;
}

/** Fetch one, with a couple of goes at it: one dropped connection in two
 *  thousand is a certainty, and it is not a reason to lose the picture. */
async function fetchImage(
  at: string
): Promise<{ body: Uint8Array; type: string } | { error: string }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const answer = await fetch(at, {
        redirect: "follow",
        headers: { accept: "image/*,*/*" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!answer.ok) {
        // A missing picture will still be missing on the third try.
        if (answer.status === 404 || answer.status === 403) {
          return { error: `HTTP ${answer.status}` };
        }
        throw new Error(`HTTP ${answer.status}`);
      }

      const type = (answer.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED.has(type)) return { error: `not an image (${type || "no type"})` };

      const body = new Uint8Array(await answer.arrayBuffer());
      if (body.byteLength === 0) return { error: "empty" };
      if (body.byteLength > TOO_BIG) return { error: `too big (${body.byteLength} bytes)` };
      return { body, type };
    } catch (problem) {
      if (attempt === 3) {
        return { error: problem instanceof Error ? problem.message : "failed" };
      }
      await new Promise((wake) => setTimeout(wake, attempt * 1500));
    }
  }
  return { error: "failed" };
}

async function rehost(row: Row): Promise<"done" | "skipped" | "failed"> {
  const got = await fetchImage(row.image_url);
  if ("error" in got) {
    console.log(`  skip  ${row.name}: ${got.error}`);
    return "skipped";
  }

  const path = `${FOLDER}/${row.id}.${EXTENSION[got.type]}`;

  const { error: sent } = await db.storage
    .from(BUCKET)
    .upload(path, got.body, { contentType: got.type, upsert: true });
  if (sent) {
    console.log(`  FAIL  ${row.name}: upload, ${sent.message}`);
    return "failed";
  }

  const { data: now } = db.storage.from(BUCKET).getPublicUrl(path);

  // Only once the copy is up. The row keeps pointing at theirs until ours
  // exists, so stopping this halfway never leaves an item with no picture.
  const { error: saved } = await db
    .from("menu_items")
    .update({ image_url: now.publicUrl })
    .eq("id", row.id);
  if (saved) {
    console.log(`  FAIL  ${row.name}: save, ${saved.message}`);
    return "failed";
  }

  console.log(`  ok    ${row.name}`);
  return "done";
}

async function main() {
  const rows = await theirs();

  const byHost = new Map<string, number>();
  for (const row of rows) {
    const host = new URL(row.image_url).host;
    byHost.set(host, (byHost.get(host) ?? 0) + 1);
  }

  console.log(`${rows.length} picture${rows.length === 1 ? "" : "s"} not on our storage:`);
  for (const [host, count] of [...byHost.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${host}`);
  }

  if (rows.length === 0) return;

  if (!go) {
    console.log("\nThis was a dry run. Nothing was fetched, uploaded or changed.");
    console.log("Run it again with --go to do it.");
    return;
  }

  console.log("");
  const tally = { done: 0, skipped: 0, failed: 0 };

  for (let at = 0; at < rows.length; at += AT_ONCE) {
    const batch = rows.slice(at, at + AT_ONCE);
    const results = await Promise.all(batch.map(rehost));
    for (const one of results) tally[one]++;
    console.log(
      `  … ${Math.min(at + AT_ONCE, rows.length)}/${rows.length}` +
        ` (${tally.done} moved, ${tally.skipped} skipped, ${tally.failed} failed)`
    );
  }

  console.log(
    `\nDone. ${tally.done} moved onto our storage, ${tally.skipped} skipped, ${tally.failed} failed.`
  );
  if (tally.skipped + tally.failed > 0) {
    console.log("Run it again to have another go at the ones that did not make it.");
  }
}

main().catch((problem) => {
  console.error(problem instanceof Error ? problem.message : problem);
  process.exit(1);
});
