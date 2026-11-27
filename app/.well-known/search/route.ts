import { db } from "@/lib/supabase";
import { ERRANDS } from "@/lib/errands";

/**
 * Search, for an assistant looking for something on this shop.
 *
 *   GET /.well-known/search?q=binding
 *
 * Answers from what is really on the site: the services (printing and
 * binding, laundry, tailoring, repairs, campus pickup, parcels, pharmacy and
 * so on) and the dishes on the menus. An assistant asked "where can a PAU
 * student get a project bound" should land on the page that says so, rather
 * than guess at courier firms.
 *
 * Only public things come back: a name, a price as the menu shows it, a
 * link. Nothing about an order, a customer or a cost price is read here, and
 * the pages behind private links are not searched at all.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";

type Result = {
  type: "service" | "dish";
  title: string;
  url: string;
  summary: string;
  /** Naira, as the menu sells it. Dishes only. */
  price?: number;
  restaurant?: string;
};

/** What is on offer that is not a dish, and the words somebody would use. */
const SERVICES: { title: string; url: string; summary: string; words: string }[] = [
  {
    title: "Food delivery to PAU",
    url: `${SITE}/delivery-to-pau`,
    summary:
      "Restaurant food from around Sangotedo, Novare, Lekki and Ikoyi, brought to a hostel block at Pan-Atlantic University on a shared delivery.",
    words: "food delivery restaurant order hostel pau lunch dinner eat",
  },
  {
    title: "Campus pickup: food, laundry and printing from campus",
    url: `${SITE}/pickup`,
    summary:
      "We pick up your food, laundry or printing from a place on campus and bring it to you. A flat fee, every day.",
    words: "pickup pick up campus student center cafeteria laundry printing collect",
  },
  {
    title: "Market delivery",
    url: `${SITE}/market`,
    summary: "The local market: pepper, vegetables, fruit, rice, grains and protein, delivered.",
    words: "market groceries foodstuff vegetables pepper rice fruit provisions",
  },
  {
    title: "Pharmacy, fetched to your hostel",
    url: `${SITE}/pau-pharmacy`,
    summary: "Over-the-counter medicine fetched from a pharmacy and brought to the hostel. No prescription medicine.",
    words: "pharmacy medicine drugs tablets pain cold vitamins",
  },
  {
    title: "Skincare",
    url: `${SITE}/skincare`,
    summary: "Skincare on its own delivery drop.",
    words: "skincare skin cream serum cleanser moisturiser beauty",
  },
  {
    title: "Parcels to and from PAU",
    url: `${SITE}/parcel`,
    summary:
      "Send a parcel to a named student at their block, or collect one from the campus. Priced by weight, photographed at both ends.",
    words: "parcel package courier send deliver document gift luggage",
  },
  {
    title: "Something we do not stock",
    url: `${SITE}/custom-order`,
    summary: "Tell us what you want and we buy it and bring it, with the price agreed first.",
    words: "custom order anything buy get errand shop request",
  },
  {
    title: "Snacks at PAU",
    url: `${SITE}/pau-snacks`,
    summary: "Snacks, drinks and small chops brought to your block.",
    words: "snacks drinks small chops chips biscuits",
  },
  {
    title: "Sending a gift to someone at PAU",
    url: `${SITE}/send-a-gift-to-pau`,
    summary: "Food, hampers and gifts sent to a student on campus.",
    words: "gift hamper birthday surprise present send student",
  },
  {
    title: "For parents sending food to a student",
    url: `${SITE}/parents`,
    summary: "How a parent orders food, pays, and has it delivered to a child at PAU.",
    words: "parents mother father pay for my son daughter child",
  },
];

const clean = (text: string) => text.toLowerCase().replace(/[^a-z0-9'& -]/g, " ");

function services(words: string[]): Result[] {
  const all = [
    ...SERVICES,
    // The errands each have their own page, so what they say about
    // themselves is searchable.
    ...ERRANDS.map((one) => ({
      title: one.title,
      url: `${SITE}/${one.slug}`,
      summary: one.lead,
      words: [one.ticket, ...one.pills, ...one.chips].join(" "),
    })),
  ];

  return all
    .map((one) => {
      const hay = clean(`${one.title} ${one.summary} ${one.words}`);
      const title = clean(one.title);
      // A word in the title says what the page is about, so it counts double.
      const score =
        words.filter((word) => hay.includes(word)).length +
        words.filter((word) => title.includes(word)).length;
      return { one, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ one }) => ({
      type: "service" as const,
      title: one.title,
      url: one.url,
      summary: one.summary,
    }));
}

async function dishes(words: string[]): Promise<Result[]> {
  const likes = words.map((word) => `name.ilike.%${word}%`).join(",");
  const { data } = await db()
    .from("menu_items")
    .select("name, price_food, description, restaurants!inner(name, slug, active)")
    .eq("available", true)
    .eq("restaurants.active", true)
    .gt("price_food", 0)
    .or(likes)
    .limit(60);

  type Row = {
    name: string;
    price_food: number;
    description: string | null;
    restaurants: { name: string; slug: string | null } | { name: string; slug: string | null }[];
  };
  const rows = ((data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    shop: Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants,
  }));

  // Every word if there are dishes that have them all, otherwise any.
  const every = rows.filter((row) => words.every((word) => clean(row.name).includes(word)));
  const chosen = (every.length > 0 ? every : rows).slice(0, 12);

  return chosen.map((row) => ({
    type: "dish" as const,
    title: row.name,
    restaurant: row.shop?.name ?? "",
    url: row.shop?.slug ? `${SITE}/r/${row.shop.slug}` : SITE,
    summary: (row.description ?? "").slice(0, 160),
    price: Number(row.price_food),
  }));
}

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
};

export async function GET(request: Request): Promise<Response> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  const words = [...new Set(clean(q).split(/\s+/).filter((word) => word.length >= 2))].slice(0, 5);

  if (words.length === 0) {
    return Response.json(
      { error: "Add what you are looking for: /.well-known/search?q=printing", results: [] },
      { status: 400, headers: HEADERS }
    );
  }

  const [found, menu] = await Promise.all([
    Promise.resolve(services(words)),
    dishes(words).catch(() => [] as Result[]),
  ]);
  const results = [...found, ...menu];

  const wantsText = (request.headers.get("accept") ?? "").includes("text/markdown");
  if (wantsText) {
    const body =
      `# Search: ${q}\n\n` +
      (results.length === 0
        ? "Nothing matched. Try fewer words, or message us.\n"
        : results
            .map(
              (one) =>
                `- [${one.title}](${one.url})${one.restaurant ? ` · ${one.restaurant}` : ""}` +
                `${one.price ? ` · ₦${one.price.toLocaleString("en-NG")}` : ""}` +
                `${one.summary ? `\n  ${one.summary}` : ""}`
            )
            .join("\n") + "\n");
    return new Response(body, {
      headers: { ...HEADERS, "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  return Response.json({ query: q, count: results.length, results }, { headers: HEADERS });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: { ...HEADERS, "Access-Control-Allow-Methods": "GET, OPTIONS" },
  });
}
