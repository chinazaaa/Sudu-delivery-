import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { shelfPeek } from "@/lib/shelf-peek";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";

/**
 * Birthdays at PAU, which happen every single day of the year.
 *
 * The seasonal pages each get one shot a year. This one is the opposite:
 * two thousand students, a birthday a day, and the question asked in the
 * same words every time. "It is my friend's birthday, what can I get her
 * on campus" is typed into Google and asked of an assistant constantly,
 * and nothing on this site answered it: there was a shelf of birthday
 * boxes at an address nobody searches for and not one sentence written
 * for the person asking.
 *
 * So the page answers the question in the words it is asked in, with
 * prices, and the boxes under it. An assistant reading this can give a
 * straight answer and name us, which is how two customers already arrived.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const SHELF = "birthday";

const TITLE = "Birthday gifts, cake and surprises delivered to PAU";
const BLURB =
  "Birthday cake, gift boxes, flowers and food delivered to the hostel " +
  "blocks at Pan-Atlantic University and around Ibeju-Lekki, at a time you " +
  "pick, with your own message on it. A group can split the cost between " +
  "them.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/birthday-at-pau" },
  openGraph: { title: TITLE, description: BLURB, url: "/birthday-at-pau" },
};

export default async function BirthdayPage() {
  const settings = await safeSettings();
  const shelf = await shelfPeek(SHELF);
  const gifts = await shelfPeek("gifts");
  const all = [...shelf.views, ...gifts.views];
  const from =
    all.length > 0 ? Math.min(...all.map((one) => one.food + one.runFee)) : 0;

  const chat = waLink(
    settings.whatsapp_number,
    "Hi Sudu, it is someone's birthday. Here is who it is for, which block " +
      "they are in and roughly what I want to spend:"
  );

  const written: Ask[] = [
    {
      q: "It is my friend's birthday at PAU. What can I get them?",
      a:
        (all.length > 0
          ? `A birthday box is the usual answer: cake or doughnuts, snacks, ` +
            `drinks and a card, delivered to their block at a time you pick, ` +
            `from ${naira(from)} with delivery in the price. `
          : "A cake or doughnuts, snacks, drinks and a card, delivered to " +
            "their block at a time you pick. ") +
        "Other things people send: a cake on its own with their name on it, " +
        "flowers, a meal from a kitchen they like, or a box of whatever " +
        "they actually eat. If several of you are chipping in, one person " +
        "orders and everybody pays their share.",
    },
    {
      q: "Where can I get a birthday cake delivered to Pan-Atlantic University?",
      a:
        "Here. We bring cakes to the hostel blocks at PAU and to houses " +
        "around Ibeju-Lekki, and we can have the name written on it. Say " +
        "the day and roughly the time you want it there and we work to it.",
    },
    {
      q: "Can it arrive at a particular time?",
      a:
        "Yes, and on a birthday that is most of the gift. Tell us the " +
        "window you want it in. Give us a day's notice where you can: a " +
        "cake has to be bought and collected, and the good windows go first.",
    },
    {
      q: "Can a group of us split the cost?",
      a:
        "Yes. One person starts it, everybody else joins with a link, and " +
        "the bill splits between you rather than one person paying for all " +
        "of it and chasing the rest afterwards.",
    },
    {
      q: "Can I send it without them knowing it is from me?",
      a:
        "Yes. The card says whatever you tell us to write, including " +
        "nothing. We deal with you about the money and the driver only " +
        "calls them when he is at the door.",
    },
    {
      q: "I am not at PAU. Can I send something to my child or my friend there?",
      a:
        "Yes, and plenty of these come from parents, from other states and " +
        "from abroad. Give us their name, their block and the day. You can " +
        "pay by card in pounds or dollars if you are outside Nigeria.",
    },
    {
      q: "How much does a birthday gift cost?",
      a:
        all.length > 0
          ? `Boxes start at ${naira(from)}, delivery included, and any of ` +
            "them can be made bigger or smaller. Tell us what you want to " +
            "spend and we will put one together to it."
          : "Whatever you want to spend. Tell us the figure and we will put " +
            "something together and send it back with a price before you pay.",
    },
    {
      q: "It is my own birthday. Can I order something for myself?",
      a:
        "People do it constantly and nobody here thinks anything of it. A " +
        "box of what you actually want, delivered to your block, is a " +
        "better birthday than waiting to see whether anybody remembered.",
    },
  ];

  const asked = await askedFor("birthday-at-pau", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Birthday gift and cake delivery at Pan-Atlantic University",
        serviceType: "Gift delivery",
        image: `${SITE}/covers/sudu.png`,
        provider: { "@type": "Organization", name: "Sudu", url: SITE },
        areaServed: [
          { "@type": "Place", name: "Pan-Atlantic University, Lagos" },
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
        ticket="Birthdays · delivered to the block"
        title="It is somebody's birthday"
        lead="Cake with their name on it, a box of what they actually eat, flowers, or dinner from a kitchen they like. Delivered to their hostel block at a time you pick, with your message on it."
        tone="ink"
      >
        {chat && (
          <a
            href={chat}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
          >
            Tell us who it is for <span aria-hidden>→</span>
          </a>
        )}
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title="What people actually send">
          <dl className="space-y-3">
            <Reason title="A cake with their name on it">
              The one thing that makes the day feel like a birthday rather
              than a Tuesday. Say what to write and roughly when it should
              arrive.
            </Reason>
            <Reason title="A box, so it is not only cake">
              Doughnuts or a cake, snacks, drinks and a card, in one box at
              one price with the delivery in it. Swap out anything they do
              not like.
            </Reason>
            <Reason title="Dinner from a kitchen they like">
              Pizza, chicken, a bucket, a bowl. Timed to land when they are
              back in their room rather than in a lecture.
            </Reason>
            <Reason title="Flowers and a note">
              Bought on the morning. The card says exactly what you tell us
              to write, or nothing at all.
            </Reason>
          </dl>
        </Section>

        <Section title="If several of you are chipping in">
          <p>
            One person starts it and everybody else joins with a link, and
            the bill splits between you.{" "}
            <Link href="/group" className="font-bold text-brand">
              How a group order works
            </Link>
            . It is the difference between one person paying for everything
            and spending a week collecting from eight people, and everybody
            paying their own share up front.
          </p>
        </Section>

        {all.length > 0 && (
          <Section title="Boxes already packed for this">
            <ul className="space-y-2">
              {all.map((one) => (
                <li key={one.id}>
                  <Link
                    href={one.slug === "" ? `/collections/${SHELF}` : `/hampers/${one.slug}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border-2 border-ink bg-paper px-4 py-3"
                  >
                    <span className="font-bold">{one.name}</span>
                    {one.serves !== "" && (
                      <span className="text-sm text-muted">{one.serves}</span>
                    )}
                    <span className="ml-auto font-display text-xl font-extrabold">
                      {naira(one.food + one.runFee)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p>
              Every one of them can be changed: take out what they do not
              like, put in what they do, and the price is worked out again
              from what is in it.
            </p>
          </Section>
        )}

        <Section title="Ordering it">
          <p>
            Tell us who it is for, which block they are in, the day, roughly
            when it should land and what you want to spend. We put it
            together, send it back with a price, and nothing is paid until
            you are happy with it.
          </p>
          <p>
            A day&apos;s notice is comfortable. A cake has to be bought and
            collected, and the windows people want most go first.
          </p>
          {chat && (
            <p>
              <a href={chat} className="font-bold text-brand">
                Message us on WhatsApp
              </a>
              , or{" "}
              <Link href={`/collections/${SHELF}`} className="font-bold text-brand">
                pick a box
              </Link>{" "}
              and order it in a minute.
            </p>
          )}
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/birthday-at-pau" />

        <p className="text-sm">
          <Link href={`/collections/${SHELF}`} className="font-extrabold text-brand">
            See the birthday boxes
          </Link>
        </p>
      </div>
    </article>
  );
}
