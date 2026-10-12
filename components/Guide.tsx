import Link from "next/link";

/**
 * The parts a page written for a search is made of.
 *
 * There are several of these now, one per question somebody types: delivery
 * to PAU, snacks, gifts, what to buy. They are not variations of one page
 * and must not be, because four pages saying the same thing in a different
 * order is the thing search engines throw away. What they do share is their
 * shape, and the shape was copied by hand the first time it was needed
 * twice, which is how pages drift apart.
 */

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
        {title}
      </h2>
      <div className="max-w-[760px] space-y-2.5 leading-relaxed text-ink/80">
        {children}
      </div>
    </section>
  );
}

/** One reason, said as a heading and a sentence rather than a bullet. */
export function Reason({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-bold">{title}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}

export type Ask = { q: string; a: string };

/**
 * The questions, on the page in plain words.
 *
 * Always rendered as well as marked up. Markup that says something the page
 * does not is the thing that gets a site ignored, so there is one list and
 * both readers get it.
 */
export function Asked({ asked }: { asked: Ask[] }) {
  return (
    <dl className="space-y-4">
      {asked.map((one) => (
        <div key={one.q}>
          <dt className="font-bold">{one.q}</dt>
          <dd className="text-muted">{one.a}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The same questions, in the form a search engine reads. */
export function faqGraph(asked: Ask[]) {
  return {
    "@type": "FAQPage",
    mainEntity: asked.map((one) => ({
      "@type": "Question",
      name: one.q,
      acceptedAnswer: { "@type": "Answer", text: one.a },
    })),
  };
}

/**
 * The other pages written for a search, as a row at the foot of each one.
 *
 * A page nothing links to is a page nothing finds, and these are deliberately
 * out of the header: a student who is already here wants the menu, not an
 * explanation of the shop. Linking them to each other is how they are
 * reached at all, and it is also what tells a crawler they are one group of
 * pages about one campus rather than four strays.
 */
const PAGES: { href: string; said: string }[] = [
  { href: "/delivery-to-pau", said: "Delivery to PAU" },
  { href: "/pau-snacks", said: "Snacks at PAU" },
  { href: "/send-a-gift-to-pau", said: "Send a gift to PAU" },
  { href: "/pau-student-store", said: "What to buy at PAU" },
  { href: "/parents", said: "For parents" },
];

export function AlsoSee({ not }: { not: string }) {
  const rest = PAGES.filter((one) => one.href !== not);

  return (
    <Section title="Also worth reading">
      <ul className="flex flex-wrap gap-2 pt-1">
        {rest.map((one) => (
          <li key={one.href}>
            <Link
              href={one.href}
              className="inline-block rounded-full bg-paper px-3 py-1.5 text-sm font-bold shadow-card"
            >
              {one.said}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
