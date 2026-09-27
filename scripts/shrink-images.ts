/**
 * Make the catalogue's photographs weigh what a photograph should.
 *
 * Nearly two thousand of them are PNG, which is a lossless format meant for
 * logos and screenshots. Used on a photograph it faithfully stores every
 * speckle the sensor produced, so the fried rice at Yin Yang Express is
 * eight megabytes: most of a minute, on a phone, for one thumbnail. PNG is
 * a little over half the files here and about four fifths of the weight.
 *
 * This re-encodes anything heavy as WebP and caps the longest edge, which
 * is well past what any card on the site actually displays, so nothing
 * visibly changes and the page stops costing somebody their data.
 *
 *   npx tsx scripts/shrink-images.ts                  # say what it would do
 *   npx tsx scripts/shrink-images.ts --go             # actually do it
 *   npx tsx scripts/shrink-images.ts --go --limit 10  # a few first
 *   npx tsx scripts/shrink-images.ts --go --over 500  # only above 500kB
 *
 * Nothing is destroyed. The new file is written beside the old one under a
 * different name, and the row is only pointed at it once it is uploaded and
 * confirmed smaller. The originals stay where they are, so any of this can
 * be undone by pointing the row back. Stop it whenever you like and run it
 * again; it picks up whatever is still heavy.
 *
 * Needs the same two variables as the site, which .env.local already has.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import sharp from "sharp";

const BUCKET = "menu";
const FOLDER = "items";

/** Past this, a menu photograph is carrying weight it does not need. */
const DEFAULT_OVER_KB = 150;

/** No card on the site is anywhere near this wide. Anything longer is
 *  detail nobody will ever see, sent down a phone connection. */
const LONGEST_EDGE = 1200;

/** Good enough that nobody can tell, small enough to be the point. */
const QUALITY = 82;

/** Not worth rewriting a row to save a rounding error. */
const WORTH_IT = 0.85;

/** Formats worth re-encoding. WebP and AVIF are already doing their job. */
const HEAVY = new Set(["image/png", "image/jpeg", "image/gif"]);

const AT_ONCE = 4;

type Row = { id: string; name: string; image_url: string };

