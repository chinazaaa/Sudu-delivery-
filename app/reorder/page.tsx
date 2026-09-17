import Link from "next/link";
import PhoneLookup from "@/components/PhoneLookup";
import ReorderCard, { type PreviousOrder } from "@/components/ReorderCard";
import { openBatches } from "@/lib/batches";
import { feeFor } from "@/lib/fees";
import { activeBands } from "@/lib/settings";
import { lastOrderForPhone, openOrderForPhone } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { SLOT_LABEL } from "@/lib/config";
import { clockLabel, weekdayLabel } from "@/lib/time";
import { db } from "@/lib/supabase";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function ReorderPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const phone = normalisePhone((await searchParams).phone ?? "");
  const previous = phone ? await lastOrderForPhone(phone) : null;
  // An order already in an open batch can be added to, rather than duplicated.
  const openOrder = phone ? await openOrderForPhone(phone) : null;

  if (!previous) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Order again</h1>
        <p className="text-ink/75">
          Your phone number brings back your last order. No password needed here.
        </p>
        <PhoneLookup initial={(await searchParams).phone} />
        <p className="text-sm text-ink/75">
          Looking for everything you have ever ordered? That is{" "}
          <Link href="/orders" className="font-semibold text-brand underline">
            My orders
          </Link>
          , opened with your number and the four-digit PIN you were given on your
          first order. Lost it? Message us and we will send it back to you.
        </p>
        {phone && (
          <p className="text-sm text-ink/75">
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
  const views = batches.map(toBatchView);

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

  const previousItems = previous.lines.reduce((count, line) => count + line.qty, 0);

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
    total: foodTotal + feeFor(previousItems, null, await activeBands()),
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Order again</h1>

      {openOrder && (
        <div className="card">
          <h2 className="font-semibold">
            You have an order in the {weekdayLabel(openOrder.batch.run_date)}{" "}
            {SLOT_LABEL[openOrder.batch.slot]} batch
          </h2>
          <p className="mt-1 text-sm text-ink/75">
            {openOrder.items} item{openOrder.items === 1 ? "" : "s"}, closing{" "}
            {clockLabel(openOrder.batch.cut_off_at)}. Add to it and it goes in the same
            bag under your name. You only pay more delivery if the extra items push you
            into a bigger load.
          </p>
          <Link
            href={`/?batch=${openOrder.batch.id}&phone=${previous.customer_phone}`}
            className="btn-primary mt-3 w-full"
          >
            Add to this order
          </Link>
        </div>
      )}

      <ReorderCard previous={view} batches={views} />
      <p className="text-sm text-muted">
        Want something different?{" "}
        <Link href="/" className="text-brand underline">
          Build a new order
        </Link>
        .
      </p>
    </div>
  );
}
