import Link from "next/link";
import HelpLine from "@/components/HelpLine";
import { siteUrl } from "@/lib/admin-templates";
import type { Metadata } from "next";
import { rootOrder, deliveryLoad } from "@/lib/orders";
import { bandsFor } from "@/lib/skincare";
import { activeBands, safeSettings } from "@/lib/settings";
import { feeFor } from "@/lib/fees";
import { naira } from "@/lib/money";
import { SLOT_LABEL } from "@/lib/config";
import { clockLabel, runDateLabel } from "@/lib/time";
import JoinDelivery from "@/components/JoinDelivery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join a delivery",
  description: "Add your food to a delivery already coming to campus.",
};

/**
 * Somebody opened a friend's link.
 *
 * The only thing worth saying here is what it saves them, in money, before
 * they have typed anything. Then they order exactly as anybody else does: own
 * cart, own number, own payment. Only the car is shared.
 */
export default async function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await rootOrder((await params).id);
  const settings = await safeSettings();

  if (!order) return <Gone reason="That link does not point at anything." />;

  const open =
    order.batch.status === "open" &&
    order.batch.stage === "ordering" &&
    new Date(order.batch.cut_off_at).getTime() > Date.now();

  if (!open) {
    return (
      <Gone
        reason={`${order.customer_name.split(" ")[0]}'s run has already closed, so nothing more can go in it.`}
      />
    );
  }

  const bands = await bandsFor(order.batch);
  const load = await deliveryLoad(order.batch_id, order.id);

  // What one more person's food would cost to carry, as against ordering
  // alone. This is the whole argument for joining, so it is worked out rather
  // than claimed.
  const alone = feeFor(1, order.batch.flash_fee, bands);
  const joining = Math.max(
    0,
    feeFor(load.items + 1, order.batch.flash_fee, bands) - load.feeCharged
  );
  const saving = Math.max(0, alone - joining);

  const first = order.customer_name.split(" ")[0];
  const label = `${runDateLabel(order.batch.run_date)} · ${SLOT_LABEL[order.batch.slot]}`;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card space-y-2">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-dark">
          Join {first}&apos;s delivery
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {first} has food coming to campus
        </h1>
        <p className="text-ink/75">
          {label}, closing {clockLabel(order.batch.cut_off_at)}. Add yours and it
          travels in the same car.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">What it costs you</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Ordering on your own</dt>
            <dd className="font-semibold">{naira(alone)} delivery</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Joining {first}</dt>
            <dd className="font-semibold text-brand-dark">
              {joining === 0 ? "No delivery fee at all" : `${naira(joining)} delivery`}
            </dd>
          </div>
        </dl>
        {saving > 0 && (
          <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
            That is {naira(saving)} less than ordering by yourself.
          </p>
        )}
        <p className="text-xs text-muted">
          You pay for your own food on your own number, and your bag is labelled
          with your name. Delivery is priced on everything in the car, so the
          more of you there are the less each of you pays.
        </p>
      </section>

      <JoinDelivery id={order.id} name={first} />

      <p className="text-center text-xs text-muted">
        Not what you were after?{" "}
        <Link href="/" className="font-semibold text-brand">
          Order on your own instead
        </Link>
        .
      </p>

      <HelpLine
        number={settings.whatsapp_number}
        about="joining this order"
        page={`${siteUrl()}/join/${order.id}`}
      />
    </div>
  );
}

function Gone({ reason }: { reason: string }) {
  return (
    <div className="card mx-auto mt-10 max-w-md space-y-2 text-center">
      <h1 className="text-xl font-bold">Too late for this one</h1>
      <p className="text-sm text-muted">{reason}</p>
      <Link href="/" className="btn-primary mt-2 inline-block">
        See what is open now
      </Link>
    </div>
  );
}
