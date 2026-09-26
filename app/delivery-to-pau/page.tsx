import type { Metadata } from "next";
import Link from "next/link";

import { openRestaurants } from "@/lib/menu";
import { activeBands } from "@/lib/settings";
import { hostelNames } from "@/lib/hostels";
import { liveRoutes, parcels } from "@/lib/parcels";
import { dropLabel, nextDrop, skincareOn, skincarePromise } from "@/lib/skincare";
import { safeSettings } from "@/lib/settings";
import { parseAreas } from "@/lib/areas";
import { naira } from "@/lib/money";

/**
 * The page for somebody who typed "delivery to PAU" into Google.
 *
 * Deliberately not in the header or the tab bar. A student who is already
 * here wants the menu, not an explanation of the shop; this page exists so
 * that the question people ask a search engine has an answer of ours, with
 * the words they actually use in it. Everything on it is read from the live
 * settings, so it cannot drift into promising a fee or a route we dropped.
 */
export const revalidate = 3600;

const TITLE = "Delivery to Pan-Atlantic University (PAU), Lagos";
const BLURB =
  "Food delivered to Pan-Atlantic University from the restaurants around " +
  "Sangotedo and Novare Mall. One car, one delivery fee split between " +
  "everybody on it, handed to you at your hostel. Skincare and parcels too.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/delivery-to-pau" },
  openGraph: { title: TITLE, description: BLURB, url: "/delivery-to-pau" },
};

