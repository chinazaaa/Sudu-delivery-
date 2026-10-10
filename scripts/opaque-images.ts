/**
 * Make the photographs a shape Google will actually take.
 *
 * Merchant Center rejects some of the menu with "Unsupported image type
 * [image_link]", and the reason is narrower than it looks. WebP is fine:
 * most of the catalogue is WebP and sails through. What it will not take is
 * the *extended* WebP container, VP8X, which is what you get when the file
 * carries an alpha channel. Lossless WebP, VP8L, goes the same way.
 *
 * We made them ourselves. scripts/shrink-images.ts re-encodes heavy PNGs to
 * WebP, and a PNG of a doughnut cut out on a transparent background is still
 * cut out on a transparent background after sharp has finished with it. The
 * picture looks identical on the site, because the site puts it on a card
 * with a background. Google reads the container and refuses it.
 *
 * So this flattens them: the same picture, over white, as a JPEG. Nothing
 * about the site changes, because nothing on the site was relying on the
 * transparency.
 *
 *   npx tsx scripts/opaque-images.ts                 # say what it would do
 *   npx tsx scripts/opaque-images.ts --go            # actually do it
 *   npx tsx scripts/opaque-images.ts --go --limit 5  # a few first
 *
 * It also picks up a handful of files named .webp that are a JPEG or a PNG
 * inside. Those are served under the wrong content type, which is its own
 * way of being refused, and the fix is the same: write a real file and point
 * the row at it.
 *
 * Nothing is destroyed. The new file is written beside the old one under a
 * different name, and the row is only pointed at it once the new one is up.
 * The originals stay exactly where they are, so any of this can be undone by
 * pointing a row back. Stop it whenever you like and run it again; it picks
 * up whatever is still wrong.
 *
 * Needs the same two variables as the site, which .env.local already has.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import sharp from "sharp";

const BUCKET = "menu";

/** High enough that a flattened photograph is indistinguishable, and this
 *  is the copy Google will show beside a price. */
const QUALITY = 88;

/** What a transparent pixel becomes. White, because every card on the site
 *  these sit on is white, so nothing visibly changes. */
const BACKGROUND = { r: 255, g: 255, b: 255 };

const AT_ONCE = 4;

/**
 * The three places a picture is named, and the one piece of structured data
 * each ends up in.
 *
 * The item's own photograph is the obvious one. The banner and the logo
 * matter because lib/product-photo.ts falls back to them for the eighty-odd
 * dishes that have no photograph of their own: one bad logo is every one of
 * that kitchen's unphotographed dishes rejected at once.
 */
const PLACES = [
  { table: "menu_items", column: "image_url", folder: "items", label: "dish" },
  { table: "restaurants", column: "banner_url", folder: "banners", label: "banner" },
  { table: "restaurants", column: "logo_url", folder: "logos", label: "logo" },
] as const;

type Row = { id: string; name: string; url: string };
type Found = {
  row: Row;
  place: (typeof PLACES)[number];
  path: string;
  why: string;
};

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

const { url, key } = env();
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Where in the bucket a stored picture lives, read off the address in the
 * row rather than guessed from it.
 *
 * Some of these addresses have a double slash before "storage", from an
 * older upload path that joined the two halves carelessly. They still serve,
 * so they were never worth a migration of their own, but the path has to be
 * found either way.
 */
function pathOf(at: string): string {
  const mark = `/object/public/${BUCKET}/`;
  const found = at.indexOf(mark);
  return found === -1 ? "" : decodeURIComponent(at.slice(found + mark.length));
}

/**
 * What a file actually is, from its first bytes rather than its name.
 *
 * The name is what got us here: ten of these are called .webp and are a
 * JPEG inside. A RIFF/WEBP header is followed by a four-letter chunk saying
 * which kind of WebP it is, and that chunk is the whole question: "VP8 " is
 * the simple lossy one Google takes, "VP8X" and "VP8L" are the two it does
 * not.
 */
function verdict(head: Uint8Array): string {
  const tag = (at: number, length: number) =>
    String.fromCharCode(...head.slice(at, at + length));

  if (head.length < 16) return "too short to read";

  if (tag(0, 4) === "RIFF" && tag(8, 4) === "WEBP") {
    const chunk = tag(12, 4);
    if (chunk === "VP8X") return "WebP with transparency";
    if (chunk === "VP8L") return "lossless WebP";
    return "";
  }

  // Not a WebP at all. Only a problem where the name says it is, because
  // then it is served as one.
  if (head[0] === 0xff && head[1] === 0xd8) return "a JPEG named .webp";
  if (tag(1, 3) === "PNG") return "a PNG named .webp";
  return "not an image we recognise";
}

