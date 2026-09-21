import { notFound } from "next/navigation";
import Link from "next/link";
import { linkView } from "@/lib/link-view";
import { hostelNames } from "@/lib/hostels";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import LinkCheckout from "@/components/LinkCheckout";
import HelpLine from "@/components/HelpLine";

export const dynamic = "force-dynamic";

/**
 * A basket somebody was sent.
 *
 * The whole point is that the deciding is already done: the food is picked,
 * the car is picked, the price is on the screen. All that is left is who they
 * are and where it goes, which is the least anybody can be asked for and
 * still get dinner.
 *
 * What it says is worked out in one place, which the app reads too, so a link
 * cannot quote one price on a phone and another in a browser.
 */
export default async function CheckoutLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = (await params).code;
  const view = await linkView(code);
  const settings = await safeSettings();

  if ("error" in view) {
    if (!view.stopped && view.error === "That link does not exist.") notFound();

    return (
      <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
        <h1 className="text-2xl font-bold">
          {view.stopped ? "This link has been stopped" : "Something on this link has gone"}
        </h1>
        <p className="text-muted">{view.error}</p>
        <Link href="/" className="btn-primary mt-2 inline-block px-6">
          See what is on
        </Link>
        <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
      </div>
    );
  }

  // Signed in on this device, so their own details fill the form in without
  // being asked for a second time.
  const signedIn = await currentCustomer();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* The heading lives inside the form rather than above it, because
          what it says depends on which of the choices they are on, and a
          server cannot follow somebody's thumb. */}
      <LinkCheckout
        code={view.code}
        title={view.title}
        when={view.when}
        estimate={view.estimate}
        note={view.note}
        me={signedIn ? await customerDetails(signedIn) : null}
        lines={view.lines}
        swaps={view.swaps}
        food={view.food}
        fee={view.fee}
        hostels={await hostelNames()}
        instead={view.instead}
        hasCardLink={view.hasCardLink}
        // A way to say something the form cannot hold: swapping the beef for
        // chicken, asking whether a second one can go in. Click to send,
        // never sent on anybody's behalf, and it opens with the basket
        // already written out so nobody has to describe what they are
        // looking at.
        askUs={
          whatsappLink(
            settings.whatsapp_number,
            `Hi Sudu, about ${view.title}:\n\n` +
              view.lines.map((line) => `${line.qty}x ${line.name}`).join("\n") +
              "\n\n"
          ) ?? ""
        }
      />

      {/* A basket somebody was sent is one thing the shop sells, not the
          only one. Anybody who opened it wanting something else should not
          have to guess that there is a menu behind it. */}
      <p className="text-center text-sm text-muted">
        Wanted something else?{" "}
        <Link href="/" className="font-semibold text-brand">
          Order anything off the menu
        </Link>
        , on this run or another.
      </p>

      <HelpLine number={settings.whatsapp_number} about="a link I was sent" />
    </div>
  );
}
