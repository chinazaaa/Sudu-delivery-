import type { Metadata } from "next";
import AskForm from "@/components/AskForm";
import PageHead from "@/components/PageHead";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const TITLE = "Market delivery";
const BLURB =
  "Send us your market list. We buy it at the market, tell you what it comes to, " +
  "and deliver it to your Pan-Atlantic University hostel.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/market" },
  openGraph: { title: TITLE, description: BLURB, url: "/market" },
};

/**
 * Market delivery: a list instead of a cart.
 *
 * A market run is thirty small things, and adding thirty things to a cart
 * is the stress this page exists to avoid. They write or paste the list,
 * the shop prices it by hand and sends the total, and it is bought and
 * delivered as an ordinary order. WhatsApp first, because it is where the
 * shop already talks to everybody; the form is the second way in.
 */
export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const sent = (await searchParams).sent === "1";
  const [hostels, settings] = await Promise.all([hostelNames(), safeSettings()]);

  return (
    <div className="-mt-4 pb-10">
      <PageHead
        ticket="Saturdays"
        title={
          <>
            Market delivery.
            <br />
            <span className="text-brand">Send your list.</span>
          </>
        }
        lead="Write or paste everything you want from the market. We price it, you say yes, and we buy it and bring it to your hostel."
      />

      <div className="py-8">
        {sent ? (
          <div className="rounded-2xl border-2 border-ink bg-paper p-6 shadow-lift">
            <p className="font-display text-[32px] font-black uppercase leading-none text-mint">
              We have your list.
            </p>
            <p className="mt-2 text-ink/75">
              We will message you on WhatsApp with what it comes to. Nothing is
              bought until you say yes.
            </p>
          </div>
        ) : (
          <AskForm
            hostels={hostels}
            whatsapp={settings.whatsapp_number || null}
            tag="Market list"
            back="/market"
            simple
            rows={9}
            opening="Hi Sudu, here is my market list."
            lead="Open WhatsApp and paste your list. We price it and send you the total."
            label="Your market list"
            placeholder={"Pepper\nTomatoes\nOnions\nTin tomatoes\nEgusi"}
            help="One thing to a line is easiest. Say how much of each if it matters."
            send="Send us my list"
          />
        )}
      </div>
    </div>
  );
}
