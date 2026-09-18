import { NextResponse } from "next/server";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { activeBands, safeSettings } from "@/lib/settings";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

/**
 * Everything the app needs to draw a shop: the menus, the runs still taking
 * orders, and what delivery costs.
 *
 * The app reads through here rather than talking to the database itself. A
 * phone cannot be trusted with a key that can read every customer, and the
 * rules about what a thing costs belong in one place.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [menu, batches, bands, settings] = await Promise.all([
      menuView(),
      openBatches(),
      activeBands(),
      safeSettings(),
    ]);

    return NextResponse.json({
      menu,
      runs: batches.map(toBatchView),
      bands: bands.map((band) => ({
        maxItems: Number.isFinite(band.maxItems) ? band.maxItems : null,
        fee: band.fee,
      })),
      shop: {
        tagline: settings.tagline,
        ribbon: settings.ribbon_text,
        whatsapp: settings.whatsapp_number,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the menu." },
      { status: 503 }
    );
  }
}
