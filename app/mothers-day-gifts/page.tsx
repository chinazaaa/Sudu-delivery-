import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { shelfPeek } from "@/lib/shelf-peek";
import { feastLabel, motheringSunday, mothersDayMay, nextOf } from "@/lib/feasts";
import { lagosToday } from "@/lib/time";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";

/**
 * Mother's Day, on both of its dates.
 *
 * Nigeria keeps the British one, Mothering Sunday, three Sundays before
 * Easter. Plenty of families here keep the American one in May as well,
 * and somebody always asks which is right. One page says both and is
 * findable on either, rather than two pages competing with each other for
 * the same handful of searches.
 *
 * Both dates are computed rather than typed, because a page that states a
 * date is only worth reading while the date is true.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const SHELF = "mothers-day";

const TITLE = "Mother's Day gifts delivered in Lagos, PAU and Ibeju-Lekki";
const BLURB =
  "Mother's Day gifts delivered across Lagos: flowers, cake, a food " +
  "hamper or a meal, with your own note, carried to the door. Based in " +
  "Ibeju-Lekki, delivering to Sangotedo, Awoyaya, Lakowe, PAU and anywhere " +
  "in Lagos.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/mothers-day-gifts" },
  openGraph: { title: TITLE, description: BLURB, url: "/mothers-day-gifts" },
};

export default async function MothersDayPage() {
  const settings = await safeSettings();
  const shelf = await shelfPeek(SHELF);

  const today = lagosToday();
  const march = feastLabel(nextOf(motheringSunday, today));
  const may = feastLabel(nextOf(mothersDayMay, today));

  const chat = waLink(
    settings.whatsapp_number,
    "Hi Sudu, I want to send something for Mother's Day. Here is where she " +
      "is and roughly what I want to spend:"
  );

  const written: Ask[] = [
    {
      q: "When is Mother's Day in Nigeria?",
      a:
        `Nigeria keeps the British date, Mothering Sunday, which is ${march}. ` +
        `Some families here keep the American one instead, the second Sunday ` +
        `in May, which is ${may}. We deliver on both.`,
    },
    {
      q: "What do people send their mother?",
      a:
        "Flowers and a card, a cake, or a food hamper, which is the one " +
        "that gets used rather than put on a shelf: rice, oil, tinned " +
        "tomatoes and the rest of what a week of cooking takes. Plenty of " +
        "students send dinner from a kitchen she likes instead.",
    },
    {
      q: "I am at school and she is somewhere else in Lagos. Can you take it to her?",
      a:
        "Yes, and that is most of these orders. You order and pay from " +
        "wherever you are, we deliver to her address anywhere in Lagos, and " +
        "the driver calls her rather than you when he is at the door.",
    },
    {
      q: "Can I send it from abroad?",
      a:
        "Yes. Plenty of people order from the UK and the US for family here " +
        "and pay by card in pounds or dollars. Give us her address and the " +
        "day you want it to land on.",
    },
    {
      q: "How much is a Mother's Day gift?",
      a: shelf.open
        ? `Boxes start at ${naira(
            Math.min(...shelf.views.map((one) => one.food + one.runFee))
          )}, delivery in the price, and any of them can be made bigger or smaller.`
        : "Whatever you want to spend. Tell us the figure and we will put " +
          "something together and send it back with a price before you pay " +
          "anything. Delivery is in the price.",
    },
    {
      q: "How much notice do you need?",
      a:
        "Two or three days is comfortable, and the Sunday itself books up. " +
        "Flowers and cake want ordering the week before; food can be " +
        "arranged much later.",
    },
  ];

  const asked = await askedFor("mothers-day-gifts", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Mother's Day gift delivery in Lagos",
        serviceType: "Gift delivery",
        image: `${SITE}/covers/sudu.png`,
        provider: { "@type": "Organization", name: "Sudu", url: SITE },
        areaServed: [
          { "@type": "Place", name: "Ibeju-Lekki, Lagos" },
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
        ticket={`Mother's Day · ${march}`}
        title="Something for your mother, taken to her door"
        lead="Flowers, a cake, a food hamper or dinner from a kitchen she likes, with your own note in it. You order from wherever you are and we carry it to her, anywhere in Lagos."
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
        <Section title="Which day it is">
          <p>
            Nigeria keeps the British date, Mothering Sunday, three Sundays
            before Easter, which is <strong>{march}</strong>. Some families
            here keep the American one instead, the second Sunday in May,
            which is <strong>{may}</strong>. It is not worth arguing about
            and we deliver on both.
          </p>
        </Section>

        <Section title="What people send">
          <dl className="space-y-3">
            <Reason title="A food hamper">
              Rice, oil, tinned tomatoes, milk, semolina and the rest of a
              full cupboard. The gift that gets used rather than admired, and
              the one most people are quietly happiest to receive.
            </Reason>
            <Reason title="Flowers and a card">
              Bought on the morning rather than kept in a shop for a week,
              with your own words on the card.
            </Reason>
            <Reason title="A cake">
              Written on, if you want it written on.
            </Reason>
            <Reason title="Dinner, so she does not cook">
              From one of the kitchens we run, at a time you pick. On this
              particular Sunday that is the whole joke and it lands well.
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
              Message us with her address, the day you want it to land on and
              roughly what you want to spend. We put something together, send
              it back with a price, and nothing is paid until you are happy
              with it.
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

        <Section title="Ordering from abroad">
          <p>
            Plenty of these come from the UK and the US, for a mother here.
            You can pay by card in pounds or dollars, and the driver calls
            her rather than you when he is at the door, so the first she
            hears of it is somebody standing there with it.
          </p>
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/mothers-day-gifts" />

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
