import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { shelfPeek } from "@/lib/shelf-peek";
import { feastLabel, nextOf, valentines } from "@/lib/feasts";
import { lagosToday } from "@/lib/time";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";

/**
 * Valentine's Day, written in October for February.
 *
 * The page goes up long before anything is packed for it, because the part
 * that cannot be hurried is the waiting: a page put up in the week that
 * matters is a page nothing has had time to find. Until a shelf exists it
 * asks people to message us, which is how most of this shop's gifts are
 * actually sold anyway. The day somebody packs a box in admin, the boxes
 * appear here on their own.
 *
 * Written for the one customer nobody else is writing for: both ends of
 * this are students on the same campus, ordering late, wanting it carried
 * to a named block at a named time. Every florist in Lagos is on the
 * island and quotes a delivery that costs more than the flowers.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const SHELF = "valentines";

const TITLE = "Valentine's gifts delivered to PAU, Sangotedo and Ibeju-Lekki";
const BLURB =
  "Valentine's Day gifts delivered on the day around Ibeju-Lekki: flowers, " +
  "cake, chocolate, food and a note, carried to a hostel block or a house " +
  "at a time you pick. Pan-Atlantic University, Sangotedo, Awoyaya, Lakowe " +
  "and anywhere in Lagos.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/valentines-gifts" },
  openGraph: { title: TITLE, description: BLURB, url: "/valentines-gifts" },
};

export default async function ValentinesPage() {
  const settings = await safeSettings();
  const shelf = await shelfPeek(SHELF);

  const day = nextOf(valentines, lagosToday());
  const label = feastLabel(day);

  const chat = waLink(
    settings.whatsapp_number,
    "Hi Sudu, I want to send a Valentine's gift. Here is who it is for, " +
      "where they are and roughly what I want to spend:"
  );

  const written: Ask[] = [
    {
      q: "Can you deliver a Valentine's gift to Pan-Atlantic University?",
      a:
        `Yes. We deliver to the hostel blocks at PAU on the day itself, ` +
        `${label}, and to houses and estates around Ibeju-Lekki: Sangotedo, ` +
        "Awoyaya, Lakowe, Abijo and Bogije. It is handed over at the door " +
        "rather than left at a gate.",
    },
    {
      q: "What can I send?",
      a:
        "Flowers, a cake, chocolate, small chops, a meal from one of the " +
        "kitchens we run, or a box with several of those in it. A card with " +
        "your own message goes in whatever you send. If you want something " +
        "we do not carry, tell us and we will go and buy it.",
    },
    {
      q: "Can it arrive at a particular time?",
      a:
        "Yes, and on Valentine's that is usually the point. Tell us the " +
        "window you want it in and we work to it. Order early for the day " +
        "itself: the good windows go first and flowers have to be bought " +
        "in the morning.",
    },
    {
      q: "Can I send it without saying who it is from?",
      a:
        "Yes. The card says whatever you tell us to write, including " +
        "nothing. We take the order from you and deal with you about the " +
        "money, and the person receiving it is only called by the driver at " +
        "the door.",
    },
    {
      q: "How much does a Valentine's gift cost?",
      a: shelf.open
        ? `Boxes on the shelf start at ${naira(
            Math.min(...shelf.views.map((one) => one.food + one.runFee))
          )} with delivery in the price. Anything can be made bigger or ` +
          "smaller, and we will put one together to whatever you want to spend."
        : "Whatever you want to spend. Tell us the figure and who it is for " +
          "and we will put something together and send it back with a price " +
          "before you pay anything. Delivery is in the price.",
    },
    {
      q: "How late can I order?",
      a:
        "Message us and we will tell you honestly what can still be done " +
        "that day. Flowers and cake need the morning; food can be much " +
        "later. Leaving it until the afternoon of the day itself is the one " +
        "way to end up with nothing.",
    },
    {
      q: "Do you deliver Valentine's gifts outside Ibeju-Lekki?",
      a:
        "Anywhere in Lagos. A gift is bought and then carried, so it does " +
        "not have to travel on a food run: give us the address. Outside " +
        "Lagos we do not deliver.",
    },
  ];

  const asked = await askedFor("valentines-gifts", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Valentine's Day gift delivery in Ibeju-Lekki and PAU",
        serviceType: "Gift delivery",
        image: `${SITE}/covers/sudu.png`,
        provider: { "@type": "Organization", name: "Sudu", url: SITE },
        areaServed: [
          { "@type": "Place", name: "Pan-Atlantic University, Lagos" },
          { "@type": "Place", name: "Ibeju-Lekki, Lagos" },
          { "@type": "Place", name: "Sangotedo, Lagos" },
          { "@type": "Place", name: "Lagos, Nigeria" },
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
        ticket={`Valentine's · ${label}`}
        title="Valentine's gifts, carried to the door"
        lead="Flowers, cake, chocolate, food, or all of it in one box, delivered to a hostel block at PAU or a house around Ibeju-Lekki, at a time you pick, with your own note in it."
        tone="ink"
      >
        {chat && (
          <a
            href={chat}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
          >
            Tell us what to send <span aria-hidden>→</span>
          </a>
        )}
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title={`Valentine's is ${label}`}>
          <p>
            The gift is the easy part. What goes wrong on Valentine&apos;s is
            the carrying: the florist is in Lekki, the cake is in Ajah, and
            both want a delivery fee bigger than the thing being delivered,
            on the one day of the year when every rider in Lagos is already
            busy.
          </p>
          <p>
            We are already out here every day. One order, one price with the
            delivery in it, one person to chase, and it is handed to them at
            the door rather than left with somebody at a gate.
          </p>
        </Section>

        <Section title="What people send">
          <dl className="space-y-3">
            <Reason title="Flowers and a note">
              Bought on the morning rather than kept in a shop for a week,
              with a card in your words. Order the day before where you can:
              flowers are the one thing that genuinely runs out.
            </Reason>
            <Reason title="Cake, chocolate and small chops">
              The gift that gets shared in a room, which at a university is
              most of them. Cakes can be written on.
            </Reason>
            <Reason title="Dinner from a kitchen they like">
              Pizza, chicken, a bucket, a bowl. Sent to arrive at a time you
              pick, which matters more than what is in it.
            </Reason>
            <Reason title="A box with several of those in it">
              One price, delivery in it, and everything arrives together
              rather than in three deliveries at three different times.
            </Reason>
          </dl>
        </Section>

        {shelf.open ? (
          <Section title="What is on the shelf">
            <ul className="space-y-2">
              {shelf.views.map((one) => (
                <li key={one.id}>
                  <Link
                    href={one.slug === "" ? `/collections/${SHELF}` : `/hampers/${one.slug}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border-2 border-ink bg-paper px-4 py-3"
                  >
                    <span className="font-bold">{one.name}</span>
                    <span className="ml-auto font-display text-xl font-extrabold">
                      {naira(one.food + one.runFee)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : (
          <Section title="How to order one">
            <p>
              Message us and say who it is for, where they are, roughly what
              you want to spend and when it should arrive. We put something
              together, send it back with a price, and nothing is paid until
              you are happy with it.
            </p>
            <p>
              That is how most gifts here are actually sold, because no shelf
              ever has the exact thing somebody has in mind on this
              particular day.
            </p>
            {chat && (
              <p>
                <a href={chat} className="font-bold text-brand">
                  Message us on WhatsApp
                </a>{" "}
                and we will take it from there.
              </p>
            )}
          </Section>
        )}

        <Section title="Where these go">
          <p>
            Pan-Atlantic University and Sangotedo are home ground, and the
            car is out around them every day: Awoyaya, Lakowe, Bogije, Abijo
            and the estates along the Lekki-Epe expressway. Beyond that we
            deliver anywhere in Lagos, because a gift is bought and then
            carried rather than put on a food run.
          </p>
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/valentines-gifts" />

        <p className="text-sm">
          {chat ? (
            <a href={chat} target="_blank" rel="noopener noreferrer" className="font-extrabold text-brand">
              Tell us what to send
            </a>
          ) : (
            <Link href="/custom-order" className="font-extrabold text-brand">
              Tell us what to send
            </Link>
          )}
        </p>
      </div>
    </article>
  );
}
