import type { Metadata } from "next";
import AskForm from "@/components/AskForm";
import { hostelNames } from "@/lib/hostels";
import { safeSettings } from "@/lib/settings";
import { naira } from "@/lib/money";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const TITLE = "Campus pickup";
const BLURB =
  "Bought food on campus? Send us the barcode or a picture and we collect it " +
  "and bring it to your Pan-Atlantic University hostel.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/pickup" },
  openGraph: { title: TITLE, description: BLURB, url: "/pickup" },
};

/**
 * Student center pickup: they buy at the student center and send the
 * barcode, we scan it, collect the food and bring it to their hostel. The
 * fee and the days and hours are written in admin, so nothing here is a
 * number somebody has to deploy to change.
 */
export default async function StudentCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const sent = (await searchParams).sent === "1";
  const [hostels, settings] = await Promise.all([hostelNames(), safeSettings()]);
  if (settings.pickup_on === "off") notFound();

  const fee = Number(String(settings.pickup_fee).replace(/[^\d]/g, ""));
  const when = [settings.pickup_days, settings.pickup_hours].filter(Boolean).join(", ");

  return (
    <div className="-mt-4 pb-10">
      <div className="shell space-y-1 pt-3">
        <h1 className="font-display text-3xl font-black uppercase leading-none">
          Campus pickup
        </h1>
        <p className="text-sm text-muted">
          We collect your food, laundry or printing and bring it to your hostel.
          {fee > 0 ? ` ${naira(fee)}.` : ""}
          {when ? ` ${when}.` : ""}
        </p>
      </div>

      <div className="shell py-3">
        {sent ? (
          <div className="rounded-2xl border-2 border-ink bg-paper p-6 shadow-lift">
            <p className="font-display text-[32px] font-black uppercase leading-none text-mint">
              We have it.
            </p>
            <p className="mt-2 text-ink/75">
              We will message you on WhatsApp when we are on our way to collect it.
            </p>
          </div>
        ) : (
          <AskForm
            hostels={hostels}
            whatsapp={settings.whatsapp_number || null}
            tag="Campus pickup"
            back="/pickup"
            noChips
            kinds
            noBudget
            notePlaceholder="Need it before 5pm"
            places={settings.pickup_places.split("\n").map((one) => one.trim()).filter(Boolean)}
            printPlaces={settings.pickup_print_places.split("\n").map((one) => one.trim()).filter(Boolean)}
            rows={3}
            opening="Hi Sudu, I would like a campus pickup. I will send my barcode or a picture if I have one."
            lead="Send us what to collect."
            label={"Tell us about it"}
            placeholder="Chicken and rice, or two bags of laundry, or 40 pages to print"
            help="A line is enough."
            fileLabel="Barcode or picture, if you have one"
            fileHint="Optional. If it will not scan, we call you."
            send="Send it to us"
          />
        )}
      </div>
    </div>
  );
}
