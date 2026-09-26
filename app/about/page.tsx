import type { Metadata } from "next";
import Link from "next/link";

import { openRestaurants } from "@/lib/menu";
import { safeSettings } from "@/lib/settings";
import { liveRoutes, parcels } from "@/lib/parcels";
import { skincareOn } from "@/lib/skincare";

/**
 * Who Sudu is, said once, in one place.
 *
 * Everything else on the site is about getting somebody fed tonight. This is
 * the page that answers "what is this shop and should I trust it", which is
 * a fair question from a stranger being asked to pay sixteen thousand naira
 * before anything arrives, and the question anything summarising the shop
 * has to answer from somewhere.
 *
 * Not in the header or the tab bar, for the same reason the PAU page is not:
 * somebody already ordering does not need it.
 */
export const revalidate = 3600;

const TITLE = "About Sudu, PAU's student delivery service";
const BLURB =
  "Sudu has been delivering onto the Pan-Atlantic University campus since " +
  "2018, and won PAU's entrepreneurship award in 2021. Food, skincare and " +
  "parcels, brought to your hostel.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/about" },
  openGraph: { title: TITLE, description: BLURB, url: "/about" },
};

export default async function AboutPage() {
  const [places, settings, parcelSetup] = await Promise.all([
    openRestaurants(),
    safeSettings(),
    parcels(),
  ]);
  const routes = liveRoutes(parcelSetup.routes);
  const skincare = skincareOn(settings);

  const structured = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: TITLE,
    description: BLURB,
    mainEntity: {
      "@type": "Organization",
      name: "Sudu",
      foundingDate: "2018",
      description: BLURB,
      areaServed: {
        "@type": "Place",
        name: "Pan-Atlantic University, Ibeju-Lekki, Lagos",
      },
      award: "Pan-Atlantic University Entrepreneurship Award, 2021",
    },
  };

  return (
    <article className="space-y-8 pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold leading-tight">
          About Sudu, PAU&apos;s student delivery service
        </h1>
        <p className="text-ink/90">
          Sudu is a delivery service for Pan-Atlantic University students. We
          collect from restaurants around Sangotedo and Novare and bring the
          order onto campus, to the block you named.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold">How it started</h2>
        <p className="leading-relaxed text-muted">
          Sudu began in 2018, run by students, for students on this campus. In
          2021 it won Pan-Atlantic University&apos;s entrepreneurship award. It
          has been through quiet stretches and busy ones, and it is running
          now.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold">What Sudu does today</h2>
        <p className="leading-relaxed text-muted">
          Food from{" "}
          {places.length > 0
            ? `${places.length} restaurants, among them ${places
                .slice(0, 5)
                .map((one) => one.name)
                .join(", ")}`
            : "the restaurants around Sangotedo and Novare"}
          , collected together and brought in on one car. Several kitchens can
          go in one order, and the delivery is one fee rather than one each.
          Order with friends and it splits between you.
          {skincare && " There is a skincare shelf, which travels on its own day."}
          {routes.length > 0 &&
            " Parcels move both ways between campus and Sangotedo, Lekki, Ikoyi, the mainland and Ikorodu."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold">How to order</h2>
        <p className="leading-relaxed text-muted">
          Everything is on the website and in the app. Pick what you want,
          choose the run you want to be on, say which block you are in, and pay
          by bank transfer or by a card link we send on WhatsApp. It arrives in
          the window you were given, handed to you rather than left anywhere.
        </p>
        <p className="pt-1 text-sm">
          <Link href="/products" className="font-extrabold text-brand">
            See the menu
          </Link>
          <span className="text-muted"> · </span>
          <Link href="/delivery-to-pau" className="font-extrabold text-brand">
            Delivery to PAU
          </Link>
        </p>
      </section>
    </article>
  );
}
