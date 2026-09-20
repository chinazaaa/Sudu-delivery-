import Link from "next/link";
import { notFound } from "next/navigation";
import PhotoGrid from "@/components/admin/PhotoGrid";
import { db } from "@/lib/supabase";
import type { MenuItem, Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

/** What marks a picture as ours: it is in our own storage, not somebody's CDN. */
const OURS = "/storage/v1/object/public/";

const PER_PAGE = 60;

/**
 * Photographing a menu, or working through a catalogue.
 *
 * Twenty pizzas fit on one screen and two thousand products do not, and a
 * page that asks for all of them gets the first thousand and quietly says
 * that is all there is. So it comes a page at a time, and it can be narrowed
 * to the ones that still need doing: nothing at all, or a picture that came
 * in with an import and is still being served from the shop it was exported
 * from.
 */
export default async function Photos({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ show?: string; page?: string }>;
}) {
  const { restaurantId } = await params;
  const asked = await searchParams;
  const show = asked.show === "theirs" || asked.show === "none" ? asked.show : "all";
  const page = Math.max(1, Number(asked.page ?? 1) || 1);

  const { data } = await db()
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .maybeSingle();
  const restaurant = data as Restaurant | null;
  if (!restaurant) notFound();

  /** One slice of the shelf, narrowed the way the tabs say. */
  const ask = (which: string, head = false) => {
    let query = db()
      .from("menu_items")
      .select(head ? "id" : "*", { count: "exact", head })
      .eq("restaurant_id", restaurantId);

    if (which === "none") query = query.eq("image_url", "");
    if (which === "theirs") {
      query = query.neq("image_url", "").not("image_url", "ilike", `%${OURS}%`);
    }
    return query.order("sort_order");
  };

  const [all, none, theirs] = await Promise.all([
    ask("all", true),
    ask("none", true),
    ask("theirs", true),
  ]);

  const from = (page - 1) * PER_PAGE;
  const { data: items } = await ask(show).range(from, from + PER_PAGE - 1);
  const list = (items ?? []) as unknown as MenuItem[];

  const total =
    (show === "none" ? none.count : show === "theirs" ? theirs.count : all.count) ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const tabs = [
    { key: "all", label: "Everything", count: all.count ?? 0 },
    { key: "theirs", label: "Not ours yet", count: theirs.count ?? 0 },
    { key: "none", label: "No picture", count: none.count ?? 0 },
  ];

  const href = (key: string, at = 1) =>
    `/admin/menu/${restaurantId}/photos?show=${key}${at > 1 ? `&page=${at}` : ""}`;

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/menu/${restaurantId}`}
        className="text-sm font-semibold text-muted hover:text-brand"
      >
        ← {restaurant.name} menu
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-extrabold">Photos · {restaurant.name}</h1>
        <p className="text-sm text-muted">
          {(none.count ?? 0) === 0 && (theirs.count ?? 0) === 0
            ? "Every picture here is ours."
            : `${theirs.count ?? 0} still on the pictures they came in with, ${
                none.count ?? 0
              } with none at all.`}{" "}
          Tap any square to replace what is there. Each picture saves on its
          own, the moment you pick it, and dropping a folder in matches them by
          filename.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={href(tab.key)}
            className={`chip ${
              show === tab.key ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
            }`}
          >
            {tab.label}
            <span className={show === tab.key ? "text-white/70" : "text-muted"}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing here. Every picture in this list is already ours.
        </p>
      ) : (
        <PhotoGrid
          items={list.map((item) => ({
            id: item.id,
            name: item.name,
            imageUrl: item.image_url ?? "",
            // What the catalogue said this one's picture is called, so a
            // folder of two thousand lands without anybody matching names.
            file: item.image_file ?? "",
          }))}
        />
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Link
            href={href(show, Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`btn-quiet px-5 py-2 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Back
          </Link>
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          <Link
            href={href(show, Math.min(pages, page + 1))}
            aria-disabled={page >= pages}
            className={`btn-quiet px-5 py-2 text-sm ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
          >
            More
          </Link>
        </div>
      )}
    </div>
  );
}
