import type { Metadata } from "next";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { safeSettings } from "@/lib/settings";
import HelpLine from "@/components/HelpLine";
import Link from "next/link";
import ParcelForm from "@/components/ParcelForm";
import { liveRoutes, parcels } from "@/lib/parcels";
import { hostelNames } from "@/lib/hostels";
import { lagosToday } from "@/lib/time";
import { namedPromoters } from "@/lib/promoters";

export const dynamic = "force-dynamic";

/**
 * What WhatsApp reads out beside the card. Both ends named, because nobody
 * is looking for a parcel service: they have a dress sitting in a shop in
 * Lekki and want to know whether anybody goes that way.
 */
export const metadata: Metadata = {
  // The shop's name is added by the layout. Written here as well, it came
  // out as "Send a parcel · Sudu · Sudu".
  title: "Send a parcel to or from PAU",
  alternates: { canonical: "/parcel" },
  description:
    "Sangotedo, Lekki/Ikoyi, the mainland and Ikorodu, both ways to PAU. " +
    "Collected sealed, handed over sealed, photographed at each end.",
};

export default async function ParcelPage() {
  const setup = await parcels();
  const settings = await safeSettings();
  const routes = liveRoutes(setup.routes);
  // The same list the food and skincare checkouts use. A block typed by hand
  // is misspelt every other order, and a parcel is one bag with one place to
  // take it, so it matters more here than anywhere.
  const hostels = await hostelNames();
  const promoters = await namedPromoters();

  if (!setup.on || routes.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <section className="card space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Parcels</h1>
          <p className="text-ink/75">
            We are not carrying parcels just now.{" "}
            <Link href="/" className="font-semibold text-brand">
              The food is still going out
            </Link>
            .
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Send a parcel</h1>
        <p className="text-ink/75">
          {setup.blurb ||
            "Something collected and brought to campus, or taken from campus to where it needs to be. It travels on its own trip, so you tell us where and we agree the day."}
        </p>
      </section>

      {/* Said before the form rather than under it. Every line here is one of
          the ways this goes wrong, and somebody who reads it afterwards has
          already agreed to it. */}
      <section className="card space-y-2">
        <h2 className="font-bold">Before you send it</h2>
        <ul className="space-y-1.5 text-sm text-ink/75">
          {setup.terms.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-brand">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <ParcelForm
        routes={routes}
        maxValue={setup.maxValue}
        hostels={hostels}
        promoters={promoters}
        monies={moniesOn(settings).map((code) => ({
          code,
          label: code === "GBP" ? "Pounds" : "Dollars",
          symbol: SYMBOL[code],
          rate: rateFor(settings, code),
        }))}
        today={lagosToday()}
      />
      <HelpLine number={settings.whatsapp_number} about="a parcel" page="Parcel" />
    </div>
  );
}
