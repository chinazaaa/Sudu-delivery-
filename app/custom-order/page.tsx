import type { Metadata } from "next";
import { AlsoSee } from "@/components/Guide";
import HelpLine from "@/components/HelpLine";
import PageHead from "@/components/PageHead";

import AskForm from "@/components/AskForm";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const TITLE = "Can't find it? We'll get it for you";
const BLURB =
  "Ask Sudu for anything that is not on the menu and we will find it, price " +
  "it and bring it to your Pan-Atlantic University hostel.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/custom-order" },
  openGraph: { title: TITLE, description: BLURB, url: "/custom-order" },
};

/**
 * Asking for something the shop does not carry.
 *
 * Nothing behind this is automatic: a request is a message to whoever is
 * running the shop, answered by hand on WhatsApp. That is the point. It
 * costs nothing to offer, and what people ask for is the cheapest way there
 * is of learning what to stock: enough of the same request and it stops
 * being a request and becomes a product.
 */
export default async function CustomOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; want?: string }>;
}) {
  const asks = await searchParams;
  const sent = asks.sent === "1";
  /*
   * What they typed into a search that found nothing.
   *
   * A menu search for something a kitchen does not sell is the clearest
   * statement of intent anybody makes on this site, and it was landing on
   * "0 results" and a suggestion to try a shorter word. The link out of
   * that page brings the word with it, so the box here opens already
   * holding the thing they were looking for rather than throwing it away
   * and asking again.
   */
  const want = String(asks.want ?? "").trim().slice(0, 120);
  const [hostels, settings] = await Promise.all([hostelNames(), safeSettings()]);

  /*
   * The questions somebody asks before asking for something odd.
   *
   * This page carries the one thing nobody else at this campus offers,
   * and it was answering nothing. A parent asked an assistant where to
   * buy a particular ice cream near PAU and was sent here, and the
   * assistant had to work out from a form and a headline that we would
   * go and find it. The boxes won a different parent in a different
   * conversation because they said what they were and what they cost in
   * the words somebody asks in. This is the same page saying the same
   * kind of thing about the harder half of the shop.
   *
   * Nothing promised here that the shop does not already do: it is
   * answered by hand on WhatsApp, which is why the answers say so.
   */
  const asked: { q: string; a: string }[] = [
    {
      q: "Can you get me something that is not on the menu?",
      a:
        "Nearly always, yes. Tell us what it is and roughly what you would " +
        "pay, and we go and find it, price it and bring it to your hostel " +
        "with the next run. If we cannot get it we say so rather than leave " +
        "you waiting, and that is rare.",
    },
    {
      q: "What sort of things do people ask for?",
      a:
        "Anything a shop in Lagos sells. A particular ice cream, a brand of " +
        "noodles nobody stocks, a charger, a birthday cake, medicine from a " +
        "pharmacy, something from a market stall. It does not have to be " +
        "food and it does not have to be from a restaurant we already use.",
    },
    {
      q: "How much does it cost?",
      a:
        "What the thing itself costs, plus the ordinary delivery fee for " +
        "the run it travels on. We tell you the price before you pay " +
        "anything, so nobody is committed to a figure they have not seen.",
    },
    {
      q: "How long does it take?",
      a:
        "Usually the next run. Something that has to be hunted for takes " +
        "longer, and we tell you that when we quote it rather than after.",
    },
    {
      q: "Do I have to pay before you look for it?",
      a:
        "No. You ask, we find it and tell you what it comes to, and you " +
        "decide then. There is nothing to pay for asking.",
    },
    {
      q: "Can my parents order it for me?",
      a:
        "Yes. Anybody can ask for something and have it delivered to a " +
        "student at their own block: they pay, we hand it over, and we " +
        "photograph it when we do.",
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
    <div className="-mt-4 pb-10">
      {/* Answered on the page, which is the only honest way to mark them
          up underneath. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />
      <PageHead
        ticket="Anything else"
        title={
          <>
            Can&apos;t find it?
            <br />
            <span className="text-brand">We&apos;ll get it.</span>
          </>
        }
        lead="Ask for anything that is not on the menu. We find it, price it, and bring it to your PAU hostel. Nothing is bought until you say yes."
      />

      <div className="flex flex-col gap-7 py-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {sent ? (
            <div className="rounded-2xl border-2 border-ink bg-paper p-6 shadow-lift lg:shadow-[10px_10px_0_#e5321d]">
              <p className="font-display text-[32px] font-black uppercase leading-none text-mint">
                We have it.
              </p>
              <p className="mt-2 text-ink/75">
                We will message you on WhatsApp with the price. Nothing is
                bought until you say yes.
              </p>
            </div>
          ) : (
            <AskForm
              hostels={hostels}
              whatsapp={settings.whatsapp_number || null}
              preset={want}
            />
          )}
        </div>

        {/* What happens after the button, which is the whole of what makes
            this askable: nobody sends a stranger a request for something
            without knowing whether they are about to be charged for it. */}
        <aside className="flex shrink-0 flex-col gap-4 lg:w-[320px]">
          <ol className="flex flex-col rounded-2xl bg-ink p-5 text-shell">
            {[
              ["Tell us", "What it is, roughly what you would pay, and your block."],
              ["We find it", "We track it down and send you the price on WhatsApp."],
              ["You say yes", "We only buy once you have approved the price."],
              ["We bring it", "It comes to your block on the next run."],
            ].map(([said, note], at) => (
              <li
                key={said}
                className="flex gap-4 border-b border-[#3a322b] py-3.5 last:border-0"
              >
                <span className="font-display text-[30px] font-black leading-none text-brand">
                  {String(at + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-bold">{said}</span>
                  <span className="text-sm text-rail-text">{note}</span>
                </span>
              </li>
            ))}
          </ol>

          <HelpLine
            number={settings.whatsapp_number}
            about="something I asked for"
            card
          />
        </aside>
      </div>

      <section className="flex flex-col gap-6 py-12 sm:py-14">
        <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
          Questions about asking for things
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
      <AlsoSee not="/custom-order" />
    </div>
  );
}
