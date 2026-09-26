import { NextResponse } from "next/server";

import { boxesAcross, isTimed, liveOccasions } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";

/** The cover for a shelf, as a PNG the phone can actually draw. */
function cover(imageUrl: string, kind: string): string {
  const named = (imageUrl || "").trim();
  // Anything already hosted elsewhere is somebody's own photograph and is
  // left alone. Only our own drawings have a PNG beside them.
  if (named.startsWith("http")) return named;
  const file = named.startsWith("/covers/")
    ? named.replace(/\.svg$/, ".png")
    : `/covers/${kind === "occasion" ? "occasions" : "collections"}.png`;
  return `${SITE}${file}`;
}

/**
 * The occasions, for the app's list.
 *
 * The same two queries the website's list uses, because a card with no price
 * on it is a category and categories sell nothing. Worked out here rather
 * than on the phone: what a thing costs is the shop's to say.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const occasions = await liveOccasions();
    const boxes = await boxesAcross(occasions.map((one) => one.id));
    const from = await cheapestBoxes(boxes);

    const counts = new Map<string, number>();
    for (const box of boxes) {
      if (box.is_extra) continue;
      counts.set(box.occasion_id, (counts.get(box.occasion_id) ?? 0) + 1);
    }

    return NextResponse.json({
      occasions: occasions
        .filter((one) => (counts.get(one.id) ?? 0) > 0)
        .map((one) => ({
          slug: one.slug,
          name: one.name,
          blurb: one.blurb,
          boxes: counts.get(one.id) ?? 0,
          from: from.get(one.id) ?? null,
          happensAt: isTimed(one) ? one.happens_at : null,
          whenWord: one.when_word,
          // Which shelf, so the app can name them the way the site does
          // rather than filing everything under one word.
          kind: one.kind,
          // A picture, as a PNG on an absolute address. The website draws
          // these as SVG, which a phone cannot render without a library it
          // would need a new build from Apple to carry, and a shelf of grey
          // text is not worth a fortnight of review. Where a shelf has no
          // picture of its own it borrows its shelf's.
          image: cover(one.image_url, one.kind),
        })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read those." },
      { status: 500 }
    );
  }
}
