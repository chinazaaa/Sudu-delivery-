import Link from "next/link";
import PageHead from "./PageHead";

/**
 * The shape every page of small print on this site shares.
 *
 * Three of them say the same kind of thing at the same length, so the board
 * gives them one layout: the head with the date it was last changed, a
 * numbered list of what is on the page down the left, and the sections
 * themselves as numbered cards. Written once, because three hand-made small
 * print pages is three chances for one of them to end up looking like a
 * different website.
 */
export default function LegalLayout({
  ticket,
  title,
  lead,
  sections,
  here,
  children,
}: {
  ticket: string;
  title: string;
  lead: string;
  /** The headings, in the order they appear, for the list down the side. */
  sections: string[];
  /** Which of the fine-print pages this is, so the links beside it do not
   *  offer the page somebody is already reading. */
  here: "terms" | "privacy" | "returns";
  children: React.ReactNode;
}) {
  const fine = [
    { key: "terms", href: "/terms", said: "Terms of service" },
    { key: "privacy", href: "/privacy", said: "Privacy" },
    { key: "returns", href: "/return-policy", said: "Returns and refunds" },
  ];

  return (
    <article className="-mt-4 pb-10">
      <PageHead ticket={ticket} title={title} lead={lead} />

      <div className="flex flex-col gap-10 py-9 lg:flex-row lg:items-start">
        {/* What is on the page, numbered. A page of small print read on a
            phone is a scroll with no end in sight, and the one thing
            somebody came for is usually three sections down. */}
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:w-[260px] lg:shrink-0">
          <span className="ticket text-muted">On this page</span>
          <ol className="mt-3 flex flex-col">
            {sections.map((said, at) => (
              <li key={said}>
                <a
                  href={`#s${at + 1}`}
                  className="flex gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink/5"
                >
                  <span className="ticket pt-0.5 text-brand-dark">
                    {String(at + 1).padStart(2, "0")}
                  </span>
                  {said}
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col gap-1.5 border-t-2 border-dashed border-line pt-4 text-[15px]">
            {fine
              .filter((one) => one.key !== here)
              .map((one) => (
                <Link key={one.href} href={one.href} className="hover:text-brand-dark">
                  {one.said}
                </Link>
              ))}
            <Link href="/support" className="hover:text-brand-dark">
              Contact us
            </Link>
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
      </div>
    </article>
  );
}

/**
 * One clause, as a numbered card.
 *
 * The number is here rather than in the heading so the list beside it and
 * the card itself can never disagree about which is which.
 */
export function Clause({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`s${n}`}
      className="scroll-mt-24 rounded-2xl border-2 border-ink bg-paper p-5 sm:p-6"
    >
      <h2 className="flex items-baseline gap-3 font-display text-[26px] font-black uppercase leading-none sm:text-[30px]">
        <span className="text-brand">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="mt-3 max-w-[720px] space-y-2.5 leading-relaxed text-ink/75">
        {children}
      </div>
    </section>
  );
}