export default async function DeliveryToPauPage() {
  const [places, bands, hostels, parcelSetup, settings] = await Promise.all([
    openRestaurants(),
    activeBands(),
    hostelNames(),
    parcels(),
    safeSettings(),
  ]);
  // The shelf is its own trip on its own day, so it is its own paragraph.
  // Switched off in admin, it is not on this page at all rather than being
  // advertised to somebody who would find a page that is not there.
  // The kitchens that are not in Sangotedo, read from admin rather than
  // written here: Lekki and Ikoyi are on the menu on the runs that go there,
  // and a page that never mentions them is a page that hides half the shop.
  const areas = parseAreas(settings.delivery_areas);
  const areaNames = areas.map((one) => one.name);
  const farthest = areas.reduce((most, one) => Math.max(most, one.runExtra), 0);
  const skincare = skincareOn(settings);
  const skincareDay = skincare ? dropLabel(nextDrop(settings).date) : "";
  const routes = liveRoutes(parcelSetup.routes);
  const cheapest = bands.length > 0 ? bands[0] : null;

  // The questions people actually ask, answered once and given to Google in
  // the form it reads. Everything here is also on the page in plain words:
  // markup that says something the page does not is the thing that gets a
  // site ignored.
  const asked: { q: string; a: string }[] = [
    {
      q: "Do you deliver to Pan-Atlantic University?",
      a:
        "Yes. Sudu delivers to PAU in Ibeju-Lekki, Lagos. Orders are collected " +
        "from restaurants in Sangotedo and brought onto campus together, and " +
        "each order is handed over at the hostel the person named.",
    },
    {
      q: "How much is delivery to PAU?",
      a: cheapest
        ? `Delivery starts at ${naira(cheapest.fee)} for up to ${cheapest.maxItems} ` +
          "items, and it is one fee for the car rather than a fee each. When " +
          "several people order on the same run it is split between them."
        : "Delivery is one fee for the car rather than a fee each, and it is " +
          "split between everybody who orders on the same run.",
    },
    {
      q: "What restaurants deliver to PAU?",
      a:
        places.length > 0
          ? `Through Sudu: ${places.map((one) => one.name).join(", ")}. ` +
            "They are collected together and brought onto campus on one car, " +
            "so an order can draw on more than one of them."
          : "The list is on the menu page, and everything on it comes to campus.",
    },
    ...places.slice(0, 2).map((one) => ({
      // The question as somebody would type it, one per counter, for the two
      // best known. Asking "can I order KFC to PAU" should find the answer
      // rather than a page that merely contains the word KFC.
      q: `Can I order ${one.name} to PAU?`,
      a:
        `Yes. ${one.name} is on Sudu, and it comes to your hostel on the ` +
        "next run. You can put things from other restaurants in the same " +
        "order and pay one delivery between you.",
    })),
    {
      q: "Can I order from more than one restaurant at once?",
      a:
        "Yes. One car fetches all of it, so a cart with two kitchens in it " +
        "is one delivery and one fee rather than two.",
    },
    {
      q: "Can I split the delivery with friends?",
      a:
        "Yes. Start a shared delivery, send the link, and everybody adds " +
        "their own food. The fee splits between everybody in it, and each " +
        "bag is labelled with its owner's name.",
    },
    ...(hostels.length > 0
      ? [
          {
            q: "Which PAU hostels does Sudu deliver to?",
            a: `${hostels.join(", ")}. You pick your block at checkout.`,
          },
        ]
      : []),
    {
      // Food only. The other places we go are parcel routes, and naming them
      // in the answer to a question about food reads as a menu we do not
      // have. They are named under the parcel question, where they are true.
      q: "Where do you deliver food from?",
      a:
        "Restaurants around Sangotedo and Novare Mall" +
        (places.length > 0
          ? `, including ${places.slice(0, 6).map((one) => one.name).join(", ")}.`
          : ".") +
        (areaNames.length > 0
          ? ` ${areaNames.join(" and ")} as well, on the runs that go that way` +
            (farthest > 0 ? `, which adds ${naira(farthest)} to the car.` : ".")
          : "") +
        " Everything on a run is collected and brought onto campus together.",
    },
    ...(skincare
      ? [
          {
            q: "Do you deliver skincare to PAU?",
            a:
              "Yes. Skincare is a separate shelf with its own basket and its " +
              "own car" +
              (skincareDay ? `, and it comes ${skincareDay}.` : ".") +
              " Order any day and it arrives on the next drop.",
          },
        ]
      : []),
    {
      q: "How do I pay?",
      a:
        "Bank transfer or card. For a transfer you get the account details at " +
        "checkout and send the exact total. For card, say so at checkout and " +
        "we send you a payment link on WhatsApp. Either way the order is " +
        "confirmed once it is paid, and goes on the run you picked.",
    },
    {
      q: "Can I send or receive a parcel at PAU?",
      a:
        routes.length > 0
          ? "Yes. A parcel is collected sealed, photographed at both ends and " +
            "handed over sealed. Routes run between PAU and Sangotedo, Lekki, " +
            "Ikoyi, the mainland and Ikorodu."
          : "Parcels are not running at the moment. Food delivery to campus is.",
    },
  ];

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Delivery to Pan-Atlantic University",
        serviceType: "Food and parcel delivery",
        provider: { "@type": "Organization", name: "Sudu" },
        areaServed: [
          { "@type": "Place", name: "Pan-Atlantic University, Ibeju-Lekki, Lagos" },
          { "@type": "Place", name: "Sangotedo, Lagos" },
          // Only where a parcel actually goes. The food comes from Sangotedo.
          ...(routes.length > 0
            ? [
                { "@type": "Place", name: "Lekki, Lagos" },
                { "@type": "Place", name: "Ikoyi, Lagos" },
              ]
            : []),
        ],
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

  return (
    <article className="space-y-8 pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold leading-tight">
          Food and delivery to Pan-Atlantic University (PAU)
        </h1>

        {/* The relationship said outright, in the first thing under the
            heading: who we are, who it is for, where from, where to. A list
            of restaurants leaves all four to be inferred, and something
            reading the page on somebody's behalf should not have to infer
            any of them. */}
        <p className="text-ink/90">
          Sudu is a delivery service for Pan-Atlantic University students.
          Order from your favourite restaurants around Sangotedo and Novare
          and have your food delivered directly to your PAU hostel.
        </p>

        <p className="text-muted">
          Sudu has been running food onto the PAU campus since 2018.
          Everything is collected together and brought in on one car, handed
          to you at your block.
          {areaNames.length > 0
            ? ` ${areaNames.join(" and ")} too, on the runs that go that way.`
            : ""}{" "}
          Skincare and parcels go the same way, each on its own trip.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products"
            className="rounded-full bg-brand px-4 py-2.5 text-sm font-extrabold text-white"
          >
            See the menu
          </Link>
          {skincare && (
            <Link
              href="/skincare"
              className="rounded-full bg-paper px-4 py-2.5 text-sm font-extrabold text-brand shadow-card"
            >
              Skincare
            </Link>
          )}
          {routes.length > 0 && (
            <Link
              href="/parcel"
              className="rounded-full bg-paper px-4 py-2.5 text-sm font-extrabold text-brand shadow-card"
            >
              Send a parcel
            </Link>
          )}
        </div>
      </header>

      <Section title="What you can order">
        <p>
          Everything is on one menu and it all travels in the same car, so an
          order can draw on more than one kitchen without paying twice for the
          drive.
        </p>
        {places.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {places.map((one) => (
              <li key={one.id}>
                <Link
                  href={`/r/${one.href}`}
                  className="inline-block rounded-full bg-paper px-3 py-1.5 text-sm font-bold shadow-card"
                >
                  {one.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Why PAU students use Sudu">
        <dl className="space-y-3">
          <Reason title="Several restaurants, one delivery">
            Order from more than one kitchen on the same run instead of
            arranging a delivery from each of them.
          </Reason>
          <Reason title="Delivered to your PAU hostel">
            It is brought onto campus and handed over at the block you named,
            not left at a gate for you to go and find.
          </Reason>
          <Reason title="Ordering together">
            Start a shared delivery, send the link, and everybody adds their
            own food. One fee, split between all of you.
          </Reason>
          {(skincare || routes.length > 0) && (
            <Reason title="More than food">
              {skincare && routes.length > 0
                ? "Skincare has its own shelf and its own day, and parcels move both ways between campus and town."
                : skincare
                  ? "Skincare has its own shelf and its own day."
                  : "Parcels move both ways between campus and town."}
            </Reason>
          )}
          <Reason title="Here since 2018">
            Sudu has been running onto this campus for years, and won PAU&apos;s
            entrepreneurship award in 2021.
          </Reason>
        </dl>
      </Section>

      <Section title="How it works">
        <ol className="list-inside list-decimal space-y-1">
          <li>Put what you want in the cart, from as many restaurants as you like.</li>
          <li>Pick the run you want to be on, and say which hostel you are in.</li>
          <li>Pay by bank transfer. The details are on the checkout page.</li>
          <li>
            The food is collected, brought onto campus together and handed to
            you at your block in the delivery window.
          </li>
        </ol>
      </Section>

      <Section title="What delivery costs">
        {bands.length > 0 ? (
          <>
            <p>
              One fee for the car, not a fee each. It goes by how much is in it:
            </p>
            <ul className="space-y-1 pt-1">
              {bands.map((band, index) => (
                <li key={index}>
                  <span className="font-bold">{naira(band.fee)}</span>{" "}
                  {Number.isFinite(band.maxItems)
                    ? `for up to ${band.maxItems} items`
                    : band.perItem
                      ? `beyond that, plus ${naira(band.perItem)} an item`
                      : "beyond that"}
                </li>
              ))}
            </ul>
            <p className="pt-1">
              Order with other people on the same run and that one fee is split
              between you, which is the whole point of a run.
            </p>
          </>
        ) : (
          <p>
            One fee for the car, not a fee each, split between everybody
            ordering on the same run.
          </p>
        )}
      </Section>

      {hostels.length > 0 && (
        <Section title="PAU hostels and blocks we deliver to">
          <p>
            On campus, at the block you name at checkout. Somebody wondering
            whether we come to theirs should be able to find it here rather
            than having to ask.
          </p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {hostels.map((one) => (
              <li
                key={one}
                className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold shadow-card"
              >
                {one}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {areaNames.length > 0 && (
        <Section title={`${areaNames.join(" and ")} runs`}>
          <p>
            Not every run goes the same way. Most are Sangotedo and Novare, and
            some go out to {areaNames.join(" and ")}, which is a longer drive
            and a bigger fee
            {farthest > 0 ? `, ${naira(farthest)} on top of the ladder above` : ""}.
            The checkout only offers you a run that can actually fetch what is
            in your cart, so you cannot end up waiting on a car that was never
            going that way.
          </p>
        </Section>
      )}

      {skincare && (
        <Section title="Skincare to PAU">
          <p>
            {skincarePromise(settings)} It is a separate shelf with its own
            basket and its own car, so it does not ride on the food run.
            {skincareDay ? ` Order any day and it comes ${skincareDay}.` : ""}
          </p>
          <p>
            <Link href="/skincare" className="font-extrabold text-brand">
              See the skincare shelf
            </Link>
          </p>
        </Section>
      )}

      {routes.length > 0 && (
        <Section title="Parcels to and from PAU">
          <p>
            Something waiting for you in a shop off campus, or something that has
            to get to your family, goes on the same kind of trip. It is collected
            sealed, photographed when it is picked up and again when it is handed
            over, and it stays sealed in between.
          </p>
          <ul className="space-y-1 pt-1">
            {routes.map((route) => (
              <li key={route.id}>
                <span className="font-bold">{route.label}</span>
                {route.bands.length > 0 && (
                  <span className="text-muted">
                    {" "}
                    from {naira(route.bands[0].fee)} up to {route.bands[0].upTo}kg
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Questions people ask">
        <dl className="space-y-4">
          {asked.map((one) => (
            <div key={one.q}>
              <dt className="font-bold">{one.q}</dt>
              <dd className="text-muted">{one.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <p className="text-sm">
        <Link href="/products" className="font-extrabold text-brand">
          Start an order
        </Link>
      </p>
    </article>
  );
}

/** One reason, said as a heading and a sentence rather than a bullet. */
function Reason({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-bold">{title}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <div className="space-y-2 leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}
