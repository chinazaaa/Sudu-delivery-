import type { Metadata } from "next";
import Link from "next/link";

import { boxesAcross, liveOccasions, onShelf, type Occasion } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";
import { shelfPhotos } from "@/lib/shelf-photo";
import { naira } from "@/lib/money";
import { safeSettings, whatsappLink } from "@/lib/settings";
import Thumb from "@/components/Thumb";

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
  // parent sends. An occasion is a timed student thing — girls night, the
  // all-nighter, Liverpool v Man City — and listing one here would put "buy
  // your daughter an all-nighter" in front of her mother.
  //
  // So nothing here is named in code. To put a shelf in front of parents,
  // make it a collection on the Collections screen; to take it away, make
  // it an occasion. The shelf that wants both, like a birthday, is worth a
  // second copy rather than a rule with an exception in it.
  const shelves = live("collection");

  const ask = whatsappLink(
    settings.whatsapp_number,
    "Hello, I am a parent at PAU and I would like to send something to my child."
  );

  return (
    <article className="space-y-10 pb-12">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          For parents
        </p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Send food to your child at Pan-Atlantic University
        </h1>
        <p className="text-lg text-ink/90">
          The campus is a long way from the shops, and the ones nearby close
          early. Pick a box below, pay once, and we deliver it to their hostel
          and send you a photograph when it is in their hands.
        </p>
      </header>

      {/* Answering "who are you", before it is asked. A stranger on the
          internet asking for thirty thousand naira up front has to say
          something, and seven years on one campus is the strongest thing
          this shop can say. */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { big: "Since 2018", small: "Delivering on the PAU campus" },
          { big: "Award winning", small: "PAU Entrepreneurship Award, 2021" },
          { big: "A photograph", small: "Sent to you the moment it arrives" },
        ].map((one) => (
          <div key={one.big} className="card p-4">
            <p className="font-bold">{one.big}</p>
            <p className="text-sm text-muted">{one.small}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">What you can send</h2>
        {shelves.length === 0 ? (
          <p className="text-muted">
            Nothing is packed at the moment. Message us and we will put
            something together.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {shelves.map((one) => (
              <Link
                key={one.href}
                href={one.href}
                className="card group flex gap-4 p-3 transition hover:shadow-lift"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  <Thumb src={one.image} name={one.name} />
                </div>
                <div className="min-w-0 flex-1 self-center">
                  <p className="font-bold">{one.name}</p>
                  <p className="text-sm text-muted">{one.line}</p>
                </div>
                <span className="self-center text-brand" aria-hidden>
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
        <p className="text-sm text-muted">
          Every price above includes delivery to the hostel. There is nothing
          added at the end.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="space-y-3">
          {[
            "Choose a box and tell us your child's name and hostel. You do not need their help to order.",
            "Pay by transfer or card. One payment, delivery included.",
            "We collect, deliver it to their hostel, and send you a photograph of the handover.",
          ].map((step, index) => (
            <li key={step} className="card flex gap-3 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-paper">
                {index + 1}
              </span>
              <span className="self-center text-ink/90">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-3 bg-brand-tint p-5">
        <h2 className="text-xl font-bold">Sending one every month</h2>
        <p className="text-ink/90">
          Most parents send the same thing at the same point each month. Tell
          us on WhatsApp and we will set it up, remind you before each one and
          deliver it without you having to remember.
        </p>
        {ask ? (
          <a href={ask} className="btn-primary inline-block px-6">
            Set it up on WhatsApp
          </a>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Anything else</h2>
        <p className="text-ink/90">
          If what you want is not on this page — a birthday, medicine, a parcel
          from the mainland, something from home — message us and we will get
          it there.
        </p>
        {ask ? (
          <a href={ask} className="btn-quiet px-6">
            Message us on WhatsApp
          </a>
        ) : null}
      </section>
    </article>
  );
}
