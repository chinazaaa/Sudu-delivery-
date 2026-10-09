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
import { WHO_COOKIE } from "@/lib/came-from";
import { cookies } from "next/headers";
import { lagosToday, whenLabel } from "@/lib/time";
import { ESTIMATE_NOTE } from "@/lib/arrival";
import OccasionBoxes from "@/components/OccasionBoxes";
import HelpLine from "@/components/HelpLine";
import AskParents from "@/components/AskParents";

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
/** Where the site lives. A message going into somebody else's phone cannot
 *  carry a relative link. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";

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

  // Who sent them, off a promoter's own link. Checked against the live list:
  // it arrives in a cookie, and a cookie is whatever somebody typed into it.
  const fromLink = (await cookies()).get(WHO_COOKIE)?.value ?? "";
  const sentBy = promoters.find((one) => one.code === fromLink)?.code ?? "";

  return (
    <div className="-mt-4">
      {/* The board's head for a shelf: Ink with the speed stripes, the trail
          back in ticket type, the name of the thing as big as the page
          allows, and the three things that are true of every box on it. */}
      <header className="bleed relative overflow-hidden bg-ink text-shell">
        <span
          aria-hidden
          className="absolute inset-y-0 -right-10 w-[34%] opacity-85"
          style={{
            background:
              "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
          }}
        />
        <div className="shell relative flex flex-col gap-4 pb-9 pt-6 sm:gap-5 sm:pb-12 sm:pt-7">
          <nav aria-label="Breadcrumb" className="ticket flex gap-2 text-[#b9b0a5]">
            <Link href="/" className="text-[#b9b0a5] hover:text-volt">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link href={base} className="text-[#b9b0a5] hover:text-volt">
              {back}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-volt">{occasion.name}</span>
          </nav>

          <h1 className="break-words font-display text-[min(16vw,8rem)] font-black uppercase leading-[0.84] sm:text-[clamp(3.25rem,10vw,8rem)]">
            {occasion.name}
          </h1>

          {occasion.blurb !== "" && (
            <p className="max-w-[560px] text-[17px] leading-snug text-[#d8d1c7] sm:text-xl">
              {occasion.blurb}
            </p>
          )}

          {/* What is true of every box on this shelf, said once at the top
              rather than repeated on each of them. */}
          <div className="flex flex-wrap gap-2">
            {isTimed(occasion) && occasion.happens_at && (
              <span className="ticket bg-brand px-2.5 py-1.5 text-white">
                {occasion.when_word} {whenLabel(occasion.happens_at)}
              </span>
            )}
            <span className="ticket bg-volt px-2.5 py-1.5 text-ink">
              Delivery in every box
            </span>
            <span className="ticket border-2 border-shell px-2.5 py-1.5">
              Fully customisable
            </span>
            {views.length > 0 && (
              <span className="ticket border-2 border-shell px-2.5 py-1.5">
                {views.length} box{views.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-8 py-8 lg:flex-row lg:items-start lg:gap-8 lg:py-10">
        <div className="min-w-0 flex-1 space-y-4">
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
          today={lagosToday()}
          soonest={soonestStandard()}
          latest={furthest()}
          hostels={hostels}
          promoters={promoters.map((one) => ({ code: one.code, name: one.name }))}
          sentBy={sentBy}
          me={me}
          note={ESTIMATE_NOTE}
          /* Only a thing with a whistle can run out of ways to arrive. A
             collection always has one: pick a day, or let us agree one. */
          shut={isTimed(occasion) && when.length === 0}
        />
      )}

        </div>

        {/* The board's right column: the way to get somebody else to pay for
            it, and the way to reach us about it. */}
        <aside className="flex shrink-0 flex-col gap-4 lg:w-[320px]">
          {/* On every shelf, not only the collections. It was held back from
              the occasions on the grounds that nobody asks their mother to
              pay for the girls' night — which is true of some of them and
              not of others, and the ones it is not true of were the ones
              being denied the message. Somebody who does not want to send
              it does not send it. */}
          {views.length > 0 && (
            <AskParents
              what={occasion.name}
              href={`${SITE}${base}/${occasion.slug}?utm_source=whatsapp`}
            />
          )}
          <HelpLine number={settings.whatsapp_number} about="a box" card />
          <Link href={elsewhere} className="btn-quiet w-full">
            {kind === "collection" ? "What is on for an occasion" : "See the collections"}
          </Link>
        </aside>
      </div>
    </div>
  );
}
