import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { boxesOf, occasionBySlug } from "@/lib/boxes";
import { boxViews, type BoxView } from "@/lib/box-view";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { runDateLabel, weekdayLabel } from "@/lib/time";

/**
 * The page for an office manager buying thirty hampers at once.
 *
 * A different search and a different person from /christmas-hampers, which
 * is written for somebody buying one for their mother. This one is typed by
 * an admin manager in November: "corporate christmas hampers lagos", "end
 * of year gifts for staff", "staff christmas hampers". What they want to
 * know is not what is in it but whether we can do thirty, invoice it, and
 * land them all on one day, and none of that was answered anywhere except a
 * paragraph halfway down another page.
 *
 * It is also the page for the two dearest hampers on the shelf. A company
 * buying for a board or for clients is the only customer for a hamper at a
 * hundred thousand, and until now nothing on the site was addressed to
 * them.
 *
 * Nothing here is a second copy of the hampers. They are boxes in admin and
 * this page asks what exists, so a price changed in admin changes here too.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const SHELF = "christmas";

const TITLE = "Corporate Christmas hampers and end of year staff gifts in Lagos";
const BLURB =
  "Christmas hampers for staff, clients and whole offices, made up and " +
  "delivered across Lagos. One invoice, one delivery day, your own message " +
  "on every card, and nothing in any hamper is fixed. Based in Ibeju-Lekki " +
  "and delivering anywhere in Lagos.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/corporate-christmas-hampers" },
  openGraph: { title: TITLE, description: BLURB, url: "/corporate-christmas-hampers" },
};

export default async function CorporateHampersPage() {
  const settings = await safeSettings();
  const shelf = await occasionBySlug(SHELF);
  const boxes = shelf?.active ? await boxesOf(shelf.id) : [];
  const shown: BoxView[] = boxes.length > 0 ? await boxViews(boxes).catch(() => []) : [];

  // Cheapest and dearest, so the page can say what a head costs without
  // anybody typing a figure that stops being true in December.
  const priced = shown
    .map((one) => one.food + one.runFee)
    .sort((a, b) => a - b);
  const from = priced[0] ?? 0;
  const upTo = priced[priced.length - 1] ?? 0;

  /*
   * The promise the shelf is already making, said again here.
   *
   * It is a stronger line to a company than to anybody else: a budget
   * signed off in November and spent in December is exactly the thing a
   * price rise ruins, and "the figure we quote today is the figure" is what
   * an office manager actually needs to hear before taking it to whoever
   * approves it.
   */
  const holds = shelf?.price_holds_until ?? null;
  const holdsLabel = holds
    ? `${weekdayLabel(holds.slice(0, 10))}, ${runDateLabel(holds.slice(0, 10))}`
    : "";

  const chat = waLink(
    settings.whatsapp_number,
    "Hi Sudu, I am ordering hampers for a company. Here is how many, " +
      "roughly what we want to spend a head, and when we need them:"
  );

  const written: Ask[] = [
    {
      q: "Do you do corporate Christmas hampers in Lagos?",
      a:
        "Yes. Offices, estates, schools and small businesses order these for " +
        "staff and for clients. Tell us how many and roughly what you want " +
        "to spend a head, and we make them up, send the list back with a " +
        "price, and deliver them on the day you name.",
    },
    {
      q: "How much is a staff Christmas hamper?",
      a:
        priced.length > 0
          ? `Ours run from ${naira(from)} to ${naira(upTo)}, delivery included. ` +
            "A food hamper of rice, oil and the rest of what a week of " +
            "cooking takes is the usual one for staff. For a client or a " +
            "director it goes higher, and for a large order the price a " +
            "head comes down with the number."
          : "Tell us the figure you want to spend a head and we will put one " +
            "together to it and price it before anybody pays.",
    },
    {
      q: "Can we get one invoice for all of them?",
      a:
        "Yes. One invoice for the whole order, one transfer, and a receipt " +
        "for your records. Nothing is paid until the list and the price are " +
        "agreed, and nothing is bought until it is.",
    },
    {
      q: "Can they all be delivered on the same day?",
      a:
        "Yes, and that is the usual way: everything to one office on one " +
        "day, which is the cheapest way to do it. If they have to go to " +
        "staff at home instead, we deliver to each address across Lagos, " +
        "and that is priced per drop.",
    },
    {
      q: "Can we put the company's name or a message on them?",
      a:
        "Yes. A card goes in every hamper with whatever you want written on " +
        "it, the same message on all of them or a different name on each.",
    },
    {
      q: "Can staff hampers be different from client hampers?",
      a:
        "Yes, and they usually should be. One order can carry two or three " +
        "different hampers at different prices, and we keep them straight " +
        "and label them so the right one reaches the right person.",
    },
    {
      q: "How much notice do you need for a bulk order?",
      a:
        "A week is comfortable for thirty or so. More than that, give us two. " +
        "Hampers are bought after you order rather than packed in advance, " +
        "which is what lets you change what goes in them and is also why " +
        "the shopping takes a few days.",
    },
    {
      q: "Do you deliver corporate hampers outside Ibeju-Lekki?",
      a:
        "Anywhere in Lagos. We are based in Ibeju-Lekki and the car is out " +
        "around Sangotedo, Awoyaya, Lakowe, Abijo and Pan-Atlantic " +
        "University every day, and a hamper is carried rather than put on a " +
        "food run, so Lekki, Ikoyi, Victoria Island, Ajah and the mainland " +
        "are all ordinary deliveries. Outside Lagos we do not deliver.",
    },
  ];

  const asked = await askedFor("corporate-christmas-hampers", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Corporate Christmas hamper delivery in Lagos",
        serviceType: "Corporate gift hamper delivery",
        audience: [
          { "@type": "BusinessAudience", audienceType: "Companies, offices and schools" },
        ],
        image: `${SITE}/covers/sudu.png`,
        provider: { "@type": "Organization", name: "Sudu", url: SITE },
        areaServed: [{ "@type": "Place", name: "Lagos, Nigeria" }],
        description: BLURB,
        ...(priced.length > 0
          ? {
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "NGN",
                lowPrice: from,
                highPrice: upTo,
                offerCount: priced.length,
              },
            }
          : {}),
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
        ticket="For offices · staff and clients · anywhere in Lagos"
        title="Christmas hampers for your staff"
        lead="Thirty hampers, one invoice, one delivery day, and your own message in every one. Made up after you order, so nothing in them is fixed and nothing is paid for until the list and the price are agreed."
        tone="ink"
      >
        {chat && (
          <a
            href={chat}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
          >
            Tell us how many <span aria-hidden>→</span>
          </a>
        )}
      </PageHead>

      <div className="space-y-8 py-8">
        {holdsLabel !== "" && (
          <p className="rounded-xl border-2 border-ink bg-volt px-4 py-3 font-semibold">
            Prices quoted now hold until {holdsLabel}. Rice, oil and milk
            climb through December every year, so a budget agreed this month
            is a budget that still buys the same hamper next month.
          </p>
        )}

        <Section title="What a company order actually involves">
          <p>
            It is not one hamper thirty times. It is a list of names, a figure
            a head, a day everything has to land on, and one person who has
            to account for all of it afterwards. That is the order we are set
            up for.
          </p>
          <dl className="space-y-3">
            <Reason title="Send the list and the figure">
              How many, roughly what you want to spend a head, and who they
              are for: staff, clients, or both at different prices. We make
              up what that buys and send it back before anybody pays.
            </Reason>
            <Reason title="One invoice, one transfer">
              The whole order on one invoice, with a receipt for your records.
              Nothing is bought until the price is agreed and nothing is
              agreed off a figure we might change later.
            </Reason>
            <Reason title="One delivery day">
              Everything to the office on one day, which is the cheapest way,
              or to each person's address across Lagos if they are already on
              holiday. Handed over at the door, not left at a gate.
            </Reason>
            <Reason title="Your message in every one">
              A card in each hamper with whatever you want on it. The same
              line on all of them, or a different name on each.
            </Reason>
          </dl>
        </Section>

        <Section title="Nothing in them is fixed, which matters more at thirty">
          <p>
            A hamper bought off a shelf was packed weeks ago, so whatever is
            wrong with it is wrong with all thirty. Ours are bought after you
            order: take out what does not suit the people you are giving them
            to, put in what does, and the price is worked out again from what
            is actually in it.
          </p>
          <p>
            In practice that is the difference between a tin of something
            nobody opens in thirty houses and thirty extra bags of rice.
          </p>
        </Section>

        {shown.length > 0 && (
          <Section title="What a head costs">
            <p>
              These are the hampers as they stand, delivery included. They are
              the starting point rather than the menu: any of them can be
              made bigger or smaller, and on a large order the price a head
              comes down with the number.
            </p>
            <ul className="space-y-2">
              {shown.map((one) => (
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
              The food hampers are the ones that go to staff: rice, oil,
              tinned tomatoes, semolina and the rest of what a week of cooking
              takes, which gets used rather than put on a shelf. The dearest
              two are the ones that go to a director, a client or whoever
              signed the contract.
            </p>
          </Section>
        )}

        <Section title="A Secret Santa instead, for the team itself">
          <p>
            Hampers are what a company gives its staff. What a team does among
            itself is usually{" "}
            <Link href="/santa" className="font-bold text-brand">
              a Secret Santa
            </Link>
            , and that is a different thing we run: one link for the office, a
            wishlist each, a draw nobody can see, and every gift bought and
            delivered on the same day. The two sit together well, and plenty
            of offices do both.
          </p>
        </Section>

        <Section title="Where we deliver">
          <p>
            We are based in Ibeju-Lekki, so Sangotedo, Awoyaya, Lakowe, Abijo,
            Bogije and Pan-Atlantic University are home ground and the car is
            out around them every day. Most hamper sellers in Lagos are on the
            island and either will not come this far or put the trip on the
            bill.
          </p>
          <p>
            Beyond that, anywhere in Lagos: Lekki, Ikoyi, Victoria Island,
            Ajah and the mainland are ordinary deliveries, because a hamper is
            carried rather than put on a food run. Outside Lagos we do not
            deliver, and we would rather say that now than on the day.
          </p>
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/corporate-christmas-hampers" />

        <p className="text-sm">
          {chat ? (
            <a href={chat} target="_blank" rel="noopener noreferrer" className="font-extrabold text-brand">
              Tell us how many you need
            </a>
          ) : (
            <Link href={`/collections/${SHELF}`} className="font-extrabold text-brand">
              See the hampers
            </Link>
          )}
        </p>
      </div>
    </article>
  );
}
