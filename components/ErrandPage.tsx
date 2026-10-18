import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Errand from "@/components/Errand";
import { faqGraph } from "@/components/Guide";
import { errandBySlug } from "@/lib/errands";
import { askedFor } from "@/lib/page-faq";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";
import { laundryList } from "@/lib/laundry";
import { PRINTING } from "@/lib/printing";
import { printPhotos } from "@/lib/print-photos";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";

/**
 * The page behind each errand, loaded once and written once.
 *
 * Six errands, six addresses, and one of these: the only thing that differs
 * between them is which spec is read. A file each would be six places to
 * fix a sentence and six chances for one of them to be missed.
 */
export function errandMeta(slug: string): Metadata {
  const spec = errandBySlug(slug);
  if (!spec) return {};
  return {
    title: spec.title,
    description: spec.lead,
    alternates: { canonical: `/${spec.slug}` },
    openGraph: {
      type: "website",
      siteName: "Sudu",
      title: `${spec.title} · Sudu`,
      description: spec.lead,
      url: `/${spec.slug}`,
      locale: "en_NG",
    },
  };
}

export default async function ErrandPage({ slug }: { slug: string }) {
  const spec = errandBySlug(slug);
  if (!spec) notFound();

  const settings = await safeSettings();
  const asked = await askedFor(spec.slug, spec.asked);
  // Only the one errand that has a price per item. The rest are quoted,
  // and a page that invented a list for them would be inventing prices.
  const prices = spec.priceList ? await laundryList() : null;
  const catalogue = spec.catalogue
    ? { groups: PRINTING, photos: await printPhotos() }
    : null;

  /*
   * Said as a service rather than as a product, because it is one.
   *
   * There is no price to mark up and nothing in stock to list. What a
   * search engine can usefully be told is what the job is, who does it and
   * where, and the questions people ask about it.
   */
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: spec.title,
        serviceType: spec.title,
        url: `${SITE}/${spec.slug}`,
        provider: { "@type": "Organization", name: "Sudu", url: SITE },
        areaServed: [
          { "@type": "Place", name: "Pan-Atlantic University, Ibeju-Lekki, Lagos" },
        ],
        description: spec.lead,
      },
      faqGraph(asked),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />
      <Errand
        spec={spec}
        asked={asked}
        hostels={await hostelNames()}
        whatsapp={settings.whatsapp_number}
        prices={prices}
        catalogue={catalogue}
      />
    </>
  );
}
