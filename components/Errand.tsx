import Link from "next/link";
import PageHead from "@/components/PageHead";
import AskForm from "@/components/AskForm";
import LaundryPicker from "@/components/LaundryPicker";
import PrintAsk from "@/components/PrintAsk";
import type { PrintGroup } from "@/lib/printing";
import { AlsoSee, Asked, Reason, Section, type Ask } from "@/components/Guide";
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
 * The order of it is the whole design. It used to explain itself for three
 * sections and put the way of asking at the bottom, which assumes somebody
 * reads a page before deciding to use it. Nobody does. So the top of the
 * page is the three facts that decide it and the thing you actually came to
 * do, and the explaining sits underneath for whoever wants it.
 */
export default function Errand({
  spec,
  asked,
  hostels,
  whatsapp,
  prices,
  catalogue,
}: {
  spec: Spec;
  /** The priced list, where this errand has one. */
  prices?: { groups: PricedGroup[]; minimum: number; note: string } | null;
  /** The printing catalogue, where this errand carries one. */
  catalogue?: { groups: PrintGroup[]; photos: Record<string, string> } | null;
  /** The questions as admin has them, which may differ from the shipped
   *  ones. Passed in rather than read here so the page stays a page. */
  asked: Ask[];
  hostels: string[];
  whatsapp: string;
}) {
  const link = waLink(whatsapp || null, spec.opening);
  const shopping = Boolean(prices && prices.groups.length > 0);

  return (
    <article className="-mt-4 pb-10">
      <PageHead ticket={spec.ticket} title={spec.title} lead={spec.lead} tone="ink">
        {/* The facts somebody needs before they decide, in the one place
            they are certain to look. */}
        <div className="flex flex-wrap gap-2">
          {spec.pills.map((one, at) => (
            <span
              key={one}
              className={`flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                at === 0 ? "bg-ink text-shell" : "border-2 border-ink bg-paper text-ink"
              }`}
            >
              {one}
            </span>
          ))}
        </div>

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
            {shopping ? "Or build your bag below" : "Or fill a form instead"}
          </a>
          .
        </p>
      </PageHead>

      <div className="space-y-8 py-8">
        {/* The thing they came to do, before anything explains itself. */}
        <div id="ask" className="scroll-mt-24">
          {catalogue ? (
            <PrintAsk
              groups={catalogue.groups}
              photos={catalogue.photos}
              hostels={hostels}
              whatsapp={whatsapp}
              opening={spec.opening}
              label={spec.label}
              chips={spec.chips}
              preset={spec.preset}
            />
          ) : shopping && prices ? (
            <LaundryPicker
              groups={prices.groups}
              minimum={prices.minimum}
              note={prices.note}
              whatsapp={whatsapp}
              opening={spec.opening}
            />
          ) : (
            <section className="space-y-3">
              <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
                Tell us what you need
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
          )}
        </div>

        {/* Everything below here is for whoever wants it, and nobody has to
            read a line of it to get started. */}
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

        {/* Skipped where a price list has already asked all of it by being
            a list of things to tap. */}
        {!shopping && (
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
        )}

        <Reason title={spec.careful.title}>{spec.careful.said}</Reason>

        <Section title="Questions people ask">
          <Asked asked={asked} />
        </Section>

        <p className="text-sm text-muted">
          Looking for something else we do not stock?{" "}
          <Link href="/custom-order" className="font-semibold text-brand underline">
            Ask us to get it
          </Link>
          .
        </p>

        <AlsoSee not={`/${spec.slug}`} />
      </div>
    </article>
  );
}
