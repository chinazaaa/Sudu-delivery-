import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import ApplyToPromote from "@/components/ApplyToPromote";
import { publicOffer } from "@/lib/coupons";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { typicalBoxRate, typicalRate } from "@/lib/promoters";
import { naira } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get paid for every order",
  description:
    "Share your link with your block, your class, your group chat. Every order anybody places through it pays you, for as long as they keep ordering.",
  // The board is annotated sudu.store/become, but the page has always been
  // at this address and every link to it points here. The canonical stays
  // where the page is.
  alternates: { canonical: "/become-a-promoter" },
};

/** The message the board puts in the Ink card, ready to send. */
const ASK =
  "Hi Sudu, I want to be a promoter. My name is [name], I'm in [hostel], " +
  "and I'd like the code [code].";

/**
 * The job, said plainly, and two ways in.
 *
 * Promoters were made by hand in admin, which worked while there were two
 * of them and both had asked in person. This is the same arrangement
 * written down so somebody can find it on their own: what you do, what it
 * pays, when it pays, and what we will not ask of you.
 *
 * The board puts WhatsApp first and the form second, which is the order
 * people actually use: nearly everybody who wants this has a phone open
 * already, and a message gets answered the same day. The form is for the
 * ones who would rather not message a shop, so it is still a whole card
 * rather than a line of small print.
 */
