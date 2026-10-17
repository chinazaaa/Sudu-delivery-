import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { openRestaurants } from "@/lib/menu";
import { activeBands, runLastHour } from "@/lib/settings";
import { FOOD_KINDS, kindHref } from "@/lib/food-kinds";
import { naira } from "@/lib/money";

/**
 * The page for somebody who typed "PAU snacks" into Google.
 *
 * A different question from "delivery to PAU", and so a different page: one
 * is somebody asking whether we come here at all, this is somebody at
 * eleven at night who wants chin chin. Nothing on it is copied from that
 * page, because four pages saying the same thing in a different order is
 * the thing a search engine throws away.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const TITLE = "Snacks delivered to PAU, Ibeju-Lekki";
const BLURB =
  "Small chops, doughnuts, ice cream, wings, pizza and drinks brought to " +
  "your hostel at Pan-Atlantic University. One car, and a delivery fee you " +
  "between everybody on the run.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/pau-snacks" },
  openGraph: { title: TITLE, description: BLURB, url: "/pau-snacks" },
};

/** The chips worth naming here: the ones somebody snacking would tap. */
const SNACKS = [
  "Small chops",
  "Doughnuts",
  "Wings",
  "Pizza",
  "Cake",
  "Shawarma",
  "Drinks",
];

export default async function PauSnacksPage() {
  const [places, bands, lastHour] = await Promise.all([
    openRestaurants(),
    activeBands(),
    // The shop's own last delivery hour, so the page cannot promise a time
    // the runs stopped doing.
    runLastHour(),
  ]);
  const cheapest = bands.length > 0 ? bands[0] : null;
  const chips = FOOD_KINDS.filter((one) => SNACKS.includes(one.label));

  const written: Ask[] = [
    {
      q: "Where can I get snacks at PAU?",
      a:
        "Sudu brings them onto campus. Small chops, doughnuts, ice cream, " +
        "wings, pizza and drinks are ordered off one menu and handed over at " +
        "your hostel block, so nobody has to leave campus for them.",
    },
    {
      q: "How much does it cost to get snacks delivered to PAU?",
      a: cheapest
        ? `The snacks cost what they cost, and delivery starts at ${naira(
            cheapest.fee
          )} for the car rather than a fee each. Order on the same run as ` +
          "your friends in a shared delivery and that one fee splits between " +
          "all of you."
        : "The snacks cost what they cost, and delivery is one fee for the " +
          "whole order rather than a fee per item, and a shared delivery " +
          "splits it between everybody in it.",
    },
    {
      q: "Can a few of us order snacks together?",
      a:
        "Yes, and it is the cheapest way to do it. Start a shared delivery, " +
        "send the link to the group, and everybody adds their own. One " +
        "delivery fee between all of you, and every bag is labelled with its " +
        "owner's name.",
    },
    {
      q: "Can I get small chops delivered to PAU?",
      a:
        "Yes. Small chops come as packs and as platters for five or ten, " +
        "which is what a room or a birthday actually needs. They are on the " +
        "menu under Small chops, and there are collection boxes built around " +
        "them.",
    },
    {
      q: "What time do snacks arrive?",
      a:
        lastHour > 0
          ? `Runs go through the day, and the last one lands by ${
              lastHour > 12 ? lastHour - 12 : lastHour
            }${lastHour >= 12 ? "pm" : "am"}. You pick which run you want to be ` +
            "on when you order, so you know before you pay."
          : "You pick which run you want to be on when you order, so you know " +
            "when it lands before you pay.",
    },
    {
      q: "Is there a minimum order for snacks?",
      a:
        "No. One doughnut is a valid order. The delivery fee is for the car " +
        "and does not change with the size of the bag, which is why ordering " +
        "with other people is worth doing.",
    },
  ];

  /*
   * The page's own wording, with anything rewritten in admin over the
   * top. Written here rather than read from there: half these answers
   * carry a live number, and a page that simply printed stored text would
   * freeze a fee into a paragraph the day somebody edited a sentence.
   */
  const asked = await askedFor("pau-snacks", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Snack delivery to Pan-Atlantic University",
        serviceType: "Food delivery",
        image: `${SITE}/covers/sudu.png`,
        provider: { "@type": "Organization", name: "Sudu", url: SITE },
        areaServed: [
          { "@type": "Place", name: "Pan-Atlantic University, Ibeju-Lekki, Lagos" },
        ],
        description: BLURB,
      },
      faqGraph(asked),
    ],
  };

  return (
    <article className="-mt-4 pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />

      <PageHead
        ticket="Snacks · Pan-Atlantic University"
        title="Snacks, brought to your block"
        lead="Small chops, doughnuts, ice cream, wings and whatever else the night calls for."
        tone="ink"
      >
        <Link
          href="/products"
          className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
        >
          See what is on <span aria-hidden>→</span>
        </Link>
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title="Start with what you fancy">
          <p>
            The menu searches across every kitchen at once, so you can look for
            the thing rather than the shop it came from.
          </p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {chips.map((one) => (
              <li key={one.label}>
                <Link
                  href={kindHref(one)}
                  className="inline-block rounded-full bg-paper px-3 py-1.5 text-sm font-bold shadow-card"
                >
                  <span aria-hidden>{one.emoji}</span> {one.label}
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Snacks for a room, not just for you">
          <dl className="space-y-3">
            <Reason title="Platters rather than packs">
              Small chops come as platters for five and for ten. One of those
              and a few drinks is most of a birthday in a hostel room.
            </Reason>
            <Reason title="Boxes already put together">
              The{" "}
              <Link href="/collections" className="font-bold text-brand">
                collections
              </Link>{" "}
              are boxes at one price with delivery already in them, so there is
              nothing to add up. Swap anything in one you do not want.
            </Reason>
            <Reason title="Everybody pays for their own">
              A{" "}
              <Link href="/group" className="font-bold text-brand">
                shared delivery
              </Link>{" "}
              gives everyone their own basket and their own bag. Nobody ends up
              collecting money afterwards.
            </Reason>
          </dl>
        </Section>

        {places.length > 0 && (
          <Section title="Where it comes from">
            <p>
              All of it travels in the same car, so an order can draw on more
              than one of these without paying twice for the drive.
            </p>
            <ul className="flex flex-wrap gap-2 pt-1">
              {places.map((one) => (
                <li key={one.id}>
                  <Link
                    href={`/r/${one.href}`}
                    className="inline-block rounded-full bg-paper px-3 py-1.5 text-sm font-bold shadow-card"
                  >
                    {one.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/pau-snacks" />

        <p className="text-sm">
          <Link href="/products" className="font-extrabold text-brand">
            Start an order
          </Link>
        </p>
      </div>
    </article>
  );
}
