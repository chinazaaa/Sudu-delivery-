import type { Metadata } from "next";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { safeSettings } from "@/lib/settings";
import HelpLine from "@/components/HelpLine";
import { naira } from "@/lib/money";
import Link from "next/link";
import ParcelForm from "@/components/ParcelForm";
import { liveRoutes, parcels } from "@/lib/parcels";
import { hostelNames } from "@/lib/hostels";
import { lagosToday } from "@/lib/time";
import { namedPromoters } from "@/lib/promoters";
import { WHO_COOKIE } from "@/lib/came-from";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * What WhatsApp reads out beside the card. Both ends named, because nobody
 * is looking for a parcel service: they have a dress sitting in a shop in
 * Lekki and want to know whether anybody goes that way.
 */
export const metadata: Metadata = {
  // The shop's name is added by the layout. Written here as well, it came
  // out as "Send a parcel · Sudu · Sudu".
  title: "Send a parcel to or from PAU",
  alternates: { canonical: "/parcel" },
  description:
    "Sangotedo, Lekki/Ikoyi, the mainland and Ikorodu, both ways to PAU. " +
    "Collected sealed, handed over sealed, photographed at each end.",
};

export default async function ParcelPage() {
  const setup = await parcels();
  const settings = await safeSettings();
  const routes = liveRoutes(setup.routes);
  // The same list the food and skincare checkouts use. A block typed by hand
  // is misspelt every other order, and a parcel is one bag with one place to
  // take it, so it matters more here than anywhere.
  const hostels = await hostelNames();
  const promoters = await namedPromoters();
  // Who sent them, off a promoter's own link, checked against the live list.
  const fromLink = (await cookies()).get(WHO_COOKIE)?.value ?? "";
  const sentBy = promoters.find((one) => one.code === fromLink)?.code ?? "";

  if (!setup.on || routes.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <section className="card space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Parcels</h1>
          <p className="text-ink/75">
            We are not carrying parcels just now.{" "}
            <Link href="/" className="font-semibold text-brand">
              The food is still going out
            </Link>
            .
          </p>
        </section>
      </div>
    );
  }

  // The cheapest band on each route, for the board's price tiles. A parcel
  // is priced by how heavy it is, so this is a "from" and the form says the
  // rest once somebody has told us which one it is.
  const from = routes.map((one) => ({
    label: one.label.replace(/\s+(to|from)\s+PAU$/i, ""),
    price: Math.min(...one.bands.map((band) => band.fee)),
  }));
  // The heaviest it carries at all, off the bands themselves rather than
  // written out twice.
  const heaviest = Math.max(
    0,
    ...routes.flatMap((one) => one.bands.map((band) => band.upTo))
  );
  const seen = new Set<string>();
  const tiles = from.filter((one) => {
    if (seen.has(one.label)) return false;
    seen.add(one.label);
    return true;
  });

  return (
    <div className="-mt-4">
      <section className="bleed relative overflow-hidden bg-ink text-shell">
        <span
          aria-hidden
          className="absolute inset-y-0 -right-10 w-[30%] opacity-85"
          style={{
            background:
              "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
          }}
        />
        <div className="shell relative flex flex-wrap items-end gap-8 pb-9 pt-7 sm:pb-11 sm:pt-9">
          <div className="flex min-w-0 flex-[1.3_1_380px] flex-col gap-4">
            <span className="ticket text-volt">
              Parcels · both ways · up to {heaviest}kg
            </span>
            <h1 className="font-display text-[min(15vw,7.5rem)] font-black uppercase leading-[0.85] sm:text-[clamp(3.5rem,8vw,7.5rem)]">
              Send a parcel
              <br />
              to or from PAU
            </h1>
            <p className="max-w-[540px] text-[17px] leading-relaxed text-rail-text sm:text-lg">
              {setup.blurb ||
                "We collect it sealed, carry it, and hand it over sealed, with a photo at each end."}
            </p>
          </div>

          {tiles.length > 0 && (
            <ul className="grid flex-[1_1_300px] grid-cols-2 gap-2">
              {tiles.map((one) => (
                <li
                  key={one.label}
                  className="flex flex-col gap-1 rounded-xl border border-[#3a322b] bg-[#26201b] p-4"
                >
                  <span className="text-sm text-rail-text">
                    {one.label} ↔ PAU
                  </span>
                  <span className="font-display text-[30px] font-extrabold leading-none">
                    from {naira(one.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-7 py-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
      <ParcelForm
        routes={routes}
        maxValue={setup.maxValue}
        hostels={hostels}
        promoters={promoters}
        sentBy={sentBy}
        monies={moniesOn(settings).map((code) => ({
          code,
          label: code === "GBP" ? "Pounds" : "Dollars",
          symbol: SYMBOL[code],
          rate: rateFor(settings, code),
        }))}
        today={lagosToday()}
      />
        </div>

        {/* The board's right column: what we will and will not carry, and
            what happens after the form. Said beside the form rather than
            above it, so neither one is in the other's way. */}
        <aside className="flex shrink-0 flex-col gap-4 lg:w-[320px]">
          <section className="card space-y-3">
            <h2 className="font-display text-[28px] font-black uppercase leading-none">
              The rules
            </h2>
            <ul className="flex flex-col gap-2.5">
              {setup.terms.map((line) => (
                <li key={line} className="flex items-start gap-2 leading-snug">
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white"
                  >
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-shell">
            <h2 className="font-display text-[28px] font-black uppercase leading-none">
              How it goes
            </h2>
            <ol className="flex flex-col gap-3">
              {[
                "Fill in the form.",
                "Pay by transfer or card.",
                "Agree the day with us on WhatsApp.",
                "We collect, carry and hand it over.",
              ].map((said, at) => (
                <li key={said} className="flex items-baseline gap-3">
                  <span className="font-display text-2xl font-black text-brand">
                    {String(at + 1).padStart(2, "0")}
                  </span>
                  <span>{said}</span>
                </li>
              ))}
            </ol>
          </section>

          <HelpLine number={settings.whatsapp_number} about="a parcel" page="Parcel" />
        </aside>
      </div>
    </div>
  );
}
