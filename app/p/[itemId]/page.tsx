import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";

import Thumb from "@/components/Thumb";
import { menuView } from "@/lib/menu";
import { productNotes, safeSettings } from "@/lib/settings";
import { naira } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  // `line` arrives when this was opened from the cart, so the buy box below
  // starts on the choices already made rather than blank.
  searchParams: Promise<{ line?: string }>;
}) {
  const { itemId } = await params;
  const editingKey = (await searchParams).line ?? "";
  const [menu, settings] = await Promise.all([menuView(), safeSettings()]);

  const place = menu.find((m) => m.items.some((i) => i.id === itemId));
  const item = place?.items.find((i) => i.id === itemId);
  if (!place || !item) notFound();

  const alsoFrom = place.items.filter((i) => i.id !== item.id).slice(0, 6);
  const category = place.categories.find((c) => c.id === item.categoryId);

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/" className="hover:text-ink">Menu</Link>
        <span>/</span>
        <Link href={`/r/${place.restaurant.href}`} className="hover:text-ink">
          {place.restaurant.name}
        </Link>
        {category && (
          <>
            <span>/</span>
            <span>{category.name}</span>
          </>
        )}
      </nav>

      <div className="grid gap-6 sm:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl bg-paper shadow-card">
          <div className="aspect-[4/3] sm:aspect-square">
            <Thumb src={item.imageUrl} name={item.name} rounded="rounded-none" />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <Link
              href={`/r/${place.restaurant.href}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
            >
              <span className="size-6 overflow-hidden rounded-md">
                <Thumb
                  src={place.restaurant.logoUrl}
                  name={place.restaurant.name}
                  rounded="rounded-none"
                />
              </span>
              {place.restaurant.name}
            </Link>

            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">
              {item.name}
            </h1>
            <p className="mt-1 text-2xl font-bold text-brand">{naira(item.price)}</p>
            {item.groups.length > 0 && (
              <p className="text-sm text-muted">Before choices below</p>
            )}
            {item.description && (
              <p className="mt-3 text-ink/75">{item.description}</p>
            )}
          </div>

          <AddToCart item={item} restaurant={place.restaurant} editingKey={editingKey} />

          <ul className="space-y-1 border-t border-black/5 pt-4 text-sm text-muted">
            {productNotes(settings, place.restaurant.name).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      {alsoFrom.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">More from {place.restaurant.name}</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {alsoFrom.map((other) => (
              <Link
                key={other.id}
                href={`/p/${other.id}`}
                className="w-40 shrink-0 overflow-hidden rounded-2xl bg-paper shadow-card"
              >
                <span className="block h-28">
                  <Thumb src={other.imageUrl} name={other.name} rounded="rounded-none" />
                </span>
                <span className="block p-3">
                  <span className="block truncate font-bold">{other.name}</span>
                  <span className="block text-sm text-muted">{naira(other.price)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
