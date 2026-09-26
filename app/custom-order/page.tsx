import type { Metadata } from "next";
import HelpLine from "@/components/HelpLine";

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
          Anything, not only food. Tell us what you want and we bring it to
          your block.
        </p>
      </header>

      {sent ? (
        <div className="card space-y-2">
          <p className="font-bold text-mint">We have it.</p>
          <p className="text-sm text-muted">
            We will message you on WhatsApp with the price. Nothing is bought
            until you say yes.
          </p>
        </div>
      ) : (
        <AskForm hostels={hostels} whatsapp={settings.whatsapp_number || null} />
      )}

      {/* Naming them is the whole job. "Anything" reads as nothing, and
          nobody works out on their own that a hem taken up is a thing you
          can ask a delivery shop for. A service is as orderable as it is
          named, and these are the ones asked for most. */}
      <p className="text-center text-sm text-muted">
        We find it, send you the price, and buy nothing until you say yes.
      </p>
      <HelpLine
        number={settings.whatsapp_number}
        about="something I asked for"
      />
    </div>
  );
}
