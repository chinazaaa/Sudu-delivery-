import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";
import PageHead from "@/components/PageHead";
import GoogleSays from "@/components/GoogleSays";
import Stars from "@/components/Stars";

import { boxesAcross, isTimed, liveOccasions, onShelf, type Occasion } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";
import { shelfPhotos } from "@/lib/shelf-photo";
import { naira } from "@/lib/money";
import { shownSays } from "@/lib/says";
import { googleLinks, safeSettings, whatsappLink } from "@/lib/settings";
import { hostelNames } from "@/lib/hostels";
import { abroadOn } from "@/lib/abroad";
import { liveRoutes, parcelsFrom, placesSaid } from "@/lib/parcels";
import PlanAsk from "@/components/PlanAsk";
import CurateBox from "@/components/CurateBox";
import { AlsoSee } from "@/components/Guide";

/**
 * The page a parent is sent.
 *
 * Everything else on the site is written to a student who is hungry now.
 * This one is written to their mother, who is not hungry, is not on campus,
 * and is deciding whether to spend thirty thousand naira on somebody she has
 * never heard of. Different question, so a different page rather than a
 * paragraph bolted onto the front one: a student opening the shop should
 * never land on copy about their child, and a parent should never land on a
 * Domino's menu.
 *
 * It is not in the header, the tab bar or the sitemap on purpose. The only
 * way here is a link pasted into a chat, which is exactly how it is meant to
 * travel: from a promoter's mother into a parents' group, or from a student
 * into their own mother's messages.
 *
 * Only boxes. Not because the restaurant menu would not tempt anybody, but
 * because a box is the thing worth sending a parent: the price is ours to
 * set, the delivery is inside it, and it feeds somebody for a fortnight. A
 * pizza earns the fee on one car and is eaten by nine o'clock.
 */
export const revalidate = 600;

/** Where the site lives. A link in somebody else's phone, and a picture
 *  named in structured data, cannot carry a relative address. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";

const TITLE = "Send food to your child at Pan-Atlantic University";
const BLURB =
  "Sudu delivers food and foodstuff straight to the hostels at Pan-Atlantic " +
  "University. Pick a box, pay once, and we send you a photograph when it is " +
  "in their hands. Delivering on campus since 2018.";

/**
 * What a parent sees before they see the page at all.
 *
 * This link's life is spent as a grey card in a WhatsApp group, so the card
 * is the advert and the page is only what happens if it works. The site's
 * own title names restaurants and abbreviations, which reads as somebody
 * else's business to a woman in Ikoyi.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/parents" },
  openGraph: { title: TITLE, description: BLURB, url: "/parents", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: BLURB },
};

/** A shelf, as a parent needs it: a name, a price and a picture. */
type Shelf = {
  href: string;
  name: string;
  line: string;
  image: string;
};

