import type { Metadata } from "next";
import { safeSettings } from "@/lib/settings";
import { dropLabel, nextDrop, skincareShop } from "@/lib/skincare";

/**
 * What the link draws when it is pasted into a chat.
 *
 * Nearly everybody arrives from a link somebody sent, and the shop's own card
 * talks about KFC and Domino's, which is a card about the wrong shop. The
 * skincare link says what it is and, more to the point, when it comes.
 *
 * It does not name the university. Food goes to campus and nowhere else, but
 * this goes anywhere in Lagos, and a card saying PAU turns away everybody the
 * shelf was opened for the moment the link leaves the student group.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await safeSettings();
  const shop = await skincareShop();
  const name = shop?.name ?? "Skincare";
  const blurb =
    settings.skincare_blurb ||
    `Order any day, it comes ${dropLabel(nextDrop(settings).date)}. Delivered anywhere in Lagos.`;

  return {
    title: name,
    description: blurb,
    openGraph: {
      type: "website",
      siteName: "Sudu",
      title: `${name} · Sudu`,
      description: blurb,
      url: "/skincare",
      locale: "en_NG",
    },
    twitter: { card: "summary_large_image", title: `${name} · Sudu`, description: blurb },
    alternates: { canonical: "/skincare" },
  };
}

export default function SkincareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
