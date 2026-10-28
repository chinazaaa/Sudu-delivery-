import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { boxesOf, occasionBySlug } from "@/lib/boxes";
import { parseAreas } from "@/lib/areas";
import { safeSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";

/**
 * The page for somebody typing "christmas hampers" within reach of us.
 *
 * Written in October on purpose. A page put up in December is a page Google
 * has never crawled in the one month it matters, and the part of this that
 * cannot be hurried is the waiting.
 *
 * Not a page per town. "Christmas hampers Ibeju-Lekki", "... Sangotedo" and
 * "... Awoyaya" are the same page with a word swapped, which is the shape
 * search engines throw away and the shape that got this shop's own gap
 * three rejected a fortnight ago. One page, and the places named in it
 * because we actually go to them.
 *
 * The hampers themselves are not written here. They are boxes on a shelf in
 * admin, priced from what is in them, so this page asks the shop what
 * exists rather than carrying a price that stops being true.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const SHELF = "christmas";

const TITLE = "Christmas hampers delivered in Ibeju-Lekki, Sangotedo and PAU";
const BLURB =
  "Christmas hampers made up and delivered around Ibeju-Lekki: Sangotedo, " +
  "Awoyaya, Lakowe, Pan-Atlantic University, Ajah and Lekki. Food hampers " +
  "and treat hampers, swap anything you do not want, and we bring it to " +
  "the door rather than leaving it at a gate.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/christmas-hampers" },
  openGraph: { title: TITLE, description: BLURB, url: "/christmas-hampers" },
};

export default async function ChristmasHampersPage() {
  const settings = await safeSettings();
  const shelf = await occasionBySlug(SHELF);
  // Only a shelf that is actually open. A page advertising hampers that
  // cannot be bought is worse than one that says to message us.
  const boxes = shelf?.active ? await boxesOf(shelf.id) : [];

  /*
   * The towns this page is actually for.
   *
   * Not the delivery areas from settings: that list is the fare table for a
   * food run, which is why it reads Ajah, Lekki, Ikoyi. Those are the places
   * where hampers are already sold by people who have sold them for years,
   * and leading with them is picking the one fight on this road worth
   * losing. The corridor is where nobody is selling and where the car
   * already goes every day.
   *
   * A box is not priced off that table anyway. It carries its own fee and
   * now takes any Lagos address, so the honest answer about range is Lagos.
   */
  const NEARBY = [
    "Sangotedo",
    "Awoyaya",
    "Lakowe",
    "Bogije",
    "Abijo",
    "Pan-Atlantic University",
  ];
  // Kept only so the delivery question can still name the food fares where
  // somebody asks about ordinary runs rather than hampers.
  const fareAreas = parseAreas(settings.delivery_areas).map((one) => one.name);

  /*
   * The way most of these will actually be sold.
   *
   * Getting somebody to agree what goes in the box is the whole job; the
   * paying is the easy part and happens afterwards. A hamper is not bought
   * the way a pizza is, because every one of them has a thing in it that
   * the person it is for does not want, so the sale is a conversation and
   * the page's job is to start one rather than to close it.
   */
  const chat = waLink(
    settings.whatsapp_number,
    "Hi Sudu, I want a Christmas hamper. Here is who it is for and what I want in it:"
  );

  const written: Ask[] = [
    {
      q: "Where can I buy a Christmas hamper in Ibeju-Lekki?",
      a:
        "Sudu makes them up and delivers them around Ibeju-Lekki: Sangotedo, " +
        "Awoyaya, Lakowe, Bogije, Abijo, Pan-Atlantic University and the " +
        "estates between them. Most hamper sellers in Lagos are on the " +
        "island and either will not come this far or put the trip on the " +
        "bill. We are already here every day.",
    },
    {
      q: "How much is a Christmas hamper?",
      a:
        "It depends what goes in it, and the price you see is the price: " +
        "delivery is already inside it, so there is nothing to add at the " +
        "end. Message us if you have a figure in mind and we will build one " +
        "to it rather than talk you up to the next size.",
    },
    {
      q: "Can I change what is inside the hamper?",
      a:
        "Yes, and this is the part most sellers cannot do. A hamper on a " +
        "shelf somewhere was packed and wrapped weeks ago, so what is in it " +
        "is what you get. We buy the contents after you order, so anything " +
        "you do not want comes out and something else goes in.",
    },
    {
      q: "Do your Christmas hampers contain alcohol?",
      a:
        "Not by default. They are built with non-alcoholic wine, so nobody " +
        "is left out of a gift. If you want the real thing in it, ask and we " +
        "will put it in.",
    },
    {
      q: "Can I send a hamper to someone else?",
      a:
        "Yes. Put their name and number on the order and we ring them rather " +
        "than you when the car is outside. It is how most of these go: " +
        "somebody paying from one place for somebody standing in another.",
    },
    {
      q: "What can I give my hostel manager or a member of staff for Christmas?",
      a:
        "A food hamper, usually. Rice, oil, tinned tomatoes, semolina and " +
        "the rest of a week's cooking reads as a serious gift in a way a box " +
        "of biscuits does not, and it is the one people actually use.",
    },
    {
      q: "When do I need to order a Christmas hamper by?",
      a:
        "Earlier than you think. December is the one month every shop on " +
        "this road runs out of things, so a hamper ordered in good time is a " +
        "hamper with what you asked for in it rather than what was left.",
    },
    {
      q: "Do you deliver hampers outside Ibeju-Lekki?",
      a:
        "Yes, anywhere in Lagos. A hamper is put together and then carried, " +
        "so it does not have to go on a food run: put the address in at the " +
        "checkout instead of a hostel block. Outside Lagos we do not " +
        "deliver, because somebody in Abuja can buy a hamper in Abuja.",
    },
  ];

  const asked = await askedFor("christmas-hampers", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Christmas hamper delivery in Ibeju-Lekki",
        serviceType: "Gift hamper delivery",
        image: `${SITE}/covers/sudu.png`,
        provider: { "@type": "Organization", name: "Sudu", url: SITE },
        areaServed: [
          { "@type": "Place", name: "Ibeju-Lekki, Lagos" },
          ...NEARBY.map((name) => ({ "@type": "Place", name: `${name}, Lagos` })),
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
        ticket="Christmas hampers · Sangotedo, Awoyaya, Lakowe, PAU"
        title="Christmas hampers, made up here"
        lead="Food hampers and treat hampers, made up after you order. Take out anything you do not want, put in anything you do, and the price is worked out from what is in it."
        tone="ink"
      >
        <Link
          href={boxes.length > 0 ? `/collections/${SHELF}` : "/custom-order"}
          className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
        >
          {boxes.length > 0 ? "See the hampers" : "Tell us what you want in one"}{" "}
          <span aria-hidden>→</span>
        </Link>
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title="Nothing in it is fixed">
          <p>
            This is the whole point, and it is the thing a shop selling
            hampers off a shelf cannot do. Theirs were packed and wrapped
            weeks ago, so the tin of fish nobody wants is in the box and
            stays in the box.
          </p>
          <p>
            Ours are bought after you order. Take out anything that is not
            right for the person you are giving it to, put in something that
            is, and the price is worked out again from what is actually in
            it. No haggling and nothing to argue about: fewer things cost
            less.
          </p>
          {chat && (
            <p>
              The easiest way is to{" "}
              <a href={chat} className="font-bold text-brand">
                message us on WhatsApp
              </a>{" "}
              and say who it is for and roughly what you want to spend. We
              will put one together, send it back with a price, and you pay
              once you are happy with it.
            </p>
          )}
        </Section>

        <Section title="Two kinds, because they are two different gifts">
          <dl className="space-y-3">
            <Reason title="A food hamper">
              Rice, oil, tinned tomatoes, semolina, and the rest of what a
              week of cooking takes. This is what goes to a hostel manager, a
              cleaner, a security man or a driver, and it is the one that gets
              used rather than put on a shelf.
            </Reason>
            <Reason title="A treat hamper">
              Biscuits, chocolate, cereal, drinks and a non-alcoholic wine.
              For a friend, a roommate, a lecturer, or anybody you are
              thanking rather than feeding.
            </Reason>
            <Reason title="Or neither, exactly">
              Tell us the figure you want to spend and who it is for, and we
              will put one together and price it before you pay anything.
            </Reason>
          </dl>
        </Section>

        {boxes.length > 0 && (
          <Section title="What is on the shelf">
            <ul className="flex flex-wrap gap-2 pt-1">
              {boxes.map((one) => (
                <li key={one.id}>
                  <Link
                    href={`/collections/${SHELF}`}
                    className="inline-block rounded-full bg-paper px-3 py-1.5 text-sm font-bold shadow-card"
                  >
                    {one.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Doing a Secret Santa instead?">
          <p>
            A{" "}
            <Link href="/santa" className="font-bold text-brand">
              Secret Santa room
            </Link>{" "}
            is a better answer for a class group, a hostel floor or an office
            than everybody buying hampers for everybody. One link for the
            group, a wishlist each, and every gift bought and delivered on the
            same day.
          </p>
        </Section>

        <Section title="Where these go">
          <p>
            Sangotedo and Pan-Atlantic University are the home ground, and the
            car is out around them every day: Awoyaya, Lakowe, Bogije, Abijo
            and the estates along the Lekki-Epe expressway. Most hamper
            sellers in Lagos are on the island and either will not come this
            far or put the trip on the bill.
          </p>
          <p>
            Beyond that we go anywhere in Lagos. A hamper is put together and
            then carried, so it does not have to travel on a food run: give
            an address at the checkout instead of a hostel block. It is
            handed over at the door rather than left with somebody at a gate.
          </p>
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/christmas-hampers" />

        <p className="text-sm">
          <Link
            href={boxes.length > 0 ? `/collections/${SHELF}` : "/custom-order"}
            className="font-extrabold text-brand"
          >
            {boxes.length > 0 ? "See the hampers" : "Ask us to build one"}
          </Link>
        </p>
      </div>
    </article>
  );
}
