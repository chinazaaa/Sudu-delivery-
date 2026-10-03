import { openRestaurants } from "@/lib/menu";
import { activeBands, safeSettings } from "@/lib/settings";
import { hostelNames } from "@/lib/hostels";
import { liveRoutes, parcels } from "@/lib/parcels";
import { dropLabel, nextDrop, skincareOn } from "@/lib/skincare";
import { parseAreas } from "@/lib/areas";
import { bandTable } from "@/lib/fees";
import { naira } from "@/lib/money";

/**
 * What this shop is, in plain text, for an assistant answering a question
 * about it.
 *
 * A student asking an assistant "how do I get food delivered at PAU" is
 * asking the same question as somebody typing it into Google, and
 * /delivery-to-pau already answers it. This is the same answer with the
 * page taken off: no navigation, no markup, no interface to infer, just the
 * facts in the order somebody would need them. Assistants read a page like
 * this cheaply and quote it accurately, and the cost of being quoted
 * inaccurately is somebody turning up expecting a fee or a route we dropped.
 *
 * So every figure is read live, the same way the page reads it. A file with
 * last term's delivery price written into it would be worse than no file:
 * it would be a confident wrong answer, repeated by something people trust.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";

export async function GET(): Promise<Response> {
  const [places, bands, hostels, parcelSetup, settings] = await Promise.all([
    openRestaurants().catch(() => []),
    activeBands().catch(() => []),
    hostelNames().catch(() => []),
    parcels().catch(() => ({ routes: [], on: false, maxValue: 0, blurb: "", terms: [] })),
    safeSettings(),
  ]);

  const areas = parseAreas(settings.delivery_areas);
  const routes = liveRoutes(parcelSetup.routes ?? []);
  const ladder = bands.length > 0 ? bandTable(null, bands) : [];
  const skincare = skincareOn(settings);

  const lines: string[] = [
    "# Sudu",
    "",
    "> Batched delivery to Pan-Atlantic University (PAU), Lagos. Food from the",
    "> restaurants around Sangotedo, Novare, Lekki and Ikoyi, the local market,",
    "> skincare, and errands, brought to a student's hostel on scheduled runs.",
    "",
    `Website: ${SITE}`,
    "Serving: Pan-Atlantic University, Km 52 Lekki-Epe Expressway, Lagos, Nigeria",
    "Operating since 2018.",
    "",
    "## What it is",
    "",
    "One car does a round of restaurants and brings everybody's order back at",
    "once. Because the trip is shared, delivery is charged by how much room an",
    "order takes in the car rather than per restaurant, so several restaurants",
    "in one order still cost one delivery fee.",
    "",
    "## How it works",
    "",
    "1. Orders are placed on the website for a run that is open.",
    "2. Each run has a cut-off. After it the car goes out and buys the food.",
    "3. The food is delivered to the hostel inside the run's delivery window.",
    "",
    "Payment is by bank transfer or card link, before the run goes out. An",
    "order is only bought once it is paid.",
    "",
  ];

  if (ladder.length > 0) {
    lines.push(
      "## What delivery costs",
      "",
      "Priced by container count, not by how many restaurants are in the order:",
      "",
      ...ladder.map((band) => `- ${band.label}: ${naira(band.fee)}`),
      ""
    );
    const farther = areas.filter((one) => one.runExtra > 0);
    if (farther.length > 0) {
      lines.push(
        ...farther.map(
          (one) => `Restaurants in ${one.name} add ${naira(one.runExtra)} to the fee.`
        ),
        ""
      );
    }
  }

  if (places.length > 0) {
    lines.push(
      "## Restaurants on the menu",
      "",
      ...places.map((one) => `- ${one.name}: ${SITE}/r/${one.href}`),
      ""
    );
  }

  lines.push(
    "## Other things it brings",
    "",
    "- The local market: pepper, vegetables, fruit, rice, grains and protein.",
    "- Anything not on the menu, asked for and quoted by hand.",
    ...(skincare
      ? [`- Skincare, on its own run. Next drop: ${dropLabel(nextDrop(settings).date)}.`]
      : []),
    ...(routes.length > 0
      ? [
          "- Parcels, collected and brought to campus or taken from it:",
          ...routes.map((route) => `  - ${route.label}`),
        ]
      : []),
    ""
  );

  if (hostels.length > 0) {
    lines.push(
      "## Where it delivers",
      "",
      `Hostels and blocks at PAU: ${hostels.join(", ")}.`,
      ""
    );
  }

  lines.push(
    "## Ordering together",
    "",
    "Several people can share one delivery. One person can pay for everybody,",
    "or each person pays their own share and the fee is split evenly between",
    "whoever is in the car when the group closes.",
    "",
    "## Pages",
    "",
    `- Menu and ordering: ${SITE}`,
    `- Delivery to PAU, explained: ${SITE}/delivery-to-pau`,
    `- For parents sending food to a student: ${SITE}/parents`,
    `- Something we do not stock: ${SITE}/custom-order`,
    `- Help: ${SITE}/support`,
    `- Terms: ${SITE}/terms`,
    `- Privacy: ${SITE}/privacy`,
    "",
    "## Contact",
    "",
    ...(settings.whatsapp_number ? [`WhatsApp: ${settings.whatsapp_number}`] : []),
    ...(settings.instagram_handle ? [`Instagram: ${settings.instagram_handle}`] : []),
    ""
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
