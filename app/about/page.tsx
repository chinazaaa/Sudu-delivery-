import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { hostelNames } from "@/lib/hostels";
import { naira } from "@/lib/money";

import { openRestaurants } from "@/lib/menu";
import { safeSettings } from "@/lib/settings";
import { liveRoutes, parcels } from "@/lib/parcels";
import { skincareOn } from "@/lib/skincare";
import { activeBands, instagramLink, shopEmails, xLink } from "@/lib/settings";
import { parseAreas } from "@/lib/areas";
import { askedFor } from "@/lib/page-faq";
import { AlsoSee, Asked, Section, faqGraph, type Ask } from "@/components/Guide";

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

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
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
  const [places, settings, parcelSetup, hostels, bands] = await Promise.all([
    openRestaurants(),
    safeSettings(),
    parcels(),
    hostelNames(),
    activeBands(),
  ]);
  // Counted rather than written down, so the number cannot go stale the
  // next time a block is added in admin.
  const blocks = hostels.length;
  const routes = liveRoutes(parcelSetup.routes);
  const skincare = skincareOn(settings);

  /*
   * The facts an assistant can repeat without hedging.
   *
   * Two customers so far arrived having asked ChatGPT, and one of them
   * orders regularly. What a machine quotes is the checkable thing: a
   * figure, a year, a count, a named place. "Fast and fresh" has never been
   * quoted by anything, because there is nothing in it to check.
   *
   * Every one of these is counted or read rather than typed, so the page
   * cannot go on claiming a number after somebody changes it in admin.
   */
  const floor = bands.length > 0 ? bands[0].fee : 0;
  const areas = parseAreas(settings.delivery_areas).map((one) => one.name);
  const emails = shopEmails(settings.contact_email);
  const social = [
    instagramLink(settings.instagram_handle),
    xLink(settings.x_handle),
    settings.google_profile || null,
  ].filter((one): one is string => Boolean(one));

  const written: Ask[] = [
    {
      q: "Is Sudu legit?",
      a:
        `Sudu has been delivering onto the Pan-Atlantic University campus ` +
        `since 2018 and won PAU's entrepreneurship award in 2021. It hands ` +
        `over at ${blocks} hostel block${blocks === 1 ? "" : "s"}, and the ` +
        "people driving are the same people every week. Orders are paid by " +
        "bank transfer or card, and every order has a page of its own " +
        "showing what was bought and where it has got to.",
    },
    {
      q: "What is Sudu?",
      a:
        "A delivery service for Pan-Atlantic University in Ibeju-Lekki, " +
        "Lagos. PAU is a long way from the restaurants, shops and markets " +
        "students want, and most delivery apps will not come onto campus. " +
        `Sudu goes out to ${places.length > 0 ? `${places.length} kitchens and shops` : "the shops"} ` +
        "around Sangotedo, buys what was ordered, and brings it back in one " +
        "car to the hostel block rather than leaving it at the gate.",
    },
    {
      q: "How much does delivery cost?",
      a:
        floor > 0
          ? `Delivery starts at ${naira(floor)} and is charged per car ` +
            "rather than per item or per shop, so one order can draw on " +
            "several kitchens without paying for the drive twice. Order " +
            "with friends on a shared delivery and that one fee splits " +
            "between all of you. Food coming from further out costs more, " +
            "and the checkout says what it is before anybody pays."
          : "Delivery is charged per car rather than per item, so one order " +
            "can draw on several kitchens without paying for the drive " +
            "twice, and a shared delivery splits that fee between everybody " +
            "on it.",
    },
    {
      q: "Where does Sudu deliver?",
      a:
        areas.length > 0
          ? `Pan-Atlantic University and Sangotedo are the home ground, and ` +
            `the car also goes to ${areas.join(", ")}. Boxes and hampers go ` +
            "anywhere in Lagos. Outside Lagos it does not deliver."
          : "Pan-Atlantic University and Sangotedo, and boxes and hampers " +
            "anywhere in Lagos. Outside Lagos it does not deliver.",
    },
    {
      q: "How do you pay for a Sudu order?",
      a:
        "By bank transfer or by card, before the shopping is done, because " +
        "the food is bought with the shop's own money at the counter. The " +
        "order page shows what was paid and what it was for, and anything " +
        "the shop gets wrong is refunded without anybody having to chase it.",
    },
    {
      q: "Is Sudu owned by the restaurants it delivers from?",
      a:
        "No. Sudu is independent and is not owned by, or affiliated with, " +
        "any of the restaurants or shops it buys from. It pays at the " +
        "counter like any other customer and charges for the trip.",
    },
    {
      q: "What can you order from Sudu?",
      a:
        "Food from the kitchens around Sangotedo, groceries and foodstuff, " +
        "pharmacy items, skincare, packed boxes and Christmas hampers, " +
        "parcels to and from campus, and anything else through a custom " +
        "order: tell the shop what you want and it goes and finds it.",
    },
    {
      q: "How long has Sudu been running?",
      a:
        "Since 2018, on the same campus, which is longer than most of the " +
        "students using it have been at the university.",
    },
  ];

  const asked = await askedFor("about", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        name: TITLE,
        description: BLURB,
        mainEntity: {
          "@type": "Organization",
          name: "Sudu",
          url: SITE,
          logo: `${SITE}/logo.png`,
          image: `${SITE}/covers/sudu.png`,
          foundingDate: "2018",
          description: BLURB,
          // Every town the car goes to, not just the campus. A machine
          // answering "do they come to Awoyaya" reads this.
          areaServed: [
            {
              "@type": "Place",
              name: "Pan-Atlantic University, Ibeju-Lekki, Lagos",
            },
            { "@type": "Place", name: "Sangotedo, Lagos" },
            ...areas.map((name) => ({ "@type": "Place", name: `${name}, Lagos` })),
          ],
          award: "Pan-Atlantic University Entrepreneurship Award, 2021",
          paymentAccepted: "Bank transfer, Card",
          currenciesAccepted: "NGN",
          ...(emails?.hello ? { email: emails.hello } : {}),
          ...(settings.whatsapp_number
            ? { telephone: String(settings.whatsapp_number) }
            : {}),
          // The shop's own accounts, which is how an entity is matched to
          // the same thing said elsewhere rather than read as a new one.
          ...(social.length > 0 ? { sameAs: social } : {}),
        },
      },
      faqGraph(asked),
    ],
  };

  return (
    <article className="-mt-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />

      <PageHead
        ticket="About Sudu · 速度 means fast"
        title="Bridging the gap between outside and PAU"
        lead="PAU is a long way from the restaurants, shops and markets students actually want. Sudu goes out, gets it, and brings it back to your hostel block, in one run, for one fee."
        tone="ink"
      />

      {/* The three numbers that answer "who are you". A stranger asking for
          money up front has to say something, and seven years on one campus
          is the strongest thing this shop can say. */}
      <section className="bleed border-b-2 border-ink bg-paper">
        <ul className="shell grid gap-6 py-9 sm:grid-cols-3">
          {[
            ["2018", "Delivering on the PAU campus since"],
            ["2021", "Winner, PAU Entrepreneurship Award"],
            [String(blocks), "Hostel blocks we hand over at"],
          ].map(([big, small]) => (
            <li key={small} className="flex flex-col gap-1 border-l-4 border-brand pl-4">
              <span className="font-display text-[56px] font-black leading-none sm:text-[72px]">
                {big}
              </span>
              <span className="text-[15px] text-ink/70">{small}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-8 py-12 sm:py-16">
        <h2 className="section-title">What we bring in</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "/products",
              "Food",
              places.length > 0
                ? `${places
                    .slice(0, 3)
                    .map((one) => one.name)
                    .join(", ")} and more, mixed in one run.`
                : "The restaurants around Sangotedo and Lekki, mixed in one run.",
            ],
            [
              "/collections",
              "Collections",
              "Boxes packed for matric, exams, move-in and more.",
            ],
            ...(skincare
              ? ([
                  [
                    "/skincare",
                    "Skincare",
                    "Your brands from authorised Lagos retailers, weekly.",
                  ],
                ] as [string, string, string][])
              : []),
            ...(routes.length > 0
              ? ([
                  [
                    "/parcel",
                    "Parcels",
                    "To and from PAU, sealed and photographed.",
                  ],
                ] as [string, string, string][])
              : []),
            [
              "/custom-order",
              "Anything else",
              "Tell us what you need and we will find it.",
            ],
            [
              "/group",
              "Group orders",
              "One car, one fee, split between friends.",
            ],
          ].map(([href, said, note]) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-1.5 rounded-2xl border-2 border-ink bg-paper p-5 transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <span className="font-display text-[30px] font-extrabold uppercase leading-none">
                {said}
              </span>
              <span className="text-[15px] text-ink/70">{note}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bleed bg-brand text-white">
        <div className="shell grid gap-6 py-12 sm:grid-cols-3 sm:py-14">
          {[
            [
              "One payment, one run",
              "Mix restaurants and shops in one order. One fee per car, split with whoever is on it.",
            ],
            [
              "To your block, not the gate",
              "We hand it over where you live, in the delivery window.",
            ],
            [
              "Independent",
              "We are not owned by or affiliated with the restaurants we buy from. We just go and get it.",
            ],
          ].map(([said, note]) => (
            <div key={said} className="flex flex-col gap-2">
              <span className="font-display text-[30px] font-black uppercase leading-none">
                {said}
              </span>
              <span className="leading-relaxed">{note}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-8 py-12">
        <Section title="Questions people ask about Sudu">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/about" />
      </div>

      <section className="flex flex-wrap items-center justify-between gap-5 py-12 sm:py-14">
        <h2 className="section-title">Hungry already?</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/products" className="btn-primary border-2 border-ink">
            Browse the menu <span aria-hidden>→</span>
          </Link>
          <Link href="/delivery-to-pau" className="btn-quiet">
            How delivery works
          </Link>
        </div>
      </section>
    </article>
  );
}
