import type { Metadata } from "next";
import Link from "next/link";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { activeBands, safeSettings } from "@/lib/settings";
import { skincareOn } from "@/lib/skincare";
import { naira } from "@/lib/money";

/**
 * The page for somebody who typed "things to buy at PAU" or "PAU student
 * store" into Google.
 *
 * Usually a first year, or the person packing for one, three weeks before
 * they arrive. They are not hungry: they are trying to work out what a
 * hostel room needs and where any of it comes from, on a campus with no
 * shop worth the name. So this page is a list of what people actually
 * forget, not a menu.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const TITLE = "What to buy at PAU, and where it comes from";
const BLURB =
  "Bucket, bedsheets, kettle, foodstuff, toiletries, skincare and food, " +
  "brought onto campus at Pan-Atlantic University. The shop PAU does not " +
  "have, delivered to your hostel block.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/pau-student-store" },
  openGraph: { title: TITLE, description: BLURB, url: "/pau-student-store" },
};

export default async function PauStudentStorePage() {
  const [bands, settings] = await Promise.all([activeBands(), safeSettings()]);
  const cheapest = bands.length > 0 ? bands[0] : null;
  const skincare = skincareOn(settings);

  const asked: Ask[] = [
    {
      q: "Is there a shop at Pan-Atlantic University?",
      a:
        "Not one that carries what a hostel room needs. Sudu is how most of " +
        "it gets onto campus: foodstuff, toiletries, room things, skincare " +
        "and food, ordered online and handed over at your block.",
    },
    {
      q: "What should I buy before resuming at PAU?",
      a:
        "A bucket and a washing bowl, bedsheets and a mattress protector, " +
        "hangers, a padlock, an extension socket, a rechargeable lamp, a " +
        "kettle and a bin bag roll. Then detergent, toiletries and enough " +
        "foodstuff for the first fortnight. There are packs that hold exactly " +
        "that, so nothing is forgotten.",
    },
    {
      q: "Where do PAU students buy foodstuff?",
      a:
        "Off campus, in Sangotedo, or through Sudu. A month of rice, noodles, " +
        "oil, tomatoes, milk and seasoning comes as one pack at one price, " +
        "which saves going out for it.",
    },
    {
      q: "Can I buy toiletries and sanitary products at PAU?",
      a:
        "Through Sudu, yes. Toilet roll, soap, shower gel, toothpaste, " +
        "detergent and sanitary pads are on the shelf and come in the monthly " +
        "packs, so they arrive before they run out rather than after.",
    },
    {
      q: "How much is delivery?",
      a: cheapest
        ? `Delivery starts at ${naira(cheapest.fee)}, and it is one fee for ` +
          "the car rather than a fee per item, so a full month of shopping " +
          "costs the same to bring as a packet of biscuits."
        : "One fee for the car rather than a fee per item, so a full month of " +
          "shopping costs the same to bring as a packet of biscuits.",
    },
    {
      q: "What if what I need is not on the site?",
      a:
        "Ask for it and we go and buy it. You say what it is and roughly what " +
        "it costs, and you are told the real price before any money is spent.",
    },
  ];

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Student shopping delivered to Pan-Atlantic University",
        serviceType: "Grocery, household and food delivery",
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
        ticket="What to buy · Pan-Atlantic University"
        title="The shop PAU does not have"
        lead="Room things, foodstuff, toiletries, skincare and food, carried onto campus and handed to you at your block."
        tone="ink"
      >
        <Link
          href="/collections"
          className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
        >
          See the packs <span aria-hidden>→</span>
        </Link>
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title="What a first year actually forgets">
          <p>
            In the order people remember they needed it, usually on the first
            night. Each of these is a pack already put together, so you are
            choosing one thing rather than twenty.
          </p>
          <dl className="space-y-3">
            <Reason title="The room itself">
              Bucket, washing bowl, hangers, laundry basket, padlock, bin bags,
              an extension socket and a bulb. A bedsheet and a mattress
              protector if you are coming with nothing.
            </Reason>
            <Reason title="Light and power">
              A rechargeable lamp, a power bank and a rechargeable fan. The
              three things nobody packs and everybody borrows.
            </Reason>
            <Reason title="Eating in your room">
              Kettle, flask, mug, plates and a food flask, with washing-up
              liquid to go with them.
            </Reason>
            <Reason title="A month of food">
              Rice, noodles, spaghetti, oil, tomatoes, seasoning, milk and
              garri as one pack. There is a smaller restock pack for the weeks
              in between.
            </Reason>
            <Reason title="Keeping clean">
              Toilet roll, soap, shower gel, toothpaste, detergent, sanitary
              pads. Boring, and the thing that actually runs out.
            </Reason>
            {skincare && (
              <Reason title="Skincare">
                Its own shelf, its own basket and its own day, with a couple of
                thousand products on it.{" "}
                <Link href="/skincare" className="font-bold text-brand">
                  Have a look
                </Link>
                .
              </Reason>
            )}
          </dl>
        </Section>

        <Section title="Where to start">
          <ul className="flex flex-wrap gap-2 pt-1">
            {[
              { href: "/collections", said: "Packs and boxes" },
              { href: "/products", said: "The whole menu" },
              ...(skincare ? [{ href: "/skincare", said: "Skincare" }] : []),
              { href: "/custom-order", said: "Ask us to get something" },
              { href: "/parcel", said: "Send or collect a parcel" },
              { href: "/group", said: "Order with your friends" },
            ].map((one) => (
              <li key={one.href}>
                <Link
                  href={one.href}
                  className="inline-block rounded-full bg-paper px-3 py-1.5 text-sm font-bold shadow-card"
                >
                  {one.said}
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Why it is cheaper to order together">
          <p>
            The delivery fee is for the car, not for what is in it. One person
            ordering a month of foodstuff pays it alone; four people ordering
            on the same run split it four ways and each still gets their own
            labelled bag.{" "}
            <Link href="/group" className="font-bold text-brand">
              Start a shared delivery
            </Link>{" "}
            and send the link to your block.
          </p>
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/pau-student-store" />

        <p className="text-sm">
          <Link href="/collections" className="font-extrabold text-brand">
            See the packs
          </Link>
        </p>
      </div>
    </article>
  );
}
