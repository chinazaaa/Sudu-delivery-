import Link from "next/link";
import { notFound } from "next/navigation";
import ChangeOrder from "@/components/ChangeOrder";
import { isOrderable } from "@/lib/batches";
import { changeLinesFor } from "@/lib/change-data";
import { getOrder } from "@/lib/orders";
import { whyNotChangeable } from "@/lib/order-change";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Changing an unpaid order, on a page of its own.
 *
 * It used to open inside a box on the order page, which left a size list
 * squeezed into a few inches with the save button somewhere below it. Here
 * it has the whole screen, and the way back is one tap.
 */
export default async function ChangeOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const back = `/o/${id}`;
  const no = whyNotChangeable({
    status: order.status,
    shares: order.shares.length,
    stillOpen: isOrderable(order.batch),
  });

  const settings = await getSettings();
  const lines = no === "" ? await changeLinesFor(order, settings.ice_item_id ?? "").catch(() => []) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[28px] font-black uppercase leading-none">
          Change this order
        </h1>
        <Link href={back} className="text-sm font-semibold text-muted underline">
          Back to order
        </Link>
      </div>

      {no !== "" || lines.length === 0 ? (
        <div className="card space-y-3">
          <p className="font-bold">{no !== "" ? no : "There is nothing here to change."}</p>
          <Link href={back} className="btn-quiet w-full justify-center">
            Back to your order
          </Link>
        </div>
      ) : (
        <ChangeOrder orderId={order.id} backHref={back} lines={lines} />
      )}
    </div>
  );
}