export default async function ParentsPage() {
  const settings = await safeSettings();
  const packed = await liveOccasions();
  const boxes = await boxesAcross(packed.map((one) => one.id));
  const from = await cheapestBoxes(boxes).catch(() => new Map<string, number>());
  const photo = await shelfPhotos(boxes).catch(() => ({}) as Record<string, string>);

  // A shelf with nothing on it is not an offer, it is an apology waiting to
  // happen. Same rule as the front page.
  const stocked = new Map<string, number>();
  for (const box of boxes) {
    if (box.is_extra) continue;
    stocked.set(box.occasion_id, (stocked.get(box.occasion_id) ?? 0) + 1);
  }

  const shelfOf = (one: Occasion, where: string): Shelf => ({
    href: `/${where}/${one.slug}`,
    name: one.name,
    line:
      from.get(one.id) !== undefined
        ? `From ${naira(from.get(one.id)!)}, delivery included`
        : one.blurb,
    image: photo[one.id] || one.image_url || `/covers/${where}.svg`,
  });

  const live = (kind: "collection" | "occasion") =>
    onShelf(packed, kind)
      .filter((one) => (stocked.get(one.id) ?? 0) > 0)
      .map((one) => shelfOf(one, kind === "occasion" ? "occasions" : "collections"));

  // Collections only, and this is the whole curation rule.
  //
  // A collection stands there all term: the care package, the monthly
  // foodstuff, the hostel pack, matriculation. Those are the things a
  // parent sends. An occasion is a timed student thing: girls night, the
  // all-nighter, Liverpool v Man City. Listing one here would put "buy
  // your daughter an all-nighter" in front of her mother.
  //
  // So nothing here is named in code. To put a shelf in front of parents,
  // make it a collection on the Collections screen; to take it away, make
  // it an occasion. The shelf that wants both, like a birthday, is worth a
  // second copy rather than a rule with an exception in it.
  const shelves = live("collection");

  const google = {
    ...googleLinks(settings),
    rating: Number(settings.google_rating) || 0,
    count: Number(settings.google_reviews) || 0,
    quotes: await shownSays(settings.google_quotes),
  };

  /* The shelves a parent actually sends from, as a flat list for the
     standing order form. The same collections rule as the shelf cards
     above: nothing is named in code, so a shelf put in front of parents is
     a shelf somebody made a collection. */
  /* Only the shelves that stand there all term. Matriculation is a
     Saturday in November: offering it as the thing to send every month is
     offering somebody twelve matriculations. */
  const standingIds = new Set(
    onShelf(packed, "collection")
      .filter((one) => !isTimed(one))
      .map((one) => one.id)
  );
  const shelfName = new Map(packed.map((one) => [one.id, one.name]));
  const planBoxes = boxes
    .filter((box) => !box.is_extra && standingIds.has(box.occasion_id))
    .map((box) => ({
      id: box.id,
      name: box.name,
      shelf: shelfName.get(box.occasion_id) ?? "",
    }));
  const blocks = await hostelNames();

  /*
   * The parents who already have the thing.
   *
   * Half of sending something is not shopping at all: a mother in Lekki
   * has the bag of rice, the duvet, the pair of shoes she bought last week,
   * and what she wants is somebody to come and get it. The shop carries
   * parcels and this page never said so, so the only parents who knew were
   * the ones who happened to find another page.
   *
   * Read off the routes rather than written here, so a route switched off
   * in admin takes itself off this page and a price change lands here too.
   */
  const carrying = parcelsFrom(settings);
  const toCampus = liveRoutes(carrying.routes).filter((one) => one.toPau);
  const fromPrice = toCampus
    .flatMap((one) => one.bands.map((band) => band.fee))
    .filter((fee) => fee > 0)
    .sort((a, b) => a - b)[0];
  const collectFrom = placesSaid(toCampus);

  /*
   * The questions a parent actually asks, answered where they are asked.
   *
   * Every one of these is a thing somebody types into Google in those
   * words: "how do I send food to my child at Pan-Atlantic University".
   * Answering them on the page is worth doing for the person reading it,
   * and it is the only honest way to mark them up underneath, because
   * answers in the markup that are not on the page are the kind of thing
   * Google takes a site's rich results away for.
   *
   * Nothing here promises anything the shop does not already do elsewhere
   * on this site. A page written to rank that says something untrue is a
   * page that earns a phone call nobody can answer.
   */
  const written: { q: string; a: string }[] = [
    {
      q: "How do I send food to my child at Pan-Atlantic University?",
      a:
        "Pick one of the boxes on this page, or tell us what you want in it " +
        "and we will put one together. Pay once and give us their name and " +
        // Not "we buy it in Sangotedo". Most runs go there and not all of
        // them do, and naming the one town reads as the only town: a
        // parent whose child wants something from Lekki or Ikoyi is being
        // told, in the answer to the first question on the page, that we
        // do not go there. Where we buy it is our problem, not theirs.
        "hostel: we buy it, carry it onto the PAU campus in Ibeju-Lekki " +
        "and hand it to them at their block." +
        (carrying.on && toCampus.length > 0
          ? " If you already have what you want to send, we can collect that " +
            "from you instead."
          : "") +
        " Your child does not have to do anything.",
    },
    {
      q: "How do I know it was delivered?",
      a:
        "We send you a photograph when it is handed over. Every order has a " +
        "page of its own that shows where it has got to, from paid to in " +
        "their hands.",
    },
    {
      q: "Does the price include delivery to the hostel?",
      a:
        "The boxes on this page are one price with the delivery already in " +
        "it, to the block rather than to the gate. A box we put together " +
        "from what you tell us, and a parcel we collect from you, are " +
        "priced the other way: we tell you what the things come to and what " +
        "the carrying costs before you pay anything.",
    },
    {
      q: "Can I send the same thing every month?",
      a:
        "Yes. Tell us the box and the day of the month, and a few days before " +
        "each one we raise the order and send you the account. One transfer a " +
        "month and nothing to remember. Nothing is ever charged automatically " +
        "and we do not hold a card.",
    },
    ...(abroadOn(settings)
      ? [
          {
            q: "Can I pay from outside Nigeria?",
            a:
              "Yes. Ask us for a card link and we will send you one in pounds " +
              "or dollars, so a parent abroad does not need a Nigerian " +
              "transfer.",
          },
        ]
      : []),
    ...(carrying.on && toCampus.length > 0
      ? [
          {
            q: "I already have what I want to send. Can you just collect it?",
            a:
              "Yes. We collect from " +
              (collectFrom || "around Lagos") +
              " and carry it to their block at Pan-Atlantic University" +
              (fromPrice ? `, from ${naira(fromPrice)}` : "") +
              ". It is sealed when we collect it, photographed at both ends, " +
              "and handed over sealed. Clothes, a duvet, shoes, foodstuff you " +
              "already bought: anything you would rather send than buy again.",
          },
        ]
      : []),
    {
      q: "What if what I want is not on the list?",
      a:
        "Tell us what it is. We find it, price it and come back to you, and " +
        "nothing is ordered until you have said yes to the price.",
    },
    {
      q: "Where do you deliver?",
      a:
        "To the hostels at Pan-Atlantic University, Ibeju-Lekki, Lagos. We " +
        "have been delivering on that campus since 2018.",
    },
  ];

  /*
   * The page's own wording, with anything rewritten in admin over the
   * top. Written here rather than read from there: half these answers
   * carry a live number, and a page that simply printed stored text would
   * freeze a fee into a paragraph the day somebody edited a sentence.
   */
  const asked = await askedFor("parents", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Send food to a student at Pan-Atlantic University",
        serviceType: "Food and foodstuff delivery to university hostels",
        image: `${SITE}/covers/sudu.png`,
        provider: {
          "@type": "Organization",
          name: "Sudu",
          url: SITE,
          logo: `${SITE}/logo.png`,
        },
        areaServed: [
          { "@type": "Place", name: "Pan-Atlantic University, Ibeju-Lekki, Lagos" },
          { "@type": "Place", name: "Sangotedo, Lagos" },
        ],
        audience: { "@type": "Audience", audienceType: "Parents of university students" },
        description: BLURB,
      },
      {
        "@type": "FAQPage",
        mainEntity: asked.map((one) => ({
          "@type": "Question",
          name: one.q,
          acceptedAnswer: { "@type": "Answer", text: one.a },
        })),
      },
    ],
  };

  const ask = whatsappLink(
    settings.whatsapp_number,
    "Hello, I am a parent at PAU and I would like to send something to my child."
  );

  return (
    <article className="-mt-4">
      {/* What the page is, for a search engine. The same two things the
          other landing pages carry: the service, and the questions on the
          page answered in the words they are asked in. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />
      {/* The board's head for this page is Tomato, not Ink. It is the one
          page written to somebody who is not a student, and the whole of
          what it has to do in the first screen is look like a shop that
          exists. */}
      <header className="bleed bg-brand text-white">
        <div className="shell flex flex-wrap items-center gap-9 py-10 sm:py-14">
          <div className="flex min-w-0 flex-[1.4_1_380px] flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="ticket text-[#ffe38a]">For parents</span>
              {google.rating > 0 && (google.profile || google.review) !== "" && (
                <a
                  href={google.profile || google.review}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ticket flex items-center gap-1.5 border-2 border-white px-2.5 py-1.5"
                >
                  <Stars out={google.rating} size={13} tone="light" />
                  {google.rating.toFixed(1)} on Google
                </a>
              )}
            </div>
            <h1 className="font-display text-[min(15vw,7.5rem)] font-black uppercase leading-[0.85] sm:text-[clamp(3.5rem,8vw,7.5rem)]">
              Send food to
              <br />
              your child at PAU
            </h1>
            <p className="max-w-[540px] text-[17px] leading-relaxed sm:text-lg">
              Pick a box and pay once. We take it to their hostel and send you
              a photo when it is handed over. Your child does not need to do a
              thing.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#send"
                className="btn bg-ink text-white shadow-[4px_4px_0_#ffd23f] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#ffd23f]"
              >
                Choose a box <span aria-hidden>→</span>
              </a>
              {/* The monthly form is the most valuable thing on this page
                  and it sits at the bottom of it, which on a phone is four
                  screens down: most people never knew it was there. It is
                  not moved, because the order of this page is right, but it
                  is now reachable from the first screen and from the one
                  place a parent is already deciding.

                  This also used to point at WhatsApp, which is the very
                  thing the form replaced. */}
              <a
                href="#monthly"
                className="btn border-2 border-white text-white"
              >
                Send it every month <span aria-hidden>↓</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Answering "who are you", before it is asked. A stranger on the
          internet asking for thirty thousand naira up front has to say
          something, and seven years on one campus is the strongest thing
          this shop can say. */}
      <section className="bleed border-b-2 border-ink bg-paper">
        <ul className="shell grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Since 2018", "Delivering on the PAU campus"],
            ["Award 2021", "PAU Entrepreneurship Award"],
            ["Photo proof", "A picture of the handover, sent to you"],
            ["No extras", "Delivery is in the price. Nothing added at the end"],
          ].map(([big, small]) => (
            <li key={big} className="flex flex-col gap-1 border-l-4 border-brand pl-3.5">
              <span className="font-display text-[30px] font-black uppercase leading-none">
                {big}
              </span>
              <span className="text-[15px] text-ink/70">{small}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="send" className="flex flex-col gap-8 py-12 sm:py-16">
        <div className="flex flex-col gap-3">
          <span className="ticket text-brand-dark">
            What you can send · delivery included
          </span>
          <h2 className="section-title">Pick a box</h2>
        </div>

        {shelves.length === 0 ? (
          <p className="text-muted">
            Nothing is packed at the moment. Message us and we will put
            something together.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Among the shelves rather than after them. This is where a
                parent is already comparing things to send, and "the same
                thing every month" is one of the things to compare. */}
            <a
              href="#monthly"
              className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink bg-volt p-5 transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="ticket text-brand-dark">Every month</span>
                <span className="break-words font-display text-[30px] font-extrabold uppercase leading-none">
                  The same thing, monthly
                </span>
                <span className="text-sm text-ink/70">
                  Pick the box and the day. One transfer a month, nothing to
                  remember.
                </span>
              </span>
              <span aria-hidden className="shrink-0 font-bold text-brand">
                →
              </span>
            </a>
            {carrying.on && toCampus.length > 0 && (
              <Link
                href="/parcel"
                className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink bg-paper p-5 transition active:translate-x-0.5 active:translate-y-0.5"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="ticket text-brand-dark">Already have it</span>
                  <span className="break-words font-display text-[30px] font-extrabold uppercase leading-none">
                    We collect it from you
                  </span>
                  <span className="text-sm text-muted">
                    {collectFrom === ""
                      ? "We pick it up and carry it to their block."
                      : `From ${collectFrom}${
                          fromPrice ? `, from ${naira(fromPrice)}` : ""
                        }. Sealed at your door, sealed at their block.`}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 font-bold text-brand">
                  →
                </span>
              </Link>
            )}
            {shelves.map((one) => (
              <Link
                key={one.href}
                href={one.href}
                className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink bg-paper p-5 transition active:translate-x-0.5 active:translate-y-0.5"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="break-words font-display text-[30px] font-extrabold uppercase leading-none">
                    {one.name}
                  </span>
                  <span className="text-sm text-muted">{one.line}</span>
                </span>
                <span aria-hidden className="shrink-0 font-bold text-brand">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Under the shelves, where a parent has read all of them and not
            found the one they wanted. The same card the collection pages
            carry: things we have is the menu, things we do not is a job
            for a person. */}
        <CurateBox
          shelf="the parents page"
          hint=""
          hostels={blocks}
          whatsapp={settings.whatsapp_number}
        />
      </section>

      {/* The other pages written for a search.
          This page was the one that received those links and gave none
          back: it sat at the end of the cluster rather than in it, which
          wastes the thing a cluster is for. */}
      <section className="py-4">
        <AlsoSee not="/parents" />
      </section>

      {/* Asked and answered, in the words a parent would use. */}
      <section id="questions" className="flex scroll-mt-20 flex-col gap-6 py-12 sm:py-14">
        <h2 className="section-title">Questions parents ask</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {asked.map((one) => (
            <div
              key={one.q}
              className="flex flex-col gap-2 rounded-2xl border-2 border-ink bg-paper p-5"
            >
              <dt className="font-bold leading-snug">{one.q}</dt>
              <dd className="text-[15px] leading-relaxed text-ink/75">{one.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bleed bg-ink text-shell">
        <div className="shell flex flex-col gap-9 py-12 sm:py-16">
          <h2 className="section-title">How it works</h2>
          <ol className="grid gap-7 sm:grid-cols-3">
            {[
              [
                "Choose what to send",
                "A box off the shelf, one we put together from what you tell " +
                  "us, or a parcel you already have. Give us your child's " +
                  "name and hostel. They do not need to help.",
              ],
              [
                "Pay once",
                "Bank transfer or card. A box off the shelf has the delivery " +
                  "in its price; for anything else we tell you what it comes " +
                  "to before you pay.",
              ],
              [
                "We deliver, you see it",
                "We take it to the hostel and send you a photo of the handover.",
              ],
            ].map(([said, note], at) => (
              <li
                key={said}
                className="flex flex-col gap-2.5 border-t-4 border-brand pt-4"
              >
                <span className="font-display text-[64px] font-black leading-[0.8] text-brand">
                  {String(at + 1).padStart(2, "0")}
                </span>
                <span className="text-xl font-bold">{said}</span>
                <span className="leading-relaxed text-rail-text">{note}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <GoogleSays
        profile={google.profile}
        review={google.review}
        rating={google.rating}
        count={google.count}
        quotes={google.quotes}
      />

      <section
        id="monthly"
        className="grid scroll-mt-20 gap-4 py-12 sm:py-14 lg:grid-cols-2"
      >
        {/* The thing a parent came here to do, done here.
            What stood in this corner was a button that opened a chat, which
            is a promise to remember rather than a standing order: the one
            thing this page is for was the one thing the site could not do. */}
        <PlanAsk
          boxes={planBoxes}
          hostels={blocks}
          parcels={carrying.on && toCampus.length > 0}
        />

        <div className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-paper p-6">
          <span className="ticket text-brand-dark">Anything else</span>
          <h2 className="font-display text-[40px] font-black uppercase leading-[0.9]">
            Not on the list?
          </h2>
          <p className="leading-relaxed text-ink/70">
            A birthday, medicine, a parcel from the mainland, something from
            home. Message us and we will sort it.
          </p>
          {ask ? (
            <a
              href={ask}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-quiet self-start"
            >
              Message us on WhatsApp
            </a>
          ) : null}
          {settings.whatsapp_number ? (
            <span className="font-mono text-[15px]">
              {settings.whatsapp_number}
            </span>
          ) : null}
        </div>
      </section>
    </article>
  );
}
