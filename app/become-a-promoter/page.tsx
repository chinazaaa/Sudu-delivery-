import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import ApplyToPromote from "@/components/ApplyToPromote";
import { publicOffer } from "@/lib/coupons";
import { safeSettings } from "@/lib/settings";
import { typicalRate } from "@/lib/promoters";
import { naira } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get paid for telling people about Sudu",
  description:
    "Post your link, and every order anybody places through it pays you, for as long as they keep ordering. No stock, no deliveries, no shifts.",
  alternates: { canonical: "/become-a-promoter" },
};

/**
 * The job, said plainly, and a form.
 *
 * Promoters were made by hand in admin, which worked while there were two
 * of them and both had asked in person. This is the same arrangement
 * written down so somebody can find it on their own: what you do, what it
 * pays, when it pays, and what we will not ask of you.
 *
 * Deliberately short on persuasion. Anybody reading this is already working
 * out whether it is worth their time, and the honest answer to that is
 * numbers rather than adjectives.
 */
export default async function BecomeAPromoter() {
  const settings = await safeSettings();
  const perk = await publicOffer(settings.promoter_perk_code).catch(() => null);
  // What the people already doing it are on, rather than a figure typed
  // into a page that nobody would notice had gone stale.
  const rate = await typicalRate();

  return (
    <div className="space-y-10 pb-12">
      <PageHead
        ticket="Work with us"
        title="Get paid for telling people about Sudu"
        lead="Post your link. Every order anybody places through it pays you, for as long as they keep ordering."
        tone="ink"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            k: "What you do",
            v: "Share a link",
            d: "One address with your name in it. Put it in a bio, a group chat, a story. That is the job.",
          },
          {
            k: "What it pays",
            v: `${naira(rate)} an order`,
            d: "On every paid order from anybody who came through your link, not only their first.",
          },
          {
            k: "For how long",
            v: "For good",
            d: "Somebody who arrives through your link is yours. They order in March, you earn in March.",
          },
        ].map((one) => (
          <div key={one.k} className="card">
            <p className="ticket text-muted">{one.k}</p>
            <p className="mt-1 font-display text-4xl font-black uppercase leading-none">
              {one.v}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{one.d}</p>
          </div>
        ))}
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">What we will not ask you to do</h2>
        <ul className="space-y-2.5 text-[15px] leading-relaxed">
          <li>
            <strong>Hold stock, or deliver anything.</strong> You never touch food, money or
            somebody&apos;s order. We do all of that.
          </li>
          <li>
            <strong>Hit a target.</strong> There is no quota and nothing to lose by a quiet
            month. A link that brings nobody in simply earns nothing.
          </li>
          <li>
            <strong>Pay for anything.</strong> It costs nothing to start and there is nothing to
            buy, ever. If anybody tells you otherwise, they are not us.
          </li>
          <li>
            <strong>Pretend.</strong> Say what you actually think of the food. Somebody who
            orders because of you and is let down is a customer we both lose.
          </li>
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">How you get paid</h2>
        <p className="text-[15px] leading-relaxed">
          Your own page shows what you have earned, order by order, as it happens. You put your
          account details on it yourself and we transfer what is owed. Nothing is held back
          behind a minimum, and what you have earned stays yours whether you are still posting
          or not.
        </p>
        {perk && (
          <p className="rounded-xl bg-brand-tint px-4 py-3 text-[15px] leading-relaxed">
            <strong>Whoever uses your link gets something too.</strong> {perk.line} on their
            first order, so a link from you is worth opening rather than only worth posting.
          </p>
        )}
      </section>

      <ApplyToPromote />

      <p className="text-center text-sm text-muted">
        Already one of ours?{" "}
        <Link href="/promoter" className="font-semibold text-brand-dark underline">
          Sign in to your page
        </Link>
      </p>
    </div>
  );
}