/** Every picture Google would refuse, across all three places. */
async function refused(): Promise<Found[]> {
  const out: Found[] = [];
  const PAGE = 1000;

  for (const place of PLACES) {
    const rows: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from(place.table)
        .select(`id, name, ${place.column}`)
        .neq(place.column, "")
        .not(place.column, "is", null)
        .range(from, from + PAGE - 1)
        .order("id");
      if (error) throw new Error(`${place.table}.${place.column}: ${error.message}`);

      const got = (data ?? []) as unknown as Record<string, string>[];
      for (const one of got) {
        rows.push({ id: one.id, name: one.name, url: one[place.column] ?? "" });
      }
      if (got.length < PAGE) break;
    }

    // Only the ones whose name claims WebP. A JPEG called .jpg is already
    // something Google takes, and downloading three thousand files to be
    // told so is a quarter of an hour nobody needs to spend.
    const maybe = rows.filter((row) => /\.webp(\?|$)/i.test(row.url));
    process.stdout.write(`${place.label}: reading ${maybe.length} … `);

    let checked = 0;
    for (let at = 0; at < maybe.length; at += 16) {
      const batch = maybe.slice(at, at + 16);
      await Promise.all(
        batch.map(async (row) => {
          const path = pathOf(row.url);
          if (path === "") return;
          // The first thirty-two bytes say everything, so that is all that
          // is asked for: a thousand whole photographs is a lot of traffic
          // to answer a question about a header.
          const answer = await fetch(row.url, { headers: { Range: "bytes=0-31" } }).catch(
            () => null
          );
          if (!answer || !answer.ok) return;
          const head = new Uint8Array(await answer.arrayBuffer());
          const why = verdict(head);
          checked++;
          if (why !== "") out.push({ row, place, path, why });
        })
      );
    }
    console.log(`${out.filter((one) => one.place === place).length} to fix`);
    void checked;
  }

  return limit > 0 ? out.slice(0, limit) : out;
}

async function flatten(one: Found): Promise<"done" | "skipped" | "failed"> {
  const { data: got, error: read } = await db.storage.from(BUCKET).download(one.path);
  if (read || !got) {
    console.log(`  skip  ${one.row.name}: could not read, ${read?.message ?? "missing"}`);
    return "skipped";
  }

  let after: Buffer;
  try {
    after = await sharp(new Uint8Array(await got.arrayBuffer()))
      .flatten({ background: BACKGROUND })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
  } catch (problem) {
    console.log(
      `  skip  ${one.row.name}: ${problem instanceof Error ? problem.message : "unreadable"}`
    );
    return "skipped";
  }

  // A new name, so the old file stays exactly where it is and the row can be
  // pointed back at it if any of this looks wrong. The suffix says why this
  // copy exists, for whoever finds it in the bucket in a year.
  const path = `${one.place.folder}/${one.row.id}-opaque.jpg`;
  const { error: sent } = await db.storage
    .from(BUCKET)
    .upload(path, after, { contentType: "image/jpeg", upsert: true });
  if (sent) {
    console.log(`  FAIL  ${one.row.name}: upload, ${sent.message}`);
    return "failed";
  }

  const { data: now } = db.storage.from(BUCKET).getPublicUrl(path);

  const { error: saved } = await db
    .from(one.place.table)
    .update({ [one.place.column]: now.publicUrl })
    .eq("id", one.row.id);
  if (saved) {
    console.log(`  FAIL  ${one.row.name}: save, ${saved.message}`);
    return "failed";
  }

  console.log(`  ok    ${one.row.name} (${one.place.label}): ${one.why}`);
  return "done";
}

async function main() {
  const rows = await refused();

  console.log(
    `\n${rows.length} picture${rows.length === 1 ? "" : "s"} Google would refuse.`
  );
  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const why = new Map<string, number>();
  for (const one of rows) why.set(one.why, (why.get(one.why) ?? 0) + 1);
  for (const [said, count] of [...why].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${said}`);
  }

  console.log("\nSome of them:");
  for (const one of rows.slice(0, 8)) {
    console.log(`  ${one.place.label.padEnd(7)} ${one.row.name}`);
  }

  if (!go) {
    console.log("\nThis was a dry run. Nothing was written or changed.");
    console.log("Run it again with --go to do it.");
    return;
  }

  console.log("");
  const tally = { done: 0, skipped: 0, failed: 0 };
  for (let at = 0; at < rows.length; at += AT_ONCE) {
    const batch = rows.slice(at, at + AT_ONCE);
    for (const result of await Promise.all(batch.map(flatten))) tally[result]++;
    console.log(`  … ${Math.min(at + AT_ONCE, rows.length)}/${rows.length}`);
  }

  console.log(
    `\nDone. ${tally.done} flattened, ${tally.skipped} left alone, ${tally.failed} failed.`
  );
  if (tally.done > 0) {
    console.log("The originals are still in the bucket, untouched.");
    console.log(
      "Merchant Center re-reads the site on its own schedule, so give it a day."
    );
  }
}

main().catch((problem) => {
  console.error(problem instanceof Error ? problem.message : problem);
  process.exit(1);
});
