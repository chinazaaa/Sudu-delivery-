import { NextResponse } from "next/server";

import { boxesAcross, isTimed, liveOccasions } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";

export const dynamic = "force-dynamic";

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
          image: one.image_url,
        })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read those." },
      { status: 500 }
    );
  }
}
