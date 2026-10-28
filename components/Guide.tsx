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
 * The questions, on the page in plain words, folded up.
 *
 * Always rendered as well as marked up. Markup that says something the page
 * does not is the thing that gets a site ignored, so there is one list and
 * both readers get it.
 *
 * Folded because the two readers want opposite things. A search engine and
 * an assistant want every answer in full, and those answers are the part of
 * these pages that actually gets quoted back. A person wants to find their
 * own question, and eight answers laid out flat is a wall they scroll past
 * on the way to the thing they came for.
 *
 * A details element gives both. The words are all in the page, in the
 * markup and in the FAQ graph beside it; what changes is that somebody
 * holding a phone sees eight short lines and opens the one they care about.
 * The first is open, so the section does not read as a row of shut doors.
 */
export function Asked({ asked }: { asked: Ask[] }) {
  return (
    <div className="divide-y-2 divide-black/10 border-y-2 border-black/10">
      {asked.map((one, at) => (
        <details key={one.q} open={at === 0} className="group py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
            {one.q}
            <span
              aria-hidden
              className="shrink-0 text-xl leading-none text-muted transition group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="pt-2 text-muted">{one.a}</p>
        </details>
      ))}
    </div>
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
/*
 * Said as the thing the other page is for, not as its filing name.
 *
 * "For parents" is a label on a drawer: it tells a reader nothing they did
 * not know and tells a crawler nothing at all about what is behind it. The
 * words in a link are most of what the page it points at is taken to be
 * about, so each one says the thing somebody would have typed to look for
 * it.
 */
const PAGES: { href: string; said: string }[] = [
  { href: "/delivery-to-pau", said: "Food delivery to PAU" },
  { href: "/pau-snacks", said: "Snacks delivered to PAU" },
  { href: "/send-a-gift-to-pau", said: "Send a gift to a student at PAU" },
  { href: "/pau-student-store", said: "What to buy at PAU" },
  { href: "/parents", said: "Send food to your child at PAU" },
  // These two were reachable from the nav and from nowhere else, so the
  // one page carrying the thing nobody else here does, and the one
  // carrying parcels, sat outside the ring the other five make. A page
  // nothing links to is a page a crawler finds last and an assistant
  // reads as an edge of the site rather than part of it.
  { href: "/custom-order", said: "Ask us for something we do not stock" },
  { href: "/parcel", said: "Send a parcel to or from PAU" },
  { href: "/pau-pharmacy", said: "Pharmacy delivery to PAU" },
  { href: "/become-a-promoter", said: "Earn money as a student at PAU" },
  { href: "/pau-project-printing", said: "Thesis, project and assignment printing at PAU" },
  { href: "/pau-tailoring", said: "A tailor for students at PAU" },
  { href: "/pau-hair-and-barbing", said: "Hair, braids and barbing at PAU" },
  { href: "/pau-phone-and-laptop-repair", said: "Fix a phone or laptop at PAU" },
  { href: "/pau-buy-a-laptop", said: "Buy a laptop as a PAU student" },
  { href: "/pau-laundry", said: "Laundry collected from your block" },
  { href: "/christmas-hampers", said: "Christmas hampers in Ibeju-Lekki" },
  // The page that answers "is this shop real", which is the question
  // somebody asks an assistant before they ask it for dinner.
  { href: "/about", said: "Who Sudu is" },
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
