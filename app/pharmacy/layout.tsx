import type { Metadata } from "next";
import { safeSettings } from "@/lib/settings";
import { dropLabel, nextDrop, pharmacyPromise, pharmacyShop } from "@/lib/pharmacy";

/**
 * What the link draws when it is pasted into a chat.
 *
 * It does not name the university, for the same reason the skincare card
 * does not: this goes anywhere in Lagos, and a card saying PAU turns away
 * everybody the counter was opened for the moment the link leaves the
 * student group. What it does say is what we are, because a link to a
 * shelf of medicine that reads like a pharmacy's own is the one card
 * worth getting right.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await safeSettings();
  const shop = await pharmacyShop();
  const name = shop?.name ?? "Pharmacy";
  const blurb =
    settings.pharmacy_blurb ||
    `${pharmacyPromise(settings)} We fetch and carry, we do not advise. Order any day, it comes ${dropLabel(nextDrop(settings).date)}. Delivered anywhere in Lagos.`;

  return {
    title: name,
    description: blurb,
    openGraph: {
      type: "website",
      siteName: "Sudu",
      title: `${name} · Sudu`,
      description: blurb,
      url: "/pharmacy",
      locale: "en_NG",
    },
    twitter: { card: "summary_large_image", title: `${name} · Sudu`, description: blurb },
    alternates: { canonical: "/pharmacy" },
  };
}

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
