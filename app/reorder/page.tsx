import Link from "next/link";
import PinForm from "@/components/PinForm";
import ReorderCard, { type PreviousOrder } from "@/components/ReorderCard";
import { openBatches } from "@/lib/batches";
import { feeFor } from "@/lib/fees";
import { activeBands } from "@/lib/settings";
import { lastOrderForPhone, openOrderForPhone } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { currentCustomer } from "@/lib/customer-auth";
import { forgetMe } from "@/app/actions";
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
  // Signing in on the orders page is enough: nobody should have to type the
  // number they have already proved is theirs.
  const typed = normalisePhone((await searchParams).phone ?? "");
  const phone = typed || (await currentCustomer());
  const signedIn = !typed && phone !== null;
  const previous = phone ? await lastOrderForPhone(phone) : null;
  // An order already in an open batch can be added to, rather than duplicated.
  const openOrder = phone ? await openOrderForPhone(phone) : null;

  if (!previous) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Order again</h1>
        <p className="text-ink/75">
          {signedIn
            ? "Nothing to bring back yet under your number."
            : "Your number and the four-digit PIN from your first order bring back " +
              "everything you have ordered."}
        </p>
        {!signedIn && <PinForm next="/reorder" label="Bring back my last order" />}
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Order again</h1>
        {signedIn ? (
          <form action={forgetMe}>
            <input type="hidden" name="next" value="/reorder" />
            <button className="text-sm text-muted hover:underline">
              Not {previous.customer_name}?
            </button>
          </form>
        ) : (
          <Link href="/reorder" className="text-sm text-muted hover:underline">
            Use another number
          </Link>
        )}
      </div>

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
