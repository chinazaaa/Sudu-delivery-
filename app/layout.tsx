import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import BottomNav from "@/components/BottomNav";
import SuduBot from "@/components/bot/SuduBot";
import Track from "@/components/Track";
import ToTop from "@/components/ToTop";
import GoogleTag from "@/components/GoogleTag";
import Ribbon from "@/components/Ribbon";
import OfferNudge from "@/components/OfferNudge";
import GroupBar from "@/components/GroupBar";
import GroupSync from "@/components/GroupSync";
import Frame from "@/components/Frame";
import ShopOnly from "@/components/ShopOnly";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SeasonDecor from "@/components/SeasonDecor";
import ActingBar from "@/components/admin/ActingBar";
import { actingAs, customerDetails } from "@/lib/customer-auth";
import { stopOrderingAs } from "@/app/admin/actions";
import { offerNudge, publicOffer } from "@/lib/coupons";
import {
  googleLinks,
  googleTagId,
  instagramLink,
  safeSettings,
  shopEmails,
  xLink,
} from "@/lib/settings";
import { skincareOn } from "@/lib/skincare";
import { pharmacyOn } from "@/lib/pharmacy";
import { liveRibbon } from "@/lib/ribbon";
import { closureNotice, closureSaid } from "@/lib/closures";
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
/*
 * The three faces, fetched at build time and served from our own domain.
 *
 * They used to come from a stylesheet on fonts.googleapis.com, three
 * families in one request, sitting in front of everything: the browser
 * cannot draw a word until that file arrives, and the file is on somebody
 * else's domain, so a phone on 4G pays a DNS lookup and a TLS handshake
 * before the request even starts. Two seconds of the five it took to show
 * the headline were spent waiting on it.
 *
 * Built in, the faces ship from the same origin as the page, on a
 * connection that is already open, and the @font-face rules are inlined
 * rather than fetched. Next also works out a fallback with the same
 * metrics, so the swap when the real face lands no longer nudges the
 * layout.
 *
 * Big Shoulders Display was folded into Big Shoulders when Google
 * reorganised the family; it is the same drawing at display sizes.
 */
/*
 * The three faces, kept in the repository rather than fetched.
 *
 * next/font/google downloads these at build time, which puts Google on
 * the critical path of every deployment: a shop that cannot reach
 * fonts.gstatic.com for a minute is a shop that cannot ship a one line
 * fix. It failed exactly that way, with a module-not-found on a
 * stylesheet nobody wrote.
 *
 * The files are the same ones Google serves, latin only, which is what
 * was being asked for before. Schibsted Grotesk and Big Shoulders are
 * variable faces and carry their whole weight range in one file; IBM
 * Plex Mono is not, so it is one file per weight. Replacing them means
 * downloading from fonts.gstatic.com again, which is a thing to do
 * deliberately rather than on every build.
 */
const sans = localFont({
  src: "./fonts/schibsted-grotesk-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
});

