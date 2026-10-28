import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { shelfPeek } from "@/lib/shelf-peek";
import { easterSunday, feastLabel, nextOf } from "@/lib/feasts";
import { lagosToday } from "@/lib/time";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";

/**
 * Easter, which in Nigeria is a hamper holiday as much as Christmas is.
 *
 * The date moves, so it is computed from the computus rather than typed.
 * A page that states a date is only worth reading while the date is true,
 * and this is exactly the date people come to a page to check.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const SHELF = "easter";

const TITLE = "Easter hampers and gifts delivered in Lagos and Ibeju-Lekki";
const BLURB =
  "Easter hampers and gifts made up and delivered across Lagos: food " +
  "hampers, chocolate, cake and a card, carried to the door. Based in " +
  "Ibeju-Lekki, delivering to Sangotedo, Awoyaya, Lakowe, Pan-Atlantic " +
  "University and anywhere in Lagos.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/easter-gifts" },
  openGraph: { title: TITLE, description: BLURB, url: "/easter-gifts" },
};

export default async function EasterPage() {
  const settings = await safeSettings();
  const shelf = await shelfPeek(SHELF);

  const day = nextOf(easterSunday, lagosToday());
  const label = feastLabel(day);
  const goodFriday = feastLabel(
    new Date(new Date(`${day}T12:00:00Z`).getTime() - 2 * 86_400_000)
      .toISOString()
      .slice(0, 10)
  );

  const chat = waLink(
    settings.whatsapp_number,
    "Hi Sudu, I want an Easter hamper. Here is who it is for and roughly " +
      "what I want to spend:"
  );

  const written: Ask[] = [
    {
      q: "When is Easter this year?",
      a: `Easter Sunday is ${label}, and Good Friday is ${goodFriday}. We deliver across the whole weekend.`,
    },
    {
      q: "Do you do Easter hampers?",
      a:
        "Yes, and they are the same idea as the Christmas ones: rice, oil, " +
        "tinned tomatoes, milk, chocolate and the rest, made up after you " +
        "order rather than packed weeks before, so you can take out what " +
        "does not suit and put in what does.",
    },
    {
      q: "Can a company send Easter hampers to staff?",
      a:
        "Yes. One list, one invoice, one delivery day, and a card in each " +
        "one with your own message. It is the same order we do at Christmas " +
        "and plenty of offices do both.",
    },
    {
      q: "What else do people send at Easter?",
      a:
        "Chocolate and sweets for children, a cake, or dinner on the Sunday " +
        "from one of the kitchens we run. For a family far from home, a " +
        "food hamper is the one that gets used.",
    },
    {
      q: "How much is an Easter hamper?",
      a: shelf.open
        ? `They start at ${naira(
            Math.min(...shelf.views.map((one) => one.food + one.runFee))
          )} with delivery in the price, and any of them can be made bigger or smaller.`
        : "Whatever you want to spend. Tell us the figure and who it is for " +
          "and we will put one together and send it back with a price before " +
          "you pay anything. Delivery is in the price.",
    },
    {
      q: "Do you deliver on Good Friday and Easter Monday?",
      a:
        "Yes. The whole long weekend is a delivery weekend here, and it is " +
        "worth saying which day you want rather than leaving it to us: a " +
        "hamper that lands on the Saturday is in the house for the Sunday.",
    },
  ];

  const asked = await askedFor("easter-gifts", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Easter hamper and gift delivery in Lagos",
        serviceType: "Gift hamper delivery",
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
        ticket={`Easter · ${label}`}
        title="Easter hampers, made up here"
        lead="Food hampers, chocolate, cake and a card, made up after you order and carried to the door anywhere in Lagos. Nothing in them is fixed."
        tone="ink"
      >
        {chat && (
          <a
            href={chat}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
          >
            Tell us what you want in one <span aria-hidden>→</span>
          </a>
        )}
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title={`Easter Sunday is ${label}`}>
          <p>
            Good Friday is {goodFriday}, and the whole long weekend is a
            delivery weekend here. Say which day you want it on: a hamper
            that lands on the Saturday is in the house for the Sunday, which
            is usually what people actually want.
          </p>
        </Section>

        <Section title="Nothing in them is fixed">
          <p>
            A hamper bought off a shelf was packed weeks ago, so the tin
            nobody wants is in the box and stays in the box. Ours are bought
            after you order: take out what is not right for the person you
            are giving it to, put in what is, and the price is worked out
            again from what is actually in it.
          </p>
        </Section>

        <Section title="What people send at Easter">
          <dl className="space-y-3">
            <Reason title="A food hamper">
              Rice, oil, tinned tomatoes, milk and the rest of a full
              cupboard. The same idea as the Christmas ones and the one that
              gets used rather than put on a shelf.
            </Reason>
            <Reason title="Chocolate and sweets">
              For children, and for anybody who has given something up for
              Lent and is counting down to the Sunday.
            </Reason>
            <Reason title="A cake, or Sunday dinner">
              From one of the kitchens we run, at a time you pick, so
              whoever usually cooks on Easter Sunday does not have to.
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
              Message us and say who it is for, where they are and roughly
              what you want to spend. We put one together, send it back with
              a price, and nothing is paid until you are happy with it.
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

        <Section title="For a company">
          <p>
            Offices send these to staff at Easter as well as at Christmas:
            one list, one invoice, one delivery day and a card in each.{" "}
            <Link href="/corporate-christmas-hampers" className="font-bold text-brand">
              How a company order works
            </Link>{" "}
            is written out, and it is the same at Easter.
          </p>
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/easter-gifts" />

        <p className="text-sm">
          {chat ? (
            <a href={chat} target="_blank" rel="noopener noreferrer" className="font-extrabold text-brand">
              Tell us what you want in one
            </a>
          ) : (
            <Link href="/custom-order" className="font-extrabold text-brand">
              Tell us what you want in one
            </Link>
          )}
        </p>
      </div>
    </article>
  );
}
