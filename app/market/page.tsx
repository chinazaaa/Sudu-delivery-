import type { Metadata } from "next";
import AskForm from "@/components/AskForm";
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
      <div className="shell space-y-1 pt-3">
        <h1 className="font-display text-3xl font-black uppercase leading-none">
          Market delivery
        </h1>
        <p className="text-sm text-muted">
          Every Saturday. Send your list, and we agree the time and the fee with you on WhatsApp.
        </p>
      </div>

      <div className="shell py-3">
        {sent ? (
          <div className="rounded-2xl border-2 border-ink bg-paper p-6 shadow-lift">
            <p className="font-display text-[32px] font-black uppercase leading-none text-mint">
              We have your list.
            </p>
            <p className="mt-2 text-ink/75">
              We will message you on WhatsApp to agree the time and the price.
              Nothing is bought until you say yes.
            </p>
          </div>
        ) : (
          <AskForm
            hostels={hostels}
            whatsapp={settings.whatsapp_number || null}
            tag="Market list"
            back="/market"
            simple
            rows={10}
            opening="Hi Sudu, here is my market list."
            lead="Open WhatsApp and paste your list. We agree the time and the price there."
            label="Your market list"
            placeholder={"Egusi, 1 kg\n5 pepper\nTomatoes x 10\nIndomie, 1 carton (chicken)\nPeak milk, 2 tins\nGolden Penny spaghetti x 5\nDangote sugar, 1 kg\nTitus sardine x 3\nCrayfish, N2,000 worth"}
            help="Name the brand or size if it matters: Peak milk, 1 kg, N2,000 worth. One to a line."
            send="Send us my list"
          />
        )}
      </div>
    </div>
  );
}
