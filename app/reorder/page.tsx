import Link from "next/link";
import PhoneLookup from "@/components/PhoneLookup";
import ReorderCard, { type PreviousOrder } from "@/components/ReorderCard";
import { openBatches } from "@/lib/batches";
import { DELIVERY_FEE, SLOT_LABEL } from "@/lib/config";
import { lastOrderForPhone } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { clockLabel, runDateLabel, weekdayLabel } from "@/lib/time";
import { db } from "@/lib/supabase";
import type { BatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function ReorderPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const phone = normalisePhone((await searchParams).phone ?? "");
  const previous = phone ? await lastOrderForPhone(phone) : null;

  if (!previous) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Order again</h1>
        <p className="text-ink/70">
          Your phone number brings back your last order. No account, no password.
        </p>
        <PhoneLookup initial={(await searchParams).phone} />
        {phone && (
          <p className="text-sm text-ink/70">
            Nothing found for that number.{" "}
            <Link href="/" className="text-brand underline">
              Order from the menu
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  const batches = await openBatches();
  const views: BatchView[] = batches.map((batch) => ({
    id: batch.id,
    label: `${weekdayLabel(batch.run_date)} ${SLOT_LABEL[batch.slot]}`,
    cutOffISO: batch.cut_off_at,
    cutOffLabel: `${runDateLabel(batch.run_date)}, ${clockLabel(batch.cut_off_at)}`,
    deliveryWindow: batch.delivery_window_text,
    full: batch.full,
  }));

  // Prices are re-read live: an old order must never be repeated at a stale price.
  const { data: items } = await db()
    .from("menu_items")
    .select("id, price_food, available")
    .in("id", previous.lines.map((l) => l.menu_item_id));
  const prices = new Map((items ?? []).map((i) => [i.id as string, i.price_food as number]));

  const foodTotal = previous.lines.reduce(
    (total, line) => total + (prices.get(line.menu_item_id) ?? line.unit_price_at_order) * line.qty,
    0
  );

  const view: PreviousOrder = {
    phone: previous.customer_phone,
    name: previous.customer_name,
    hostel: previous.hostel,
    lines: previous.lines.map((l) => ({
      id: l.id,
      qty: l.qty,
      name: l.name,
      restaurant: l.restaurant,
    })),
    foodTotal,
    total: foodTotal + DELIVERY_FEE,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Order again</h1>
      <ReorderCard previous={view} batches={views} />
      <p className="text-sm text-ink/60">
        Want something different?{" "}
        <Link href="/" className="text-brand underline">
          Build a new order
        </Link>
        .
      </p>
    </div>
  );
}
