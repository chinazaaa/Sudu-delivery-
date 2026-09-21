import { notFound } from "next/navigation";
import Link from "next/link";

import { boxesOf, isTimed, occasionBySlug } from "@/lib/boxes";
import { boxView, whenOptions, type BoxView, type WhenOption } from "@/lib/box-view";
import { hostelNames } from "@/lib/hostels";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { safeSettings } from "@/lib/settings";
import { namedPromoters } from "@/lib/promoters";
import { whenLabel } from "@/lib/time";
import { ESTIMATE_NOTE } from "@/lib/arrival";
import OccasionBoxes from "@/components/OccasionBoxes";
import HelpLine from "@/components/HelpLine";

export const dynamic = "force-dynamic";

/**
 * One occasion and the boxes packed for it.
 *
 * Everything worked out on the server: what is in each box, what it costs
 * off today's menu, and every way it could get there. The page that follows
 * only has to let somebody point at one.
 */
const safely = async (box: Parameters<typeof boxView>[0]) => {
  try {
    return await boxView(box);
  } catch {
    return null;
  }
};

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

export default async function OccasionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const occasion = await occasionBySlug((await params).slug);
  if (!occasion || !occasion.active) notFound();

  const boxes = await boxesOf(occasion.id);

  // Pricing a box reads the menu and reading the cars reads the runs, and
  // both throw if the database so much as blinks. A throw here is the error
  // boundary, which is a stranger's page where an offer should be, so the
  // worst this may do is show fewer boxes or no times.
  const views = (await Promise.all(boxes.map(safely))).filter(
    (one): one is BoxView => one !== null
  );

  // Every box on one occasion rides the same cars, so this is asked once
  // rather than per box. The fee on each row is the first box's; the page
  // puts the right one on when somebody picks a box.
  const when: WhenOption[] = await cars(occasion, boxes);

  const signedIn = await currentCustomer();
  const settings = await safeSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/occasions" className="text-sm font-semibold text-brand">
          ← Everything else
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold">{occasion.name}</h1>
        {occasion.blurb !== "" && (
          <p className="mt-1 text-muted">{occasion.blurb}</p>
        )}
        {isTimed(occasion) && occasion.happens_at && (
          <p className="mt-2 font-bold text-brand-dark">
            {occasion.when_word} {whenLabel(occasion.happens_at)}
          </p>
        )}
      </div>

      {views.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing is packed for this one yet.{" "}
          <Link href="/" className="font-semibold text-brand">
            Order off the menu
          </Link>{" "}
          in the meantime.
        </p>
      ) : (
        <OccasionBoxes
          slug={occasion.slug}
          boxes={views}
          when={when}
          hostels={await hostelNames()}
          promoters={(await namedPromoters()).map((one) => ({
            code: one.code,
            name: one.name,
          }))}
          me={signedIn ? await customerDetails(signedIn) : null}
          note={ESTIMATE_NOTE}
          /* A box with nothing going is not a dead end. There is always a
             next way to eat, and saying so is the difference between a shut
             door and a later one. */
          shut={when.length === 0}
        />
      )}

      <HelpLine number={settings.whatsapp_number} about="a box" />
    </div>
  );
}
