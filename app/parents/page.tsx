import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import GoogleSays from "@/components/GoogleSays";
import Stars from "@/components/Stars";

import { boxesAcross, liveOccasions, onShelf, type Occasion } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";
import { shelfPhotos } from "@/lib/shelf-photo";
import { naira } from "@/lib/money";
import { googleLinks, googleQuotes, safeSettings, whatsappLink } from "@/lib/settings";

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

  const google = {
    ...googleLinks(settings),
    rating: Number(settings.google_rating) || 0,
    count: Number(settings.google_reviews) || 0,
    quotes: googleQuotes(settings.google_quotes),
  };

  const ask = whatsappLink(
    settings.whatsapp_number,
    "Hello, I am a parent at PAU and I would like to send something to my child."
  );

  return (
    <article className="-mt-4">
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
              {ask ? (
                <a
                  href={ask}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn border-2 border-white text-white"
                >
                  Set up monthly on WhatsApp
                </a>
              ) : null}
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
      </section>

      <section className="bleed bg-ink text-shell">
        <div className="shell flex flex-col gap-9 py-12 sm:py-16">
          <h2 className="section-title">How it works</h2>
          <ol className="grid gap-7 sm:grid-cols-3">
            {[
              [
                "Choose a box",
                "Give us your child's name and hostel. They do not need to help.",
              ],
              [
                "Pay once",
                "Bank transfer or card. Delivery is already in the price.",
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
                <span className="leading-relaxed text-[#d8d1c7]">{note}</span>
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

      <section className="grid gap-4 py-12 sm:py-14 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-volt p-6">
          <span className="ticket">Every month</span>
          <h2 className="font-display text-[40px] font-black uppercase leading-[0.9]">
            Send it monthly
          </h2>
          <p className="leading-relaxed">
            Most parents send the same thing at the same point each month. Set
            up a recurring order on WhatsApp and we remind you before each
            delivery.
          </p>
          {ask ? (
            <a
              href={ask}
              target="_blank"
              rel="noopener noreferrer"
              className="btn self-start bg-ink text-white"
            >
              Set it up on WhatsApp
            </a>
          ) : null}
        </div>

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
