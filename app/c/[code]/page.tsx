import { notFound } from "next/navigation";
import Link from "next/link";
import { getCheckoutLink } from "@/lib/checkout-links";
import { priceLines } from "@/lib/orders";
import { getBatch, isOrderable, openBatches } from "@/lib/batches";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { naira } from "@/lib/money";
import { runDateLabel, clockLabel } from "@/lib/time";
import { SLOT_LABEL } from "@/lib/config";
import LinkCheckout from "@/components/LinkCheckout";
import HelpLine from "@/components/HelpLine";

export const dynamic = "force-dynamic";

/**
 * A basket somebody was sent.
 *
 * The whole point is that the deciding is already done: the food is picked,
 * the run is picked, the price is on the screen. All that is left is who they
 * are and where it goes, which is the least anybody can be asked for and
 * still get dinner.
 */
export default async function CheckoutLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const link = await getCheckoutLink((await params).code);
  if (!link) notFound();

  const settings = await safeSettings();

  // Signed in on this device, so their own details fill the form in without
  // being asked for a second time.
  const signedIn = await currentCustomer();
  const me = signedIn ? await customerDetails(signedIn) : null;

  if (!link.active) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">This link has been stopped</h1>
        <p className="text-muted">
          It was for something that has been and gone. The menu is still open.
        </p>
        <Link href="/" className="btn-primary mt-2 inline-block px-6">
          See what is on
        </Link>
        <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
      </div>
    );
  }

  // Priced here, from the menu, every time it is opened. A link that carried
  // its own figures would quietly disagree with the shop the moment anything
  // changed, and the order itself prices from the menu regardless.
  const priced = await priceLines(link.lines);
  if ("error" in priced) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">Something on this link has gone</h1>
        <p className="text-muted">{priced.error}</p>
        <Link href="/" className="btn-primary mt-2 inline-block px-6">
          Order from the menu instead
        </Link>
      </div>
    );
  }

  const food = priced.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.qty,
    0
  );

  // The run this is for. A link made for one names it; a link made for
  // whatever is open finds the next one when somebody taps it, which is what
  // a link sitting in a group chat wants.
  const named = link.batch_id ? await getBatch(link.batch_id) : null;
  const open = await openBatches();
  const batch = named ?? (link.deliver_at ? null : open[0] ?? null);
  const gone = named !== null && !isOrderable(named);

  if (gone || (!batch && !link.deliver_at)) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">That run has closed</h1>
        <p className="text-muted">
          Nothing was charged. The same food is on the menu, and the next run is
          taking orders.
        </p>
        <Link href="/" className="btn-primary mt-2 inline-block px-6">
          Put it on the next run
        </Link>
        <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-dark">
          {link.label || "Your order"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {priced.lines.reduce((sum, line) => sum + line.qty, 0)} item
          {priced.lines.reduce((sum, line) => sum + line.qty, 0) === 1 ? "" : "s"} ·{" "}
          {naira(food)}
        </h1>
        <p className="text-ink/75">
          {link.deliver_at
            ? `Going out ${clockLabel(link.deliver_at)}, ${runDateLabel(
                link.deliver_at.slice(0, 10)
              )}`
            : batch
              ? `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot]} · ${
                  batch.delivery_window_text
                }`
              : ""}
        </p>
        {link.note !== "" && <p className="text-sm text-muted">{link.note}</p>}
      </section>

      <LinkCheckout
        code={link.short ?? link.id}
        // Somebody signed in on this phone has already told us all of this
        // once. The browser fills the rest in for everybody else.
        me={me}
        lines={priced.lines.map((line) => ({
          name: line.item.name,
          qty: line.qty,
          choices: line.options.map((one) => one.name),
          total: line.unitPrice * line.qty,
        }))}
        food={food}
        fee={link.fee}
        hostels={await hostelNames()}
        hasCardLink={link.payment_link !== ""}
      />

      <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
    </div>
  );
}
