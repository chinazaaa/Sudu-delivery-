import Link from "next/link";
import PageHead from "@/components/PageHead";
import AskForm from "@/components/AskForm";
import { AlsoSee, Asked, Reason, Section, type Ask } from "@/components/Guide";
import LaundryPrices from "@/components/LaundryPrices";
import type { PricedGroup } from "@/lib/laundry";
import type { Errand as Spec } from "@/lib/errands";
import { waLink } from "@/lib/whatsapp";

/**
 * One errand page, drawn from its spec.
 *
 * Printing a project and washing a bag of clothes are the same page: here
 * is the job, here is what we need to know before anybody can be given a
 * price, here is the thing we have to say plainly, and here are the two
 * ways to ask. Two copies of that would be two places to fix a sentence,
 * so there is one.
 *
 * No price anywhere on it, because there is not one to print: a project is
 * two hundred pages or four hundred. What the page does instead is say
 * exactly what we need in order to quote, so the first message answers the
 * question rather than starting a conversation about what the question is.
 */
export default function Errand({
  spec,
  asked,
  hostels,
  whatsapp,
  prices,
}: {
  spec: Spec;
  /** The priced list, where this errand has one. */
  prices?: { groups: PricedGroup[]; minimum: number; note: string } | null;
  /** The questions as admin has them, which may differ from the shipped
   *  ones. Passed in rather than read here so the page stays a page. */
  asked: Ask[];
  hostels: string[];
  whatsapp: string;
}) {
  const link = waLink(whatsapp || null, spec.opening);

  return (
    <article className="-mt-4 pb-10">
      <PageHead ticket={spec.ticket} title={spec.title} lead={spec.lead} tone="ink">
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-1 self-start border-2 border-ink text-[17px]"
          >
            Message us on WhatsApp <span aria-hidden>→</span>
          </a>
        )}
        <p className="hint">
          {whatsapp ? `${whatsapp} · ` : ""}we reply the same day.{" "}
          <a href="#ask" className="font-semibold text-brand-dark underline">
            Or fill a form instead
          </a>
          .
        </p>
      </PageHead>

      <div className="space-y-8 py-8">
        <Section title="How it works">
          <ol className="space-y-3">
            {spec.steps.map(([title, said], at) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-black text-volt">
                  {at + 1}
                </span>
                <span>
                  <strong>{title}.</strong> {said}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        {/* The whole point of the page: a first message that can actually
            be answered with a number, rather than three days of asking
            what was meant. */}
        <Section title="What we need to know">
          <p>
            There is no price on this page because there is not one to print
            until we know these. Send them in the first message and you get a
            number back rather than a question.
          </p>
          <dl className="space-y-3 pt-1">
            {spec.needs.map((one) => (
              <Reason key={one.what} title={one.what}>
                {one.why}
              </Reason>
            ))}
          </dl>
        </Section>

        {prices && prices.groups.length > 0 && (
          <LaundryPrices
            groups={prices.groups}
            minimum={prices.minimum}
            note={prices.note}
          />
        )}

        <Reason title={spec.careful.title}>{spec.careful.said}</Reason>

        <section id="ask" className="scroll-mt-24 space-y-3">
          <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
            Ask us
          </h2>
          <AskForm
            hostels={hostels}
            whatsapp={whatsapp || null}
            preset={spec.preset}
            chips={spec.chips}
            opening={spec.opening}
            label={spec.label}
            lead="Tell us what you need and we come back with a price. Nothing happens until you say yes."
          />
        </section>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <p className="text-sm text-muted">
          Looking for something else we do not stock?{" "}
          <Link href="/custom-order" className="font-semibold text-brand underline">
            Ask us for it
          </Link>
          .
        </p>

        <AlsoSee not={`/${spec.slug}`} />
      </div>
    </article>
  );
}
