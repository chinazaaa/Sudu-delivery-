import Link from "next/link";
import PageHead from "@/components/PageHead";

/**
 * A page that is not here.
 *
 * Drawn as every other page on the site is: the band across the top with
 * the ticket line, the name as big as the page allows, and one sentence.
 * It was a small white card in the middle of the screen, which was the
 * shape the site had before the redesign, so the one page somebody reaches
 * by accident was the one page that did not look like the shop.
 *
 * Three ways on rather than a single Back: a dead link is read two ways,
 * and the second reading is not "this link is broken" but "you do not sell
 * this". Somebody who followed a link to something gone is exactly who to
 * offer the custom order to.
 */
export default function NotFound() {
  return (
    <article className="-mt-4 pb-10">
      <PageHead
        ticket="404 · Nothing at this address"
        title="This page has gone"
        lead="The link may be old, or the run it pointed at may have been and gone. Everything on the menu is still where it was."
        tone="ink"
      />

      <section className="flex flex-col gap-8 py-12 sm:py-14">
        <h2 className="section-title">Where to from here</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["/products", "The menu", "Every kitchen, mixed into one run."],
            ["/orders", "My orders", "Where the one you placed has got to."],
            [
              "/custom-order",
              "Ask us",
              "Looking for something we do not carry? Tell us and we will go and get it.",
            ],
          ].map(([href, said, note]) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-1.5 rounded-2xl border-2 border-ink bg-paper p-5 transition active:translate-x-0.5 active:translate-y-0.5"
            >
              <span className="font-display text-[30px] font-extrabold uppercase leading-none">
                {said}
              </span>
              <span className="text-[15px] text-ink/70">{note}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-5">
          <h2 className="section-title">Hungry already?</h2>
          <Link href="/" className="btn-primary border-2 border-ink">
            Back to the menu <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </article>
  );
}