export default async function BecomeAPromoter() {
  const settings = await safeSettings();
  const perk = await publicOffer(settings.promoter_perk_code).catch(() => null);
  // What the people already doing it are on, rather than a figure typed
  // into a page that nobody would notice had gone stale.
  const rate = await typicalRate();
  const boxRate = await typicalBoxRate();
  const ask = whatsappLink(settings.whatsapp_number, ASK);

  return (
    <div className="-mt-4 pb-12">
      <PageHead
        ticket="Earn with Sudu"
        title="Get paid for every order"
        lead="Share your link with your block, your class, your group chat. Anyone who orders through it is yours, and you earn on every order they ever make, not just the first."
      >
        {/* The board draws this at sixty pixels, taller than anything else
            on the page, because it is the whole point of the page. */}
        <div className="flex flex-col items-start gap-2.5">
          {ask ? (
            <a
              href={ask}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-[17px] sm:w-auto sm:min-h-[60px] sm:px-8 sm:text-lg"
            >
              Message us on WhatsApp
            </a>
          ) : (
            <a href="#apply" className="btn-primary w-full text-[17px] sm:w-auto sm:min-h-[60px] sm:px-8 sm:text-lg">
              Ask to join
            </a>
          )}
          <p className="hint">
            {settings.whatsapp_number ? `${settings.whatsapp_number} · ` : ""}
            we reply the same day.{" "}
            <a href="#apply" className="font-semibold text-brand-dark underline">
              Or fill a form instead
            </a>
            .
          </p>
        </div>
      </PageHead>

      <section className="grid gap-3.5 pt-8 sm:grid-cols-3 sm:pt-11">
        {[
          {
            k: "Every order",
            v: naira(rate),
            d: "Food, skincare, parcels",
            loud: false,
          },
          {
            k: "Every packed box",
            v: naira(boxRate),
            d: "Care packages, gifts, hostel packs",
            loud: true,
          },
          {
            k: "How long for",
            v: "Forever",
            d: "As long as they keep ordering",
            loud: false,
          },
        ].map((one) => (
          <div
            key={one.k}
            className={`card ${one.loud ? "bg-brand text-white" : ""}`}
          >
            <p className={`ticket ${one.loud ? "text-white/70" : "text-muted"}`}>
              {one.k}
            </p>
            <p className="font-display text-[44px] font-black uppercase leading-none sm:text-[54px]">
              {one.v}
            </p>
            <p
              className={`mt-1 text-sm ${one.loud ? "text-white/85" : "text-muted"}`}
            >
              {one.d}
            </p>
          </div>
        ))}
      </section>

      <h2 className="section-title pb-3.5 pt-8 sm:pt-11">How it works</h2>
      <div className="grid gap-3.5 sm:grid-cols-3">
        {[
          [
            "Message us",
            "One WhatsApp. Tell us your name, your block, and the code you want.",
          ],
          [
            "We set you up",
            "Usually the same day. You get your code, your PIN and your link.",
          ],
          [
            "Share it, get paid",
            `${naira(rate)} every order, ${naira(boxRate)} every packed box, every time they order.`,
          ],
        ].map(([title, said], at) => (
          <div key={title} className="card">
            <span className="font-display text-[40px] font-black leading-none text-brand">
              {at + 1}
            </span>
            <p className="mb-0.5 mt-1 text-base font-bold">{title}</p>
            <p className="hint">{said}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 pt-8 sm:pt-11 lg:grid-cols-[1.2fr_1fr] lg:gap-7">
        <div className="flex flex-col gap-4">
          {ask && (
            <section className="card bg-ink text-shell">
              <h2 className="section-title text-white">Just message us</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[#d8d1c7]">
                Quickest way in. Send this and we will do the rest:
              </p>
              {/* A card inside a card, so the words to send read as a
                  message rather than as more of the page. */}
              <p className="soft my-3.5 border-[#3a332d] bg-[#2c2721] px-3.5 py-3 text-[14.5px] leading-relaxed">
                &ldquo;Hi Sudu, I want to be a promoter. My name is{" "}
                <strong className="text-volt">[name]</strong>, I&apos;m in{" "}
                <strong className="text-volt">[hostel]</strong>, and I&apos;d like the
                code <strong className="text-volt">[code]</strong>.&rdquo;
              </p>
              <a
                href={ask}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
              >
                Open WhatsApp with this ready
              </a>
              {settings.whatsapp_number && (
                <p className="hint mt-2.5 text-[#8a8178]">{settings.whatsapp_number}</p>
              )}
            </section>
          )}

          <ApplyToPromote />
        </div>

        <div className="flex flex-col gap-3.5">
          <section className="card">
            <h3 className="font-display text-[22px] font-black uppercase leading-none">
              The honest version
            </h3>
            <div className="mt-2.5">
              {[
                [
                  "You are not an employee",
                  "No shifts, no targets, nothing to lose if you never share it.",
                ],
                [
                  "We pay after the run",
                  "Your money is counted the moment they pay, and sent on the next payday.",
                ],
                [
                  "You will see everything",
                  "Your own page lists every order you earned on and every payment we sent.",
                ],
                [
                  "Most people earn a little",
                  "A few thousand naira a month. The ones who share it in a big group chat earn more.",
                ],
              ].map(([title, said]) => (
                <div key={title} className="border-t-[1.5px] border-rule py-2.5">
                  <strong className="text-[14.5px]">{title}</strong>
                  <p className="hint mt-0.5 leading-relaxed">{said}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Kept from before the redesign. The board's honest version says
              what the job is; this says what it is not, and the four things
              on it are the four things people ask before they say yes. */}
          <section className="card">
            <h3 className="font-display text-[22px] font-black uppercase leading-none">
              What we will not ask you to do
            </h3>
            <ul className="mt-2.5">
              {[
                [
                  "Hold stock, or deliver anything.",
                  "You never touch food, money or somebody's order. We do all of that.",
                ],
                [
                  "Hit a target.",
                  "There is no quota and nothing to lose by a quiet month. A link that brings nobody in simply earns nothing.",
                ],
                [
                  "Pay for anything.",
                  "It costs nothing to start and there is nothing to buy, ever. If anybody tells you otherwise, they are not us.",
                ],
                [
                  "Pretend.",
                  "Say what you actually think of the food. Somebody who orders because of you and is let down is a customer we both lose.",
                ],
              ].map(([title, said]) => (
                <li key={title} className="border-t-[1.5px] border-rule py-2.5">
                  <strong className="text-[14.5px]">{title}</strong>
                  <p className="hint mt-0.5 leading-relaxed">{said}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3 className="font-display text-[22px] font-black uppercase leading-none">
              How you get paid
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed">
              Your own page shows what you have earned, order by order, as it
              happens. You put your account details on it yourself and we transfer
              what is owed. Nothing is held back behind a minimum, and what you
              have earned stays yours whether you are still posting or not.
            </p>
            {perk && (
              <p className="mt-2.5 rounded-xl bg-brand-tint px-3.5 py-3 text-[15px] leading-relaxed">
                <strong>Whoever uses your link gets something too.</strong>{" "}
                {perk.line} on their first order, so a link from you is worth
                opening rather than only worth posting.
              </p>
            )}
          </section>

          {/* The way back in for somebody who already has a code, which is
              the one thing on this page that is not an application. */}
          <section className="card border-volt-line bg-brand-tint">
            <h3 className="font-display text-[22px] font-black uppercase leading-none">
              Already have a code?
            </h3>
            <p className="hint mb-3 mt-2">
              Sign in with your code and four-digit PIN to see what you have
              earned.
            </p>
            <Link href="/promoter" className="btn-quiet w-full">
              Sign in
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