function env(): { url: string; key: string } {
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
const go = args.includes("--go");
const valueOf = (flag: string): string => {
  const at = args.indexOf(flag);
  return at === -1 ? "" : (args[at + 1] ?? "");
};
const limit = Number(valueOf("--limit")) || 0;
const overKb = Number(valueOf("--over")) || DEFAULT_OVER_KB;

const { url, key } = env();
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const said = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}kB`;

/**
 * Where in the bucket a stored picture lives, read off the address in the
 * row rather than guessed from it. Some of these were uploaded long enough
 * ago that the file is not named after the item, so the address is the only
 * thing that reliably connects the two.
 */
function pathOf(at: string): string {
  const mark = `/object/public/${BUCKET}/`;
  const found = at.indexOf(mark);
  return found === -1 ? "" : decodeURIComponent(at.slice(found + mark.length));
}

/** Everything in the bucket, with what it weighs. */
async function weights(): Promise<Map<string, { size: number; mime: string }>> {
  const out = new Map<string, { size: number; mime: string }>();
  const PAGE = 1000;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list(FOLDER, { limit: PAGE, offset: from });
    if (error) throw new Error(error.message);

    const files = data ?? [];
    for (const one of files) {
      const meta = (one.metadata ?? {}) as { size?: number; mimetype?: string };
      out.set(`${FOLDER}/${one.name}`, {
        size: Number(meta.size ?? 0),
        mime: String(meta.mimetype ?? ""),
      });
    }
    if (files.length < PAGE) break;
  }
  return out;
}

/** Every row pointing at a picture of ours that is heavier than it needs. */
async function heavy(): Promise<{ row: Row; path: string; size: number }[]> {
  const sizes = await weights();
  const out: { row: Row; path: string; size: number }[] = [];
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
    for (const row of rows) {
      const path = pathOf(row.image_url ?? "");
      if (path === "") continue;
      const found = sizes.get(path);
      if (!found) continue;
      if (!HEAVY.has(found.mime)) continue;
      if (found.size <= overKb * 1024) continue;
      out.push({ row, path, size: found.size });
    }
    if (rows.length < PAGE) break;
  }

  out.sort((a, b) => b.size - a.size);
  return limit > 0 ? out.slice(0, limit) : out;
}

async function shrink(one: {
  row: Row;
  path: string;
  size: number;
}): Promise<{ was: number; now: number } | "skipped" | "failed"> {
  const { data: got, error: read } = await db.storage.from(BUCKET).download(one.path);
  if (read || !got) {
    console.log(`  skip  ${one.row.name}: could not read, ${read?.message ?? "missing"}`);
    return "skipped";
  }

  const before = new Uint8Array(await got.arrayBuffer());

  let after: Buffer;
  try {
    after = await sharp(before)
      // A still photograph, so an animated GIF loses its animation here.
      // Nothing on a menu is animated, and one that is would be a mistake.
      .rotate()
      .resize({
        width: LONGEST_EDGE,
        height: LONGEST_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer();
  } catch (problem) {
    console.log(
      `  skip  ${one.row.name}: ${problem instanceof Error ? problem.message : "unreadable"}`
    );
    return "skipped";
  }

  // A picture already close to its best is not worth a new file and a new
  // row. Better to leave it and say so.
  if (after.byteLength >= before.byteLength * WORTH_IT) {
    console.log(
      `  keep  ${one.row.name}: ${said(before.byteLength)} would only become ${said(
        after.byteLength
      )}`
    );
    return "skipped";
  }

  const path = `${FOLDER}/${one.row.id}.webp`;
  const { error: sent } = await db.storage
    .from(BUCKET)
    .upload(path, after, { contentType: "image/webp", upsert: true });
  if (sent) {
    console.log(`  FAIL  ${one.row.name}: upload, ${sent.message}`);
    return "failed";
  }

  const { data: now } = db.storage.from(BUCKET).getPublicUrl(path);

  // Only once the smaller copy is up. The original is left exactly where it
  // was, so a row can be pointed back at it if any of this looks wrong.
  const { error: saved } = await db
    .from("menu_items")
    .update({ image_url: now.publicUrl })
    .eq("id", one.row.id);
  if (saved) {
    console.log(`  FAIL  ${one.row.name}: save, ${saved.message}`);
    return "failed";
  }

  console.log(
    `  ok    ${one.row.name}: ${said(before.byteLength)} → ${said(after.byteLength)}`
  );
  return { was: before.byteLength, now: after.byteLength };
}

async function main() {
  const rows = await heavy();
  const weight = rows.reduce((total, one) => total + one.size, 0);

  console.log(
    `${rows.length} picture${rows.length === 1 ? "" : "s"} over ${overKb}kB, ` +
      `${said(weight)} in all.`
  );

  if (rows.length === 0) return;

  console.log("\nThe heaviest:");
  for (const one of rows.slice(0, 8)) {
    console.log(`  ${said(one.size).padStart(7)}  ${one.row.name}`);
  }

  if (!go) {
    console.log("\nThis was a dry run. Nothing was read, written or changed.");
    console.log("Run it again with --go to do it.");
    return;
  }

  console.log("");
  let was = 0;
  let now = 0;
  const tally = { done: 0, skipped: 0, failed: 0 };

  for (let at = 0; at < rows.length; at += AT_ONCE) {
    const batch = rows.slice(at, at + AT_ONCE);
    const results = await Promise.all(batch.map(shrink));
    for (const one of results) {
      if (one === "skipped") tally.skipped++;
      else if (one === "failed") tally.failed++;
      else {
        tally.done++;
        was += one.was;
        now += one.now;
      }
    }
    console.log(`  … ${Math.min(at + AT_ONCE, rows.length)}/${rows.length}`);
  }

  console.log(
    `\nDone. ${tally.done} shrunk, ${tally.skipped} left alone, ${tally.failed} failed.`
  );
  if (tally.done > 0) {
    console.log(
      `${said(was)} became ${said(now)}, which is ${said(was - now)} a phone no longer downloads.`
    );
    console.log("The originals are still in the bucket, untouched.");
  }
}

main().catch((problem) => {
  console.error(problem instanceof Error ? problem.message : problem);
  process.exit(1);
});
