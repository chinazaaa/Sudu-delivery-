import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";

import { boxesOf, isTimed, occasionBySlug, type Shelf } from "@/lib/boxes";
import { furthest, soonestStandard } from "@/lib/box-day";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { boxViews, whenOptions, type BoxView, type WhenOption } from "@/lib/box-view";
import { hostelNames } from "@/lib/hostels";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { safeSettings } from "@/lib/settings";
import { namedPromoters } from "@/lib/promoters";
import { whenLabel } from "@/lib/time";
import { ESTIMATE_NOTE } from "@/lib/arrival";
import OccasionBoxes from "@/components/OccasionBoxes";
import HelpLine from "@/components/HelpLine";

/**
 * One collection or occasion, and the boxes packed for it.
 *
 * Everything worked out on the server: what is in each box, what it costs
 * off today's menu, and every way it could get there. The page that follows
 * only has to let somebody point at one.
 *
 * It answers on both words. A thing shows at its own word and sends anybody
 * who arrived by the other one there, so every link ever sent still works
 * and Google is never told the same boxes live at two addresses.
 */
const cars = async (
  occasion: Parameters<typeof whenOptions>[0],
  boxes: Parameters<typeof whenOptions>[1][]
): Promise<WhenOption[]> => {
  if (boxes.length === 0) return [];
  try {
    return await whenOptions(occasion, boxes[0]);
  } catch {
    return [];
  }
};

export default async function BoxDetail({
  slug,
  kind,
  base,
  elsewhere,
  back,
}: {
  slug: string;
  /** The shelf this route is for. Anything else here belongs at `elsewhere`. */
  kind: Shelf;
  base: string;
  /** Where the other shelf keeps its things. */
  elsewhere: string;
  /** What the way back up is called. */
  back: string;
}) {
  const occasion = await occasionBySlug(slug);
  if (!occasion || !occasion.active) notFound();
  if (occasion.kind !== kind) permanentRedirect(`${elsewhere}/${occasion.slug}`);

  const boxes = await boxesOf(occasion.id);
  const signedIn = await currentCustomer();

  // Everything the page needs, asked for at once. Each of these is a trip
  // to a database in London, and done one after another they were what made
  // opening a box feel like waiting.
  //
  // Pricing reads the menu and the cars read the runs, and both throw if the
  // database so much as blinks. A throw here is the error boundary, which is
  // a stranger's page where an offer should be, so the worst any of this may
  // do is show fewer boxes or no times.
  const [views, when, hostels, promoters, me, settings] = await Promise.all([
    boxViews(boxes).catch((): BoxView[] => []),
    cars(occasion, boxes),
    hostelNames().catch((): string[] => []),
    namedPromoters().catch(() => [] as { code: string; name: string }[]),
    signedIn ? customerDetails(signedIn).catch(() => null) : Promise.resolve(null),
    safeSettings(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href={base} className="text-sm font-semibold text-brand">
          ← {back}
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold">{occasion.name}</h1>
        {occasion.blurb !== "" && <p className="mt-1 text-muted">{occasion.blurb}</p>}
        {isTimed(occasion) && occasion.happens_at && (
          <p className="mt-2 font-bold text-brand-dark">
            {occasion.when_word} {whenLabel(occasion.happens_at)}
          </p>
        )}
      </div>

      {views.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing is packed for this one yet.{" "}
          <Link href="/products" className="font-semibold text-brand">
            Order off the menu
          </Link>{" "}
          in the meantime.
        </p>
      ) : (
        <OccasionBoxes
          slug={occasion.slug}
          boxes={views}
          when={when}
          /* A thing with a whistle picks a real car. Everything else picks a
             date, because a care package is found, bought and packed before
             anybody drives it anywhere. */
          timed={isTimed(occasion)}
          hint={occasion.custom_hint}
          monies={moniesOn(settings).map((code) => ({
            code,
            label: code === "GBP" ? "Pounds" : "Dollars",
            symbol: SYMBOL[code],
            rate: rateFor(settings, code),
          }))}
          soonest={soonestStandard()}
          latest={furthest()}
          hostels={hostels}
          promoters={promoters.map((one) => ({ code: one.code, name: one.name }))}
          me={me}
          note={ESTIMATE_NOTE}
          /* Only a thing with a whistle can run out of ways to arrive. A
             collection always has one: pick a day, or let us agree one. */
          shut={isTimed(occasion) && when.length === 0}
        />
      )}

      <HelpLine number={settings.whatsapp_number} about="a box" />
    </div>
  );
}
