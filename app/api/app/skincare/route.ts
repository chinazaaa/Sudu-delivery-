import { NextResponse } from "next/server";
import { namedPromoters } from "@/lib/promoters";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";
import { serialiseBands } from "@/lib/fees";
import { clockOf } from "@/lib/same-day";
import {
  browseSkincare,
  cutOffTime,
  dropLabel,
  nextDrop,
  PER_PAGE,
  skincareBands,
  skincareFacets,
  skincareOn,
  skincarePromise,
  skincareShop,
} from "@/lib/skincare";

export const dynamic = "force-dynamic";

/**
 * The skincare shelf, for the app.
 *
 * One call does both jobs: what the shelf is, and a page of it. The shelf is
 * two thousand products, so the phone is never sent the lot: it asks for a
 * page at a time and narrows the same way the website does, by shelf, brand
 * and price.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const settings = await safeSettings();
    const shop = await skincareShop();

    if (!skincareOn(settings) || !shop) {
      // Off is a real answer, not an error: the app simply does not show the
      // tab, exactly as the website does not show the page.
      return NextResponse.json({ on: false });
    }

    const asked = new URL(request.url).searchParams;
    const page = Math.max(1, Number(asked.get("page") ?? 1) || 1);

    const [{ products, total }, facets] = await Promise.all([
      browseSkincare({
        shelf: asked.get("shelf") ?? undefined,
        brand: asked.get("brand") ?? undefined,
        query: asked.get("q") ?? undefined,
        sort: asked.get("sort") ?? undefined,
        under: Number(asked.get("under") ?? 0) || 0,
        over: Number(asked.get("over") ?? 0) || 0,
        page,
      }),
      skincareFacets(),
    ]);

    const drop = nextDrop(settings);
    const [hour, minute] = cutOffTime(settings.skincare_cut_off);

    return NextResponse.json({
      on: true,
      name: shop.name,
      // The question that pays somebody, and the currencies a card link can
      // be made out in. Both were on the website's skincare checkout and
      // missing from the app's, so every order it took counted for nobody.
      promoters: (await namedPromoters().catch(() => [])).map((one) => ({
        code: one.code,
        name: one.name,
      })),
      monies: moniesOn(settings).map((code) => ({
        code,
        label: code === "GBP" ? "Pounds" : "Dollars",
        symbol: SYMBOL[code],
        rate: rateFor(settings, code),
      })),
      // The whole promise in four words, and the one line that says why the
      // products are real, which is the thing people are right to ask.
      when: dropLabel(drop.date),
      cutOff: clockOf(hour, minute),
      window: settings.skincare_window,
      blurb: settings.skincare_blurb,
      promise: skincarePromise(settings),
      bands: JSON.parse(serialiseBands(skincareBands(settings))) as {
        maxItems: number | null;
        fee: number;
      }[],
      hostels: await hostelNames(),
      products,
      total,
      perPage: PER_PAGE,
      page,
      shelves: facets.shelves,
      brands: facets.brands,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the shelf." },
      { status: 503 }
    );
  }
}