const display = localFont({
  src: "./fonts/big-shoulders-latin.woff2",
  weight: "700 900",
  style: "normal",
  variable: "--font-display",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-500-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-600-latin.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

const SITE = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store");

/*
 * What the shop is, in the words somebody types looking for it.
 *
 * "Your fav foods to PAU" is the shop's own voice and reads well on the
 * page. It is not what anybody searches: the phrase is food delivery, and
 * the university has a full name that half the people looking for it use.
 * Both are here now, and the restaurants after them, because a name
 * somebody already knows is what makes a result worth tapping.
 */
const BLURB =
  "Food delivery to Pan-Atlantic University (PAU), Ibeju-Lekki. KFC, " +
  "Domino's, Chicken Republic and more from Sangotedo, in one order and " +
  "one payment.";

export const metadata: Metadata = {
  metadataBase: SITE,
  title: {
    // The phrase first, the shop second. A title is the one line that has
    // to earn the tap, and "Sudu" means nothing to somebody who has not
    // heard of us yet.
    default: "Food delivery to PAU, Pan-Atlantic University · Sudu",
    // A restaurant or a product page says its own name, then the shop's.
    template: "%s · Sudu",
  },
  description: BLURB,
  applicationName: "Sudu",
  // Next emits the manifest link itself from app/manifest.ts, but not this.
  // iOS only treats a site as installed, and only delivers a web push to it,
  // when it is opened from the Home Screen, and it only opens that way when
  // this is here.
  appleWebApp: { capable: true, title: "Sudu", statusBarStyle: "default" },
  // Nearly everyone arrives from a link pasted into a group chat, so the card
  // that link draws is the front door.
  openGraph: {
    type: "website",
    siteName: "Sudu",
    title: "Food delivery to PAU, Pan-Atlantic University · Sudu",
    description: BLURB,
    url: SITE,
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food delivery to PAU, Pan-Atlantic University · Sudu",
    description: BLURB,
  },
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

  /*
   * Everything else at once, rather than one after another.
   *
   * This layout wraps every page on the site, so whatever it waits for is
   * added to the time before anybody sees anything, on every visit. It was
   * asking for eight things in a row: the ribbon, then the closures, then
   * the offer, then the nudge, then the cookie, then the perk, then whose
   * link it was, then the QR square. None of the first four has anything to
   * do with the others, and a queue of round trips to Lagos and back is how
   * a page that renders in milliseconds takes a second and a half to start.
   *
   * Only the ones that genuinely depend on something still wait: the perk
   * needs the cookie read first, and the square needs the address.
   */
  const [ribbon, closed, offer, nudge, jar] = await Promise.all([
    // Checked against what it points at, so a banner for a match that has
    // been played takes itself down rather than promising a box that is
    // gone.
    liveRibbon(settings).catch(() => ({
      text: settings.ribbon_text,
      href: settings.ribbon_href,
    })),
    // A break the shop is on, or one starting inside the days anybody can
    // order into. Caught rather than left to throw: every page of the site
    // renders through here, and a list of days off is not worth taking the
    // shop down over.
    closureNotice(settings.order_horizon_days || 7).catch(() => null),
    // Read from the code itself, so the strip cannot outlive the offer.
    publicOffer(settings.offer_code),
    // Read from the offer itself too: an automatic promotion has no code to
    // type, so nobody finds it unless the shop says it is on.
    offerNudge(),
    cookies(),
  ]);

  /*
   * Whether the shop is being worn as a customer.
   *
   * Only ever set behind the admin password, and signed, so it is not a
   * cookie anybody can write for themselves. The name is read so the strip
   * can say who it is rather than eleven digits, and quietly: a shop that
   * will not load because the customer book is having a bad minute is a
   * worse failure than a strip that says the number.
   */
  const taking = await actingAs().catch(() => null);
  const takingName = taking
    ? (await customerDetails(taking).catch(() => null))?.name ?? ""
    : "";
  const instagram = instagramLink(settings.instagram_handle);
  const x = xLink(settings.x_handle);
  const email = shopEmails(settings.contact_email);
  // Where the shop is on Google: the footer link, and the business details
  // a search engine reads below.
  const google = googleLinks(settings);
  // Nothing at all unless somebody has pasted a tag id into admin.
  const tag = googleTagId(settings);
  const showPromoterLink = settings.hide_promoter_link !== "on";
  const showFooter = settings.hide_footer !== "on";

  /*
   * The counters that are open, as the two bars should list them.
   *
   * One list for the header and the footer, so they cannot come to disagree
   * about what the shop sells, and built here because both bars are client
   * components with no way to ask settings. A counter that is switched off
   * is left out rather than linked: the page it points at is a not-found
   * while it is off.
   */
  const counters: [string, string][] = [
    ...(skincareOn(settings) ? ([["/skincare", "Skincare"]] as [string, string][]) : []),
    ...(pharmacyOn(settings) ? ([["/pharmacy", "Pharmacy"]] as [string, string][]) : []),
  ];
  // Somebody who arrived on a promoter's own link, and what that link is
  // worth. Read off the coupon itself rather than a sentence typed beside
  // it, so the strip cannot go on promising ₦500 after the code has been
  // switched off, run out or had its amount changed. Both together: the
  // coupon and the name are two different tables and neither waits on the
  // other, only on the cookie that has already been read.
  const sentBy = jar.get(WHO_COOKIE)?.value ?? "";
  const [perk, perkFrom] = sentBy
    ? await Promise.all([
        publicOffer(settings.promoter_perk_code),
        promoterCalledName(sentBy),
      ])
    : [null, ""];

  // The square goes to the one address that asks the phone which store it
  // wants. A printed code is scanned by both kinds of phone, and one that
  // only ever opens the App Store is wrong half the time.
  // Drawn here because it is the same square for everybody and never
  // changes. A laptop cannot install an app; it can hold up something a
  // phone can read.
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
    // A written address as well as a number: several of the things that
    // read this will not use a phone number at all.
    email: email?.hello || undefined,
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
    sameAs: [instagram, x, google.profile].filter(Boolean),
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
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      /*
       * What the shop is dressed for, if anything.
       *
       * One attribute at the root, so the styling is a handful of CSS rules
       * under one selector rather than a condition inside every component
       * that happens to be coloured. Clearing the setting takes the lot off
       * at once, which is the only way a seasonal theme is safe to turn on:
       * nobody wants to be hunting for a pumpkin in November.
       */
      {...(settings.season.trim() !== ""
        ? { "data-season": settings.season.trim().toLowerCase() }
        : {})}
    >
      <body>
        {/* Above everything, including the season and the ribbon.

            The shop can be worn as a customer, so that somebody who
            ordered on WhatsApp gets a real order placed with the real
            search, the real choices and the real checkout. The one way
            that goes wrong is somebody walking away still wearing it, so
            it says so on every page, in a colour nothing else uses, with
            the way out beside it. */}
        {taking && (
          <ActingBar
            name={takingName}
            phone={taking}
            stop={stopOrderingAs}
          />
        )}
        {/* Over the page, and only when a season is on. Not on the back of
            the shop: a pumpkin drifting across tonight's run sheet is a
            decoration on somebody's work. */}
        <ShopOnly>
          <SeasonDecor season={settings.season.trim().toLowerCase()} />
        </ShopOnly>
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
        {/* Each line of the footer is there because something is set. Empty
            it in admin and it goes. */}
        <ShopOnly>
          <Ribbon text={ribbon?.text ?? ""} href={ribbon?.href ?? ""} offer={offer} />
          {/* A break, said on the way in.

              Without it the shop simply has fewer days in its selector,
              which reads as a shop that has stopped working rather than one
              that is shut for the week, and the difference matters to
              somebody deciding whether to come back. Under the ribbon
              rather than instead of it: an offer and a closure are both
              true, and the closure is the one about today, so it sits
              closer to the page.

              Only ever a closure that is on now or starts inside the days a
              customer can order into. Further out than that it is not news,
              and a line along the top of every page learns to be scrolled
              past before the week it is about. */}
          {closed && (
            <div className="border-b-2 border-ink bg-volt px-4 py-2 text-center text-ink">
              <p className="mx-auto max-w-5xl text-xs font-semibold sm:text-sm">
                {closureSaid(closed)}
              </p>
            </div>
          )}
        </ShopOnly>
        {/* Above the header, because it is about why they are here at all
            rather than about anything on the page under it. */}
        {perk && perkFrom && <LinkPerk who={perkFrom} line={perk.line} />}
        <SiteHeader tagline={settings.tagline || "Your Fav Foods to PAU"} counters={counters} />
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
              counters={counters}
              line={settings.footer_line}
              instagram={instagram}
              x={x}
              email={email?.hello ?? ""}
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
        {/* The ordering chat, on the shop and never on admin. Off until it
            is switched on in Settings, so it can sit in the code without
            sitting on anybody's screen. */}
        {settings.bot_on === "on" && (
          <ShopOnly>
            <SuduBot whatsapp={settings.whatsapp_number} />
          </ShopOnly>
        )}
        {/* A small card in the corner, once per offer, never over the cart
            or the checkout. */}
        <ShopOnly>
          <OfferNudge
            nudge={nudge}
            appId={settings.ios_app_id}
            androidPackage={settings.android_package}
            appQr={appQr}
          />
        </ShopOnly>
        {/* A new page opens at the top of itself, rather than showing the
            footer for a frame on the way there. */}
        <ToTop />
        {/* Counts a view after the page is up. Never in the way of anything. */}
        <Track />
        {/* The only third-party script on the shop, and only where Merchant
            Center has been given a tag to report purchases against. */}
        <GoogleTag id={tag} />
      </body>
    </html>
  );
}
