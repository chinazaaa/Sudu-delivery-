import { lagosToday } from "@/lib/time";
import IceInCart from "@/components/IceInCart";
import { iceForCart } from "@/lib/ice-server";
import HelpLine from "@/components/HelpLine";
import { cookies } from "next/headers";
import {
  activeBands,
  hoursByDay,
  safeSettings,
  sameDayPricing,
} from "@/lib/settings";
import { liveOffers } from "@/lib/coupons";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";
import { WHO_COOKIE } from "@/lib/came-from";
import Checkout, { type AddingTo, type SignedIn } from "@/components/Checkout";
import { whoIsSignedIn } from "@/lib/customer";
import { db } from "@/lib/supabase";
import { openBatches, recentlyClosedBatch, carsOnOffer } from "@/lib/batches";
import { existingLoad } from "@/lib/orders";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { normalisePhone } from "@/lib/phone";
import {
  allAreas,
  allAreaPairs,
  areaOfEach,
  valueBandsOfEach,
  stepFeeOfEach,
  openDaysOfEach,
} from "@/lib/areas-server";
import { toBatchView, toClosedBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; phone?: string }>;
}) {
  const params = await searchParams;

  const [batches, justClosed, { ice, needsIce }] = await Promise.all([
    openBatches(),
    recentlyClosedBatch(),
    iceForCart(),
  ]);

  // Every run that is open, not the next few. Which of them can carry this
  // cart depends on where its restaurants are, and only the browser knows
  // what is in the cart, so cutting the list here cut off the Saturday run
  // that was the one going to Lekki: the checkout said no run was going
  // there while it sat fifth in a list of four. The page keeps the list
  // short itself, out of the ones that can actually carry the order.
  const views = [
    ...(justClosed ? [toClosedBatchView(justClosed)] : []),
    ...batches.map(toBatchView),
  ];

  // Arriving from "add to my order": same phone, same batch. It locks the
  // checkout to that car and fills in who it is for. Delivery is charged on
  // it like any other order, because crediting a fee across two orders on one
  // number was gameable by anybody willing to put a friend's food on their
  // own number.
  const phone = normalisePhone(params.phone ?? "");
  const target = params.batch && views.find((v) => v.id === params.batch && !v.closed);
  let adding: AddingTo | null = null;

  if (phone && target) {
    const load = await existingLoad(target.id, phone);
    if (load.items > 0) {
      adding = {
        batchId: target.id,
        batchLabel: target.label,
        phone,
        name: load.orders[0]?.customer_name ?? "",
        hostel: load.orders[0]?.hostel ?? "",
      };
    }
  }

  // Somebody abroad paying by card, where the shop has switched it on and
  // set a rate it will honour. Worked out here so the checkout is handed
  // figures rather than settings.
  // Who sent them, if they came in through a promoter's own link. Checked
  // against the live list rather than trusted: it is a cookie, and a cookie
  // is whatever somebody types into it.
  const promoters = await namedPromoters();
  const fromLink = (await cookies()).get(WHO_COOKIE)?.value ?? "";
  const me = await whoIsSignedIn();
  /*
   * The link first, then whoever already brought them.
   *
   * A promoter is written once on a first order and never touched again,
   * which is what makes the commission lifetime. So for anybody the shop
   * already knows, this question has an answer and asking it again is
   * asking them to remember something the shop wrote down for them: the
   * box opened on "Somewhere else" and a regular who had been brought in
   * by somebody picked it, which is the one answer that is never true for
   * her.
   *
   * Only while that promoter is still promoting. One who has stopped is
   * not a name to put in front of anybody, and then it is Somewhere else,
   * which is honest.
   */
  const theirs = me?.heardFrom ?? "";
  const sent =
    promoters.find((one) => one.code === fromLink) ??
    promoters.find((one) => one.code === theirs);
  const sentBy = sent?.code ?? "";
  // First name only: a discount line saying "Claire Okonkwo's link" is a
  // surname nobody needed on a checkout.
  const sentByName = (sent?.name ?? "").trim().split(/\s+/)[0] ?? "";

  const settings = await safeSettings();
  const monies = moniesOn(settings).map((code) => ({
    code,
    label: code === "GBP" ? "Pounds" : "Dollars",
    symbol: SYMBOL[code],
    rate: rateFor(settings, code),
  }));

  return (
    <>
      {/* The bag of ice block, put in by the shop wherever the cart is
          read, so the figure here and the figure on the bill are one
          figure. See components/IceInCart.tsx. */}
      <IceInCart ice={ice} needsIce={needsIce} />
      <Checkout
      iceItemId={ice?.itemId ?? ""}
      monies={monies}
      batches={views}
      today={lagosToday()}
      adding={adding}
      /*
       * Whoever is signed in, as the shop already knows them.
       *
       * This page asked everybody for their name, their number and their
       * block every single time, including the person whose number it was
       * holding a signed cookie for. The only way to fill it in was the PIN
       * box, which asks a regular to prove again what she proved when she
       * signed in, and which the shop cannot use at all when it is taking
       * an order for somebody: a PIN only ever goes to the number it
       * belongs to.
       */
      you={me}
      // Worked out here so the clock is the shop's, not whatever the phone
      // says, and so a page left open all morning cannot offer a time that
      // has already gone.
      sameDaySlots={
        // Today's times go while the one driver is out with tonight's run.
        // See lib/one-driver.ts: the clock allows both, one person does not.
        (await safeSettings()).same_day_on === "on"
          ? await carsOnOffer(
              slotsWorthOffering(
                /*
                 * As far ahead as the shop is open, not just today and
                 * tomorrow.
                 *
                 * The checkout asks which day somebody wants their food, and
                 * a day with no run on it is a car of its own. Two days of
                 * windows meant that past tomorrow the dropdown had runs and
                 * nothing else, so a week with no Monday run had no way to
                 * offer Monday at all.
                 */
                deliverySlots(
                  new Date(),
                  await hoursByDay(),
                  (await safeSettings()).order_horizon_days || 7
                ),
                // A window a run already covers is not offered: the run gets
                // there at the same hour for two and a half thousand less.
                batches.map((one) => ({
                  run_date: one.run_date,
                  window: one.delivery_window_text,
                }))
              )
            )
          : []
      }
      sameDayBands={(await sameDayPricing()).bands}
      urgentExtra={(await sameDayPricing()).urgentExtra}
      bands={await activeBands()}
      // Where each kitchen is, and what that adds. The checkout prices by the
      // furthest thing in the cart, which is the same rule the server charges
      // by, so the number on this page is the number on the bill.
      areas={await allAreas()}
      areaOf={await areaOfEach()}
      areaPairs={await allAreaPairs()}
      // The kitchens that charge by what the shopping comes to rather than
      // by how many things it is. A market trip is one trip and two bags.
      valueBandsOf={await valueBandsOfEach()}
      stepFeeOf={await stepFeeOfEach()}
      openDaysOf={await openDaysOfEach()}
      // The promotions on today, with their rules, so the checkout quotes the
      // price it is about to charge rather than the ladder it is replacing.
      offers={await liveOffers()}
      hostels={await hostelNames()}
      // Asked on the one form a first order has to pass through. Whoever
      // they name is theirs for life, so there is no second chance at it.
      promoters={promoters}
      // Who sent them, off their own link, so the question below is already
      // answered and they only have to look at it if it is wrong.
      sentBy={sentBy}
      sentByName={sentByName}
      />
      {/* Every page somebody can get stuck on has the same way out, so
          nothing needs a paragraph explaining itself: if it is not clear,
          they message us and we answer. */}
      <HelpLine number={settings.whatsapp_number} about="my order" page="Checkout" />
    </>
  );
}
