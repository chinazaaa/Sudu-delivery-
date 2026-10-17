import type { Metadata } from "next";
import Link from "next/link";
import { askedFor } from "@/lib/page-faq";

import PageHead from "@/components/PageHead";
import { AlsoSee, Asked, Reason, Section, faqGraph, type Ask } from "@/components/Guide";
import { safeSettings, whatsappLink } from "@/lib/settings";

/**
 * The page for somebody who needs medicine and cannot leave campus.
 *
 * A different question again from food, and the one with the least
 * patience behind it: nobody searches this out of curiosity. A student
 * with a headache at nine at night, or a parent four hundred kilometres
 * away who has just been told their child is ill, both want one answer,
 * which is whether anybody can bring something tonight.
 *
 * Careful about what it claims. This shop is not a pharmacy and must not
 * read like one: it fetches. So the page says what we actually do, which
 * is go to a pharmacy and bring back what they sell us, and says plainly
 * where that stops. A page that implied otherwise would earn a phone call
 * nobody here is qualified to answer.
 */
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
const TITLE = "Pharmacy delivery to PAU, Ibeju-Lekki";
const BLURB =
  "Paracetamol and the everyday things from a pharmacy near Sangotedo, " +
  "brought to your hostel at Pan-Atlantic University on the next run. Tell " +
  "us what you need and we go and get it.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/pau-pharmacy" },
  openGraph: { title: TITLE, description: BLURB, url: "/pau-pharmacy" },
};

export default async function PauPharmacyPage() {
  const settings = await safeSettings();

  const ask = whatsappLink(
    settings.whatsapp_number,
    "Hello, I need something from a pharmacy brought to PAU."
  );

  const written: Ask[] = [
    {
      q: "Can you deliver medicine to Pan-Atlantic University?",
      a:
        "Yes. Tell us what you need and we buy it at a pharmacy on the run " +
        "and bring it to your block at PAU. Paracetamol is on the shelf " +
        "already; anything else we go and get, which costs nothing extra " +
        "beyond the ordinary delivery fee for that run.",
    },
    {
      q: "I am a parent and my child is ill at PAU. What can you do?",
      a:
        "Tell us what they need and where they are and we take it to their " +
        "own hostel block, and send you a photograph when it is handed over. " +
        "You pay from wherever you are. Your child does not have to leave " +
        "their room or find money.",
    },
    {
      q: "Are you a pharmacy?",
      a:
        "No, and that matters. We are a delivery service that goes to a " +
        "pharmacy for you. We cannot advise on what to take, what dose to " +
        "use or whether something is right for you: ask the pharmacist or a " +
        "doctor. We buy what they sell us and we carry it.",
    },
    {
      q: "Can you get prescription medicine?",
      a:
        "Only what a pharmacy is willing to sell without one. Anything that " +
        "needs a prescription is between you, your doctor and the pharmacy, " +
        "and we will tell you straight away rather than take your money and " +
        "come back empty-handed.",
    },
    {
      q: "How fast is it?",
      a:
        "It travels on the next run like everything else, so it depends on " +
        "when you ask. If it cannot wait for that, say so and we will tell " +
        "you what a car of its own would cost rather than leave you " +
        "guessing.",
    },
    {
      q: "What does it cost?",
      a:
        "What the pharmacy charges, plus the ordinary delivery fee for the " +
        "run it comes on, which is shared between everybody on that run. We " +
        "tell you the price before you pay anything.",
    },
  ];

  const asked = await askedFor("pau-pharmacy", written);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: "Pharmacy delivery to Pan-Atlantic University",
        serviceType: "Delivery service",
        url: `${SITE}/pau-pharmacy`,
        provider: { "@type": "Organization", name: "Sudu", url: SITE },
        areaServed: [
          { "@type": "Place", name: "Pan-Atlantic University, Ibeju-Lekki, Lagos" },
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
        ticket="Pharmacy · Pan-Atlantic University"
        title="Medicine, brought to your block"
        lead="Tell us what you need. We go to a pharmacy and bring it to your hostel."
        tone="ink"
      >
        <Link
          href="/custom-order"
          className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
        >
          Tell us what you need <span aria-hidden>→</span>
        </Link>
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title="How it works">
          <p>
            Say what you need and roughly what you expect to pay. We buy it at
            a pharmacy on the run, tell you what it came to before you pay
            anything, and hand it to you at your own block.
          </p>
          <p>
            Paracetamol is on the shelf already, so it can go in a basket with
            everything else. Anything beyond that is an errand: we go and look,
            and if we cannot get it we tell you rather than leave you waiting.
          </p>
          {ask && (
            <p>
              <a
                href={ask}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand underline"
              >
                Message us on WhatsApp
              </a>{" "}
              if it is urgent, and a person will answer.
            </p>
          )}
        </Section>

        {/* Said once, plainly, and not buried in the questions. A shop that
            fetches medicine has to be clear that fetching is all it does. */}
        <Reason title="We fetch, we do not advise">
          Sudu is not a pharmacy and nobody here is a pharmacist. We cannot
          tell you what to take, what dose to use or whether something suits
          you, and we will not guess. Ask the pharmacist or a doctor, and we
          will carry whatever they sell you.
        </Reason>

        <Section title="For parents">
          <p>
            A student who is ill is the one time a parent cannot do anything
            from a distance. You can: tell us what they need, pay from
            wherever you are, and we take it to their hostel block and
            photograph the handover so you know it arrived.
          </p>
          <p>
            <Link href="/parents" className="font-semibold text-brand underline">
              More on sending things to your child at PAU
            </Link>
            .
          </p>
        </Section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <AlsoSee not="/pau-pharmacy" />
      </div>
    </article>
  );
}
