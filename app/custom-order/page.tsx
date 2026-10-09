import type { Metadata } from "next";
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
  searchParams: Promise<{ sent?: string }>;
}) {
  const sent = (await searchParams).sent === "1";
  const [hostels, settings] = await Promise.all([hostelNames(), safeSettings()]);

  return (
    <div className="-mt-4 pb-10">
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
            <AskForm hostels={hostels} whatsapp={settings.whatsapp_number || null} />
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
                  <span className="text-sm text-[#d8d1c7]">{note}</span>
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
    </div>
  );
}
