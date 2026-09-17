import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import ItemWizard from "@/components/admin/ItemWizard";
import { db } from "@/lib/supabase";
import { createFullItem } from "../../../actions";
import type { MenuCategory, Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  const [{ data }, { data: categories }] = await Promise.all([
    db().from("restaurants").select("*").eq("id", restaurantId).maybeSingle(),
    db()
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
  ]);

  const restaurant = data as Restaurant | null;
  if (!restaurant) notFound();

  return (
    <div>
      <PageHeader
        title="Add an item"
        detail={`It goes on the ${restaurant.name} menu.`}
        backHref={`/admin/menu/${restaurantId}`}
        backLabel={restaurant.name}
      />
      <ItemWizard
        restaurantId={restaurantId}
        categories={((categories ?? []) as MenuCategory[]).map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        action={createFullItem}
      />
    </div>
  );
}
