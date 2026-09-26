import type { Metadata } from "next";

import AskForm from "@/components/AskForm";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const TITLE = "Can't find it? We'll get it for you";
const BLURB =
  "Ask Sudu for anything that is not on the menu and we will find it, price " +
  "it and bring it to your Pan-Atlantic University hostel.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/custom-order" },
  openGraph: { title: TITLE, description: BLURB, url: "/custom-order" },
};

/**
 * Asking for something the shop does not carry.
 *
 * Nothing behind this is automatic: a request is a message to whoever is
 * running the shop, answered by hand on WhatsApp. That is the point. It
 * costs nothing to offer, and what people ask for is the cheapest way there
 * is of learning what to stock: enough of the same request and it stops
 * being a request and becomes a product.
 */
export default async function CustomOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const sent = (await searchParams).sent === "1";
  const [hostels, settings] = await Promise.all([hostelNames(), safeSettings()]);

  return (
    <div className="space-y-4 pb-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-extrabold leading-tight">
          Can&apos;t find what you need?
        </h1>
        <p className="text-muted">
          Tell Sudu what you are looking for. We will find it and deliver it to
          your PAU hostel. Anything, not only food: a charger, a cake from a
          bakery that is not on here, something from a shop in town.
        </p>
      </header>

      {sent ? (
        <div className="card space-y-2">
          <p className="font-bold text-mint">We have it.</p>
          <p className="text-sm text-muted">
            Somebody will look for it and message you on WhatsApp with what it
            costs, delivery included. Nothing is bought until you say yes.
          </p>
        </div>
      ) : (
        <AskForm hostels={hostels} whatsapp={settings.whatsapp_number || null} />
      )}

      <section className="card space-y-2 text-sm">
        <p className="font-bold">How it works</p>
        <ol className="list-inside list-decimal space-y-1 text-muted">
          <li>You say what you want, roughly is fine.</li>
          <li>We find it and send you the price, with delivery in it.</li>
          <li>You say yes or no. Nothing is bought until you do.</li>
          <li>It comes to your block on the next run that suits.</li>
        </ol>
      </section>
    </div>
  );
}
