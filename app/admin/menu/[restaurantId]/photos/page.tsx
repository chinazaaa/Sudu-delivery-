import Link from "next/link";
import { notFound } from "next/navigation";
import PhotoGrid from "@/components/admin/PhotoGrid";
import { db } from "@/lib/supabase";
import type { MenuItem, Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Photos({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  const [{ data }, { data: items }] = await Promise.all([
    db().from("restaurants").select("*").eq("id", restaurantId).maybeSingle(),
    db().from("menu_items").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
  ]);

  const restaurant = data as Restaurant | null;
  if (!restaurant) notFound();

  const list = (items ?? []) as MenuItem[];
  const missing = list.filter((item) => !item.image_url).length;

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
          {missing === 0
            ? "Every item has a picture."
            : `${missing} of ${list.length} item${
                list.length === 1 ? "" : "s"
              } still has no picture.`}{" "}
          Tap any square to replace what is there. Each picture saves on its own,
          the moment you pick it.
        </p>
      </div>

      <PhotoGrid
        items={list.map((item) => ({
          id: item.id,
          name: item.name,
          imageUrl: item.image_url ?? "",
        }))}
      />
    </div>
  );
}
