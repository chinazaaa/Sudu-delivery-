import type { Metadata, Viewport } from "next";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Track from "@/components/Track";
import Ribbon from "@/components/Ribbon";
import GroupBar from "@/components/GroupBar";
import SiteHeader from "@/components/SiteHeader";
import { publicOffer } from "@/lib/coupons";
import { instagramLink, safeSettings } from "@/lib/settings";
import "./globals.css";

/**
 * Where the site lives, for the absolute links that a share card and a
 * search engine need. Set NEXT_PUBLIC_SITE_URL to move it without a code
 * change; everything else on the site builds its links from the request, so
 * this is the only place a domain is written down.
 */
const SITE = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store");

const BLURB =
  "KFC, Domino's, Chicken Republic and more from Sangotedo, delivered to " +
  "Pan-Atlantic University. One payment, one run.";

export const metadata: Metadata = {
  metadataBase: SITE,
  title: {
    default: "Sudu, your fav foods to PAU",
    // A restaurant or a product page says its own name, then the shop's.
    template: "%s · Sudu",
  },
  description: BLURB,
  applicationName: "Sudu",
  // Nearly everyone arrives from a link pasted into a group chat, so the card
  // that link draws is the front door.
  openGraph: {
    type: "website",
    siteName: "Sudu",
    title: "Sudu, your fav foods to PAU",
    description: BLURB,
    url: SITE,
    locale: "en_NG",
  },
  twitter: { card: "summary_large_image", title: "Sudu, your fav foods to PAU", description: BLURB },
  alternates: { canonical: "/" },
};

/**
 * Explicit rather than relying on a default. maximumScale is deliberately not
 * set: pinching to zoom is somebody's way of reading a menu, and taking it
 * away to stop Safari's own zoom would be fixing the wrong thing.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await safeSettings();
  const instagram = instagramLink(settings.instagram_handle);
  const showPromoterLink = settings.hide_promoter_link !== "on";
  const showFooter = settings.hide_footer !== "on";
  // Read from the code itself, so the strip cannot outlive the offer.
  const offer = await publicOffer(settings.offer_code);
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Each line of the footer is there because something is set. Empty
            it in admin and it goes. */}
        <Ribbon text={settings.ribbon_text} offer={offer} />
        <SiteHeader tagline={settings.tagline || "Sangotedo to PAU"} />
        {/* Directly under the header, so being in a group is the first thing
            read on every page rather than something found at checkout. */}
        <GroupBar />
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:pb-24">{children}</main>
        {/* Clears both the tab bar and a sticky cart bar, which were sitting
            on top of this line. */}
        {showFooter && (
        <footer className="mx-auto max-w-5xl space-y-2 px-4 pb-44 pt-2 text-xs text-muted sm:pb-32">
          {settings.footer_line && <p>{settings.footer_line}</p>}
          {/* Always rendered: the privacy link is in here and has to be
              reachable whether or not anything else is set. */}
          <p className="flex gap-4">
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="underline">
                  Instagram
                </a>
              )}
              {showPromoterLink && (
                <Link href="/promoter" className="underline">
                  Promoters
                </Link>
              )}
              {/* The app stores require this at a public address, and it
                  belongs where anybody can find it anyway. */}
              <Link href="/privacy" className="underline">
                Privacy
              </Link>
              {settings.whatsapp_group_link && (
                <a
                  href={settings.whatsapp_group_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  PAU WhatsApp group
                </a>
              )}
          </p>
        </footer>
        )}
        {/* The footer carried the clearance for the tab bar and the sticky
            cart. With it hidden, that space still has to be there. */}
        {!showFooter && <div aria-hidden className="pb-44 sm:pb-32" />}
        <BottomNav />
        {/* Counts a view after the page is up. Never in the way of anything. */}
        <Track />
      </body>
    </html>
  );
}
