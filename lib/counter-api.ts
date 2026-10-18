import { NextResponse } from "next/server";
import { namedPromoters } from "@/lib/promoters";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";
import { serialiseBands } from "@/lib/fees";
import { clockOf, deliverySlots } from "@/lib/same-day";
import { hoursByDay, sameDayPricing } from "@/lib/settings";
import {
  browseCounter,
  counterBands,
  counterBlurb,
  counterCutOff,
  counterFacets,
  counterOn,
  counterPromise,
  counterShop,
  cutOffTime,
  dropLabel,
  nextDrop,
  PER_PAGE,
  type Counter,
} from "@/lib/counter";

/**
 * A counter's shelf, for the app, whichever counter it is.
 *
 * This was the skincare route and nothing else, and then the pharmacy
 * wanted the same hundred lines with a different prefix. The app would
 * have had two copies of the same answer, drifting apart the first time
 * one of them gained a field.
 *
 * One call does both jobs: what the shelf is, and a page of it. The shelf
 * is thousands of products, so the phone is never sent the lot: it asks
 * for a page at a time and narrows the same way the website does.
 */
export async function counterShelfJson(
  counter: Counter,
  request: Request
): Promise<NextResponse> {
  const settings = await safeSettings();
  const shop = await counterShop(counter);

  if (!counterOn(counter, settings) || !shop) {
    // Off is a real answer, not an error: the app simply does not show the
    // door, exactly as the website does not show the page.
    return NextResponse.json({ on: false });
  }

  const asked = new URL(request.url).searchParams;
  const page = Math.max(1, Number(asked.get("page") ?? 1) || 1);

  const [{ products, total }, facets] = await Promise.all([
    browseCounter(counter, {
      shelf: asked.get("shelf") ?? undefined,
      brand: asked.get("brand") ?? undefined,
      query: asked.get("q") ?? undefined,
      sort: asked.get("sort") ?? undefined,
      under: Number(asked.get("under") ?? 0) || 0,
      over: Number(asked.get("over") ?? 0) || 0,
      page,
    }),
    counterFacets(counter),
  ]);

  const drop = nextDrop(counter, settings);
  const [hour, minute] = cutOffTime(counterCutOff(counter, settings));

  /*
   * The other way, where there is one.
   *
   * Today and tomorrow, because deliveries finish in the evening and
   * somebody ill at nine at night has nothing left today. Sent to the
   * phone so the app can offer the same choice the website does rather
   * than quietly being the cheaper half of the shop.
   */
  const sameDay = await sameDayPricing();
  const soon =
    settings.same_day_on === "on"
      ? deliverySlots(new Date(), await hoursByDay()).filter(
          (one) => one.day === "today" || one.day === "tomorrow"
        )
      : [];

  return NextResponse.json({
    on: true,
    kind: counter.kind,
    name: shop.name,
    // The question that pays somebody, and the currencies a card link can
    // be made out in.
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
    when: dropLabel(drop.date),
    cutOff: clockOf(hour, minute),
    window: (settings as unknown as Record<string, string>)[`${counter.kind}_window`] ?? "",
    blurb: counterBlurb(counter, settings),
    promise: counterPromise(counter, settings),
    bands: JSON.parse(serialiseBands(counterBands(counter, settings))) as {
      maxItems: number | null;
      fee: number;
    }[],
    slots: soon.map((one) => ({
      at: one.at,
      label: one.label,
      day: one.day,
      urgent: one.urgent,
    })),
    sameDayBands: JSON.parse(serialiseBands(sameDay.bands)) as {
      maxItems: number | null;
      fee: number;
    }[],
    urgentExtra: sameDay.urgentExtra,
    hostels: await hostelNames(),
    products,
    total,
    perPage: PER_PAGE,
    page,
    shelves: facets.shelves,
    brands: facets.brands,
  });
}
