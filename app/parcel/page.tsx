import type { Metadata } from "next";
import { AlsoSee } from "@/components/Guide";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { safeSettings } from "@/lib/settings";
import HelpLine from "@/components/HelpLine";
import { naira } from "@/lib/money";
import Link from "next/link";
import ParcelForm from "@/components/ParcelForm";
import { liveRoutes, parcels, placesSaid } from "@/lib/parcels";
import { hostelNames } from "@/lib/hostels";
import { lagosToday } from "@/lib/time";
import { namedPromoters } from "@/lib/promoters";
import { WHO_COOKIE } from "@/lib/came-from";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * What WhatsApp reads out beside the card. Both ends named, because nobody
 * is looking for a parcel service: they have a dress sitting in a shop in
 * Lekki and want to know whether anybody goes that way.
 */
export const metadata: Metadata = {
  // The shop's name is added by the layout. Written here as well, it came
  // out as "Send a parcel · Sudu · Sudu".
  title: "Send a parcel to or from PAU",
  alternates: { canonical: "/parcel" },
  description:
    "Sangotedo, Lekki/Ikoyi, the mainland and Ikorodu, both ways to PAU. " +
    "Collected sealed, handed over sealed, photographed at each end.",
};

export default async function ParcelPage() {
  const setup = await parcels();
  const settings = await safeSettings();
  const routes = liveRoutes(setup.routes);
  // The same list the food and skincare checkouts use. A block typed by hand
  // is misspelt every other order, and a parcel is one bag with one place to
  // take it, so it matters more here than anywhere.
  const hostels = await hostelNames();
  const promoters = await namedPromoters();
  // Who sent them, off a promoter's own link, checked against the live list.
  const fromLink = (await cookies()).get(WHO_COOKIE)?.value ?? "";
  const sentBy = promoters.find((one) => one.code === fromLink)?.code ?? "";

  if (!setup.on || routes.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <section className="card space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Parcels</h1>
          <p className="text-ink/75">
            We are not carrying parcels just now.{" "}
            <Link href="/" className="font-semibold text-brand">
              The food is still going out
            </Link>
            .
          </p>
        </section>
      </div>
    );
  }

  // The cheapest band on each route, for the board's price tiles. A parcel
  // is priced by how heavy it is, so this is a "from" and the form says the
  // rest once somebody has told us which one it is.
  const from = routes.map((one) => ({
    label: one.label.replace(/\s+(to|from)\s+PAU$/i, ""),
    price: Math.min(...one.bands.map((band) => band.fee)),
  }));
  // The heaviest it carries at all, off the bands themselves rather than
  // written out twice.
  const heaviest = Math.max(
    0,
    ...routes.flatMap((one) => one.bands.map((band) => band.upTo))
  );
  const seen = new Set<string>();
  const tiles = from.filter((one) => {
    if (seen.has(one.label)) return false;
    seen.add(one.label);
    return true;
  });

  /*
   * The questions a parent actually types, answered on the page.
   *
   * This was the one landing page in the shop with none, and it showed.
   * A parent asking an assistant how to send a parcel from Lekki to her
   * son at PAU was handed three courier companies and their opening
   * hours, because "which courier" is a question those companies have
   * spent years being the answer to and this page was not answering any
   * question at all. The boxes on /parents won the same parent in the
   * same conversation, and the only difference was that they said what
   * they were and what they cost in the words somebody asks in.
   *
   * Every figure is read off the live routes, so nothing here can promise
   * a price nobody charges any more.
   */
  const cheapest = Math.min(...from.map((one) => one.price));
  const bothWays = routes.some((one) => one.toPau) && routes.some((one) => !one.toPau);

  const asked: { q: string; a: string }[] = [
    {
      q: "How do I send a parcel to my child at Pan-Atlantic University?",
      a:
        `Tell us where it is and we collect it, from anywhere in ` +
        `${placesSaid(routes)}. ` +
        "It is sealed when we take it, photographed at both ends, and handed " +
        "to your child at their own block on campus rather than left at a " +
        `gate. From ${naira(cheapest)}, by weight, up to ${heaviest}kg.`,
    },
    {
      q: "Can you collect it from my house or office?",
      a:
        `Yes, anywhere in ${placesSaid(routes)}. Give us the address and a ` +
        "time and we come to it, so you do not have to find a courier " +
        "office, queue at a counter or know anybody's opening hours.",
    },
    {
      /*
       * The limit, said plainly and first rather than discovered.
       *
       * One end is always PAU, and that is not a gap in the service, it
       * is the service: a courier can carry a box anywhere in Lagos and
       * then has nobody on that campus to give it to. Saying it also
       * keeps the wrong enquiry away, which costs a reply every time.
       */
      q: "Do you carry parcels anywhere else in Lagos?",
      a:
        "No. One end is always Pan-Atlantic University, and that is the " +
        "point of it. We are not a courier covering Lagos: we are the people " +
        "who go to that campus, know the blocks and can put a parcel in a " +
        "named student's hands. For anything that does not touch PAU, an " +
        "ordinary courier is the right answer and will be cheaper.",
    },
    {
      q: "How much does it cost to send a parcel to PAU?",
      a:
        `From ${naira(cheapest)}, and it goes by weight rather than by what ` +
        "is in it. " +
        tiles.map((one) => `${one.label}, from ${naira(one.price)}`).join(". ") +
        `. The exact figure is on the form before you pay, once you have said ` +
        "how heavy it is.",
    },
    {
      q: "Will I know it arrived?",
      a:
        "Yes. We photograph it when we collect it and again when it is handed " +
        "over, and you get both. Your child does not have to remember to tell " +
        "you.",
    },
    {
      q: "Do you deliver to the hostel, or only to the gate?",
      a:
        "To the block. We name the hostel on the parcel and hand it to them " +
        "there, which is the whole reason this exists: a courier can reach " +
        "the campus and then has nobody to give it to.",
    },
    ...(bothWays
      ? [
          {
            q: "Can my child send something back to me?",
            a:
              "Yes, the same way and at the same prices. They tell us what it " +
              "is and where it is going, we collect it from their block and " +
              "take it to the address you give us.",
          },
        ]
      : []),
    {
      q: "What can I not send?",
      a:
        setup.terms.length > 0
          ? setup.terms.join(" ")
          : `Nothing worth more than ${naira(setup.maxValue)}, and nothing ` +
            "we are not allowed to carry. If you are not sure, ask us first.",
    },
  ];

  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: asked.map((one) => ({
      "@type": "Question",
      name: one.q,
      acceptedAnswer: { "@type": "Answer", text: one.a },
    })),
  };

  return (
    <div className="-mt-4">
      {/* The questions on the page, answered in the words they are asked
          in. The other landing pages have carried this for months and
          this one carried nothing, which is most of why an assistant
          answering a parent about parcels reached for courier firms. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />
      <section className="bleed relative overflow-hidden bg-ink text-shell">
        <span
          aria-hidden
          className="absolute inset-y-0 -right-10 w-[30%] opacity-85"
          style={{
            background:
              "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
          }}
        />
        <div className="shell relative flex flex-wrap items-end gap-8 pb-9 pt-7 sm:pb-11 sm:pt-9">
          <div className="flex min-w-0 flex-[1.3_1_380px] flex-col gap-4">
            <span className="ticket text-volt">
              Parcels · both ways · up to {heaviest}kg
            </span>
            <h1 className="font-display text-[min(15vw,7.5rem)] font-black uppercase leading-[0.85] sm:text-[clamp(3.5rem,8vw,7.5rem)]">
              Send a parcel
              <br />
              to or from PAU
            </h1>
            <p className="max-w-[540px] text-[17px] leading-relaxed text-rail-text sm:text-lg">
              {setup.blurb ||
                "We collect it sealed, carry it, and hand it over sealed, with a photo at each end."}
            </p>
          </div>

          {tiles.length > 0 && (
            <ul className="grid flex-[1_1_300px] grid-cols-2 gap-2">
              {tiles.map((one) => (
                <li
                  key={one.label}
                  className="flex flex-col gap-1 rounded-xl border border-[#3a322b] bg-[#26201b] p-4"
                >
                  <span className="text-sm text-rail-text">
                    {one.label} ↔ PAU
                  </span>
                  <span className="font-display text-[30px] font-extrabold leading-none">
                    from {naira(one.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-7 py-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
      <ParcelForm
        routes={routes}
        maxValue={setup.maxValue}
        hostels={hostels}
        promoters={promoters}
        sentBy={sentBy}
        monies={moniesOn(settings).map((code) => ({
          code,
          label: code === "GBP" ? "Pounds" : "Dollars",
          symbol: SYMBOL[code],
          rate: rateFor(settings, code),
        }))}
        today={lagosToday()}
      />
        </div>

        {/* The board's right column: what we will and will not carry, and
            what happens after the form. Said beside the form rather than
            above it, so neither one is in the other's way. */}
        <aside className="flex shrink-0 flex-col gap-4 lg:w-[320px]">
          <section className="card space-y-3">
            <h2 className="font-display text-[28px] font-black uppercase leading-none">
              The rules
            </h2>
            <ul className="flex flex-col gap-2.5">
              {setup.terms.map((line) => (
                <li key={line} className="flex items-start gap-2 leading-snug">
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white"
                  >
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-shell">
            <h2 className="font-display text-[28px] font-black uppercase leading-none">
              How it goes
            </h2>
            <ol className="flex flex-col gap-3">
              {[
                "Fill in the form.",
                "Pay by transfer or card.",
                "Agree the day with us on WhatsApp.",
                "We collect, carry and hand it over.",
              ].map((said, at) => (
                <li key={said} className="flex items-baseline gap-3">
                  <span className="font-display text-2xl font-black text-brand">
                    {String(at + 1).padStart(2, "0")}
                  </span>
                  <span>{said}</span>
                </li>
              ))}
            </ol>
          </section>

          <HelpLine number={settings.whatsapp_number} about="a parcel" page="Parcel" />
        </aside>
      </div>

      {/* Answered on the page, which is the only honest way to mark them
          up underneath: an answer in the markup that is not on the page
          is the kind of thing a site loses its rich results over. */}
      <section className="flex flex-col gap-6 py-12 sm:py-14">
        <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
          Questions about parcels
        </h2>
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

      {/* Into the ring the other landing pages make, rather than hanging
          off the nav alone. */}
      <AlsoSee not="/parcel" />
    </div>
  );
}
