import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import Track from "@/components/Track";
import GoogleTag from "@/components/GoogleTag";
import Ribbon from "@/components/Ribbon";
import OfferNudge from "@/components/OfferNudge";
import GroupBar from "@/components/GroupBar";
import GroupSync from "@/components/GroupSync";
import Frame from "@/components/Frame";
import ShopOnly from "@/components/ShopOnly";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { offerNudge, publicOffer } from "@/lib/coupons";
import { googleLinks, googleTagId, instagramLink, safeSettings } from "@/lib/settings";
import { liveRibbon } from "@/lib/ribbon";
import { qrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/admin-templates";
import { cookies } from "next/headers";
import { WHO_COOKIE } from "@/lib/came-from";
import { promoterCalledName } from "@/lib/promoters";
import LinkPerk from "@/components/LinkPerk";
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
  // Checked against what it points at, so a banner for a match that has been
  // played takes itself down rather than promising a box that is gone.
  const ribbon = await liveRibbon(settings).catch(() => ({
    text: settings.ribbon_text,
    href: settings.ribbon_href,
  }));
  const instagram = instagramLink(settings.instagram_handle);
  // Where the shop is on Google: the footer link, and the business details
  // a search engine reads below.
  const google = googleLinks(settings);
  // Nothing at all unless somebody has pasted a tag id into admin.
  const tag = googleTagId(settings);
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
  // Somebody who arrived on a promoter's own link, and what that link is
  // worth. Read off the coupon itself rather than a sentence typed beside
  // it, so the strip cannot go on promising ₦500 after the code has been
  // switched off, run out or had its amount changed.
  const sentBy = (await cookies()).get(WHO_COOKIE)?.value ?? "";
  const perk = sentBy ? await publicOffer(settings.promoter_perk_code) : null;
  const perkFrom = perk ? await promoterCalledName(sentBy) : "";

  // The square goes to the one address that asks the phone which store it
  // wants. A printed code is scanned by both kinds of phone, and one that
  // only ever opens the App Store is wrong half the time.
  const hasApp = settings.ios_app_id !== "" || settings.android_package !== "";
  const appQr = hasApp ? await qrSvg(`${await siteUrl()}/app`) : "";

  // Who this is, in the form a search engine reads rather than guesses. The
  // shop is a delivery service for one campus, and saying so plainly is the
  // difference between being a page about food and being the answer to
  // "delivery to PAU".
  // A local business rather than an organisation in general. The shop
  // carries food to one campus and nowhere else, and the thing that decides
  // whether it is the answer to "food delivery PAU" is saying where it
  // works, how to reach it, and which Google profile is the same shop.
  //
  // No street address and no opening hours: deliveries go out of one area
  // rather than a shopfront anybody can walk into, and inventing one to
  // satisfy a schema is the kind of thing that gets a profile suspended.
  const who = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    additionalType: "https://schema.org/FoodDelivery",
    "@id": `${SITE.origin}/#shop`,
    name: "Sudu",
    url: SITE.origin,
    // A raster, because the things that read this draw it into a card and
    // not every one of them will render an SVG.
    logo: `${SITE.origin}/logo.png`,
    image: `${SITE.origin}/covers/sudu.png`,
    description: BLURB,
    telephone: settings.whatsapp_number || undefined,
    priceRange: "₦₦",
    currenciesAccepted: "NGN",
    paymentAccepted: "Bank transfer, Card",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ibeju-Lekki",
      addressRegion: "Lagos",
      addressCountry: "NG",
    },
    areaServed: [
      { "@type": "Place", name: "Pan-Atlantic University, Ibeju-Lekki, Lagos" },
      { "@type": "Place", name: "Sangotedo, Lagos" },
    ],
    // Every other page that is also this shop, so the ones that read this
    // can tell the website and the Google profile apart from two shops with
    // the same name.
    sameAs: [instagram, google.profile].filter(Boolean),
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
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Schibsted+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
        {/* Each line of the footer is there because something is set. Empty
            it in admin and it goes. */}
        <ShopOnly>
          <Ribbon text={ribbon?.text ?? ""} href={ribbon?.href ?? ""} offer={offer} />
        </ShopOnly>
        {/* Above the header, because it is about why they are here at all
            rather than about anything on the page under it. */}
        {perk && perkFrom && <LinkPerk who={perkFrom} line={perk.line} />}
        <SiteHeader tagline={settings.tagline || "Your Fav Foods to PAU"} />
        {/* Directly under the header, so being in a group is the first thing
            read on every page rather than something found at checkout. */}
        <GroupBar />
        <GroupSync />
        {/* Room for the footer, and nothing more. The clearance for the bars
            that float over the bottom of the screen belongs to the last
            thing on the page, which is the footer: put on the main it opens
            a hole between the end of the content and the footer instead, and
            on a wide screen that hole was most of a screen of nothing. */}
        {/* The shop's column, except on the pages that draw their own edge
            to edge: admin's rail and the promoter's bar. */}
        <Frame>{children}</Frame>
        <ShopOnly>
          {showFooter && (
            <SiteFooter
              line={settings.footer_line}
              instagram={instagram}
              groupLink={settings.whatsapp_group_link}
              google={google.profile}
              showPromoterLink={showPromoterLink}
            />
          )}
          {/* The footer carried the clearance for the tab bar and the sticky
              cart. With it hidden, that space still has to be there. */}
          {!showFooter && <div aria-hidden className="pb-28 sm:pb-32 lg:pb-16" />}
        </ShopOnly>

        <BottomNav />
        {/* A small card in the corner, once per offer, never over the cart
            or the checkout. */}
        <OfferNudge
          nudge={nudge}
          appId={settings.ios_app_id}
          androidPackage={settings.android_package}
          appQr={appQr}
        />
        {/* Counts a view after the page is up. Never in the way of anything. */}
        <Track />
        {/* The only third-party script on the shop, and only where Merchant
            Center has been given a tag to report purchases against. */}
        <GoogleTag id={tag} />
      </body>
    </html>
  );
}
