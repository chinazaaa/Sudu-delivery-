import type { Metadata } from "next";
import Link from "next/link";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { hostelNames } from "@/lib/hostels";
import { activeBands, safeSettings } from "@/lib/settings";
import { naira } from "@/lib/money";

/**
 * The page for somebody who typed "send a gift to PAU" into Google.
 *
 * Almost never a student. It is a parent in Abuja, a sister in London, a
 * boyfriend who is not on this campus, and every one of them has the same
 * two worries: whether it will actually reach the person, and whether they
 * are about to be robbed by a stranger on the internet. So the page answers
 * those, in that order, rather than selling anybody a box.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const TITLE = "Send a gift to a student at PAU";
const BLURB =
  "Send food, a cake, small chops or flowers to somebody at Pan-Atlantic " +
  "University for a birthday, a matriculation or no reason at all. You pay " +
  "from wherever you are, we hand it to them at their hostel, and you get " +
  "told when it has been handed over.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/send-a-gift-to-pau" },
  openGraph: { title: TITLE, description: BLURB, url: "/send-a-gift-to-pau" },
};

export default async function SendAGiftPage() {
  const [hostels, bands, settings] = await Promise.all([
    hostelNames(),
    activeBands(),
    safeSettings(),
  ]);
  const cheapest = bands.length > 0 ? bands[0] : null;

  const asked: Ask[] = [
    {
      q: "Can I send a gift to a student at Pan-Atlantic University?",
      a:
        "Yes. You order and pay from wherever you are, give their name, their " +
        "phone number and their hostel block, and it is handed to them on " +
        "campus. You do not have to be in Lagos, or in Nigeria.",
    },
    {
      q: "How do I know it actually reached them?",
      a:
        "Every order has a page that shows where it is, and the handover is " +
        "confirmed against a PIN that only goes to the person receiving it. " +
        "You are told when it has been handed over.",
    },
    {
      q: "What can I send?",
      a:
        "Food from any of the restaurants, a cake, small chops, ice cream, a " +
        "box already put together for a birthday or a matriculation, a care " +
        "package of foodstuff and toiletries, skincare, or something off the " +
        "menu entirely that we go and buy for you.",
    },
    {
      q: "Can I send it as a surprise?",
      a:
        "Yes. Put their name and number in as the person receiving it. They " +
        "get the message about the handover; you get the receipt. You can " +
        "add a note and it goes in with it.",
    },
    {
      q: "How much is delivery?",
      a: cheapest
        ? `Delivery starts at ${naira(cheapest.fee)} and is one fee for the ` +
          "car, not a fee per item. It is shown before you pay, with nothing " +
          "added afterwards."
        : "Delivery is one fee for the car rather than a fee per item, and it " +
          "is shown before you pay.",
    },
    {
      q: "How do I pay from outside Nigeria?",
      a:
        "By card. Say so at checkout and a payment link comes back on " +
        "WhatsApp, which works from anywhere. A bank transfer works too if you " +
        "have a Nigerian account.",
    },
    ...(hostels.length > 0
      ? [
          {
            q: "Which hostels can you deliver a gift to?",
            a: `${hostels.join(", ")}. You pick the block at checkout. If you do not know which one they are in, ask us and we will find out rather than guess.`,
          },
        ]
      : []),
    {
      q: "What if they are not in when it arrives?",
      a:
        "We call them. Nothing is left at a gate or with a stranger: it is " +
        "handed to the person it belongs to, against the PIN that was sent to " +
        "their number.",
    },
  ];

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Gift delivery to Pan-Atlantic University",
        serviceType: "Gift and food delivery",
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
        ticket="Gifts · Pan-Atlantic University"
        title="Send something to someone at PAU"
        lead="You pay from wherever you are. We hand it to them at their block and tell you when it is done."
        tone="brand"
      >
        <Link
          href="/collections"
          className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
        >
          See the boxes <span aria-hidden>→</span>
        </Link>
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title="What people send">
          <dl className="space-y-3">
            <Reason title="A box already put together">
              Birthdays, matriculation, flowers and a cake, small chops for a
              room full of people. One price with delivery already in it, and
              you can swap anything in the box you would rather not send.{" "}
              <Link href="/collections" className="font-bold text-brand">
                See the boxes
              </Link>
              .
            </Reason>
            {/* The one kind of sending this page does not try to answer.
                Foodstuff every month is a different decision from a cake on
                a birthday: it has a day of its own, it runs until somebody
                stops it, and it is written about on its own page. Two pages
                using the same words for it would mean neither of them is
                the answer to it. */}
            <Reason title="Every month, not once">
              A parent sending foodstuff and toiletries on the same day each
              month wants a care package rather than a gift, and that is its
              own thing: one day, one transfer a month, nothing to remember.{" "}
              <Link href="/parents" className="font-bold text-brand">
                Send food to your child at PAU
              </Link>
              .
            </Reason>
            <Reason title="Dinner, on a day that matters">
              Their favourite kitchen, on the run closest to the time you want
              it there. Several kitchens in one order if you cannot choose.
            </Reason>
            <Reason title="Something not on the menu at all">
              Tell us what it is and we go and buy it.{" "}
              <Link href="/custom-order" className="font-bold text-brand">
                Ask us to get it
              </Link>
              , and you are told the price before anything is spent.
            </Reason>
          </dl>
        </Section>

        <Section title="How it gets to them">
          <ol className="list-inside list-decimal space-y-1">
            <li>Put it together and pick the day you want it there.</li>
            <li>
              Put their name, their number and their block in as the person
              receiving it, not yours.
            </li>
            <li>Pay by card from anywhere, or by transfer from a Nigerian account.</li>
            <li>
              They get a PIN on their own number. It is handed over against
              that PIN and nothing else, and then you are told.
            </li>
          </ol>
        </Section>

        <Section title="Why it is safe to do from a long way away">
          <dl className="space-y-3">
            <Reason title="The PIN only ever goes to them">
              Not to us, not to a driver, not to whoever happens to be at the
              door. That is the whole point of it.
            </Reason>
            <Reason title="One page that shows where it is">
              You can watch it without having to ask anybody.
            </Reason>
            <Reason title="A shop, not a stranger">
              Sudu has been running onto this campus since 2018 and won PAU&apos;s
              entrepreneurship award in 2021.{" "}
              <Link href="/about" className="font-bold text-brand">
                Who we are
              </Link>
              .
            </Reason>
          </dl>
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/send-a-gift-to-pau" />

        <p className="text-sm">
          <Link href="/collections" className="font-extrabold text-brand">
            Send something
          </Link>
        </p>
      </div>
    </article>
  );
}
