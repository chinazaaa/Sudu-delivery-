import type { Metadata, Viewport } from "next";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Track from "@/components/Track";
import Ribbon from "@/components/Ribbon";
import OfferNudge from "@/components/OfferNudge";
import GroupBar from "@/components/GroupBar";
import GroupSync from "@/components/GroupSync";
import SiteHeader from "@/components/SiteHeader";
import { offerNudge, publicOffer } from "@/lib/coupons";
import { instagramLink, safeSettings } from "@/lib/settings";
import { qrSvg } from "@/lib/qr";
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
  // No canonical here on purpose. Next hands a layout's metadata down to
  // every page under it, so one written here told Google that the menu, every
  // restaurant and all four hundred dishes were copies of the front page, and
  // a copy is a page it drops. Each page says its own, below.
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
  // Read from the offer itself too: an automatic promotion has no code to
  // type, so nobody finds it unless the shop says it is on.
  const nudge = await offerNudge();
  // Drawn here because it is the same square for everybody and never
  // changes. A laptop cannot install an app; it can hold up something a
  // phone can read.
  const appQr = settings.ios_app_id
    ? await qrSvg(`https://apps.apple.com/app/id${settings.ios_app_id}`)
    : "";

  // Who this is, in the form a search engine reads rather than guesses. The
  // shop is a delivery service for one campus, and saying so plainly is the
  // difference between being a page about food and being the answer to
  // "delivery to PAU".
  const who = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.origin}/#shop`,
    name: "Sudu",
    url: SITE.origin,
    logo: `${SITE.origin}/icon.svg`,
    description: BLURB,
    areaServed: [
      { "@type": "Place", name: "Pan-Atlantic University, Lagos" },
      { "@type": "Place", name: "Sangotedo, Lagos" },
    ],
    sameAs: instagram ? [instagram] : undefined,
  };
  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE.origin,
    name: "Sudu",
    publisher: { "@id": `${SITE.origin}/#shop` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.origin}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([who, site]) }}
        />
        {/* Safari on an iPhone draws its own thin bar from this, with Apple's
            wording and a close button that means it. Nothing to design, and
            nobody on a laptop or on Android ever sees it. */}
        {settings.ios_app_id && (
          <meta name="apple-itunes-app" content={`app-id=${settings.ios_app_id}`} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Each line of the footer is there because something is set. Empty
            it in admin and it goes. */}
        <Ribbon text={settings.ribbon_text} offer={offer} />
        <SiteHeader tagline={settings.tagline || "Your Fav Foods to PAU"} />
        {/* Directly under the header, so being in a group is the first thing
            read on every page rather than something found at checkout. */}
        <GroupBar />
        <GroupSync />
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
              {/* Both app stores require these at a public address, and they
                  belong where anybody can find them anyway. */}
              <Link href="/support" className="underline">
                Help
              </Link>
              <Link href="/privacy" className="underline">
                Privacy
              </Link>
              {/* Not in the header or the tab bar: it is written for somebody
                  who has not found us yet. One link from a page that is
                  crawled is what stops it being an orphan. */}
              <Link href="/delivery-to-pau" className="underline">
                Delivery to PAU
              </Link>
              <Link href="/about" className="underline">
                About
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
        {/* A small card in the corner, once per offer, never over the cart
            or the checkout. */}
        <OfferNudge nudge={nudge} appId={settings.ios_app_id} appQr={appQr} />
        {/* Counts a view after the page is up. Never in the way of anything. */}
        <Track />
      </body>
    </html>
  );
}
