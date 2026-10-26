import { NextResponse } from "next/server";

import { openBatches, carsOnOffer } from "@/lib/batches";
import { hostelNames } from "@/lib/hostels";
import { shopEmails } from "@/lib/settings";
import { openRestaurants } from "@/lib/menu";
import { anyCodeToType } from "@/lib/coupons";
import { faqsForChat } from "@/lib/faq";
import { cardOnOffer } from "@/lib/cards";
import { liveOccasions } from "@/lib/boxes";
import { giftyDishes } from "@/lib/products";
import { activeBands, hoursByDay, safeSettings, sameDayPricing } from "@/lib/settings";
import { deliverySlots, slotsWorthOffering, windowHours } from "@/lib/same-day";
import { allAreas } from "@/lib/areas-server";
import { headlineFee } from "@/lib/fees";
import { toBatchView } from "@/lib/view";
import { runDateLabel } from "@/lib/time";
import { TZ } from "@/lib/config";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * The customer behind the cookie, where there is one.
 *
 * Fails to null rather than throwing, because not knowing who somebody is
 * is the ordinary case and must never be the reason the chat will not
 * open.
 */
async function whoIsAsking(): Promise<
  { name: string; phone: string; hostel: string } | null
> {
  try {
    const phone = await currentCustomer();
    if (!phone) return null;
    const details = await customerDetails(phone);
    if (!details) return null;
    return {
      name: String(details.name ?? "").trim(),
      phone,
      hostel: String(details.hostel ?? "").trim(),
    };
  } catch {
    return null;
  }
}


/**
 * What the chat needs before it can ask anything.
 *
 * The hostels, the runs still taking orders, the counters open today, and
 * what delivery starts at. Read here rather than in the browser, because a
 * page cannot be trusted with a key that reads every customer, and because
 * what a run costs is a thing this shop decides in one place.
 *
 * Nothing about a price is worked out here either. The fee goes up with how
 * much is in the car, so the only honest thing to say before anybody has
 * ordered is what it starts at. The bill says the rest, from the same till
 * that charges it.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [
      hostels,
      batches,
      menu,
      settings,
      bands,
      hours,
      sameDay,
      codes,
      faqs,
      card,
      shelves,
      giftDishes,
    ] = await Promise.all([
      hostelNames(),
      openBatches().catch(() => []),
      // The counters only, not every dish on every one of them. Reading
      // the whole menu here cost the chat ten seconds of silence before
      // it could say hello, which is the one thing it cannot afford.
      openRestaurants().catch(() => []),
      safeSettings(),
      activeBands(),
      hoursByDay().catch(() => null),
      sameDayPricing().catch(() => null),
      // Whether there is a code anybody could type tonight. A box for a
      // discount code when the shop has none is a box that can only say
      // no, which reads as something being withheld.
      anyCodeToType().catch(() => false),
      // What the chat is allowed to answer on its own. There is no model in
      // it, so this is the whole of what it knows: the shop's own words,
      // edited in admin, and nothing it made up.
      faqsForChat().catch(() => []),
      // The handwritten card, as a real product with a real price. Null
      // where none is set or it is off the menu, and then it is simply
      // never offered.
      cardOnOffer().catch(() => null),
      // The made-up boxes, which are a shelf of their own and on no food
      // menu. Without them the chat says "I cannot find that anywhere on
      // the shop" to somebody asking for a thing the shop is selling.
      liveOccasions().catch(() => []),
      // The handful of dishes whose names sound like an occasion, so the
      // gift rule can tell a tub of Birthday Cake ice cream from somebody's
      // actual birthday. Not the menu: five words, two hundred rows at
      // most, and the chat still says hello in no time.
      giftyDishes(),
    ]);

    /*
     * The day a run goes out, as a calendar block reads it.
     *
     * Off the date string itself rather than off a Date, because midnight
     * in Lagos is the evening before in UTC and a server that thinks in
     * UTC drew "Thursday 15 October" above a block saying WED 14.
     */
    const block = (date: string) => {
      const [year, month, day] = date.split("-").map(Number);
      const at = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
      return {
        dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][at.getUTCDay()],
        dom: day ?? 1,
      };
    };

    const runs = batches
      .filter((batch) => !batch.full)
      .map((batch) => {
        const view = toBatchView(batch);
        return {
          id: view.id,
          label: view.label,
          // The day in words, for the line the chat speaks: "our next run is
          // Friday" reads as a sentence, "Fri · Night" reads as a table.
          said: runDateLabel(batch.run_date),
          runDate: batch.run_date,
          window: view.deliveryWindow,
          closes: view.cutOffLabel,
          // When the car actually sets off, as an instant, so "sooner"
          // can mean sooner rather than "a different row on a list".
          startsAt: (() => {
            const hours = windowHours(batch.delivery_window_text);
            const at = `${batch.run_date}T${String(hours?.from ?? 17).padStart(2, "0")}:00:00+01:00`;
            return new Date(at).toISOString();
          })(),
          // For the little calendar block on the slot card.
          ...block(batch.run_date),
          areas: view.areas,
          onlyPlaces: view.onlyPlaces,
        };
      });

    const kitchens = menu.map((place) => ({ id: place.id, name: place.name }));

    /*
     * A car sent out for one order, where the shop is still offering them.
     *
     * Worked out by the same two functions the checkout uses, which is the
     * point: the hours the shop delivers are a setting somebody changes,
     * and a slot already covered by a scheduled run is not a thing to sell
     * twice. Order at six and the soonest car is tomorrow, and the chat
     * says tomorrow because it asked rather than because it guessed.
     */
    const cars =
      hours === null
        ? []
        // Today's times go while somebody is out driving tonight's run:
        // one driver cannot do both. Tomorrow's stay, because tomorrow is
        // a different day. See lib/one-driver.ts.
        : (await carsOnOffer(
            slotsWorthOffering(
            /*
             * A week, not two days.
             *
             * Two days is the right reach for "when can I eat", which is
             * what this used to be for. A gift is a different question: a
             * birthday is on the day it is on, and a chat that can only
             * see as far as tomorrow has to tell somebody to come back on
             * Thursday. The soonest four are still the soonest four, so
             * the ordinary flow is untouched.
             */
            deliverySlots(new Date(), hours, 8),
              batches.map((batch) => ({
                run_date: batch.run_date,
                window: batch.delivery_window_text,
              }))
            )
          )).slice(0, 24).map((slot) => ({
            at: slot.at,
            label: slot.label,
            phrase: slot.phrase,
            /* The hours on their own, "between 4pm and 7pm", so the chat
               can say when a day lands the same way it says it for any
               other day. Nobody picks a time: they pick a day and the
               window comes off the hours admin set. */
            window: slot.window,
            day: slot.day,
            date: slot.date,
            /* Going out within the hour costs extra on the same day
               ladder, and the chat cannot work that out for itself. */
            urgent: slot.urgent,
            ...block(
              new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(slot.at))
            ),
          }));

    return NextResponse.json({
      hostels,
      runs,
      cars,
      /** What a car of its own starts at, said as a floor like the rest. */
      carFrom: sameDay === null ? 0 : headlineFee(sameDay.bands),
      kitchens,
      // What delivery starts at, said as a floor rather than as the price.
      feeFrom: headlineFee(bands),
      /*
       * The places that cost more than the floor.
       *
       * A figure on its own reads as the price, and somebody whose food
       * comes from Ikoyi is then told a number three and a half thousand
       * short of what they will pay. Named rather than counted, because
       * "some areas cost more" answers nothing: a student knows whether
       * they are ordering from Lekki.
       */
      farther: (await allAreas())
        .filter((one) => one.id !== "" && (one.runExtra > 0 || one.sameDayExtra > 0))
        .map((one) => one.name),
      codes,
      faqs,
      card,
      /*
       * The made-up boxes, which are a shelf of their own and on no food
       * menu.
       *
       * Fetched here all along and never put in the answer: the field was
       * simply missing from this object, so the chat read undefined every
       * time and fell back to an empty list. "Matriculation box" is a
       * thing this shop sells and the chat has been saying it cannot find
       * it anywhere on the shop.
       */
      boxes: shelves.map((one) => ({
        slug: one.slug,
        name: one.name,
        kind: one.kind,
        happensAt: one.happens_at ?? null,
        closesAt: one.closes_at ?? null,
      })),
      /*
       * The handful of dishes whose names sound like an occasion.
       *
       * "Birthday Cake Remix" is a tub of ice cream, and the gift rule is
       * a plain regex that cannot tell that from somebody's actual
       * birthday: a pasted basket with one in it was answered with "who is
       * it going to?" on an order the person was placing for themselves.
       */
      giftDishes,
      /*
       * How far ahead a customer may book, which is not how far ahead the
       * runs are planned.
       *
       * Runs exist three weeks out so the shop can plan them; a customer
       * is offered the near ones, because food is not planned a fortnight
       * ahead and an order sitting unpaid that long is priced off a menu
       * that has since moved. The chat says the real number rather than a
       * guess at it, so raising it in Settings widens the chat too.
       */
      horizonDays: Math.max(1, Number(settings.order_horizon_days) || 7),
      /*
       * Who is reading this, where the shop already knows.
       *
       * The chat opened by asking everybody their name, including the
       * person who ordered last Tuesday and whose name is on the order
       * she is looking at. Asking somebody what to call them when you
       * already call them that is the shop admitting it was not paying
       * attention, and it costs a message at the exact moment somebody is
       * hungry and deciding whether this is quicker than WhatsApp.
       *
       * Only ever read, never written from here: the cookie is the proof
       * of who they are and the chat does not get to claim it for them.
       */
      you: await whoIsAsking(),
      whatsapp: String(settings.whatsapp_number ?? ""),
      // So the way out is never only one door: somebody who will not open
      // WhatsApp still has somewhere to write to.
      email: shopEmails(settings.contact_email)?.orders ?? "",
    });
  } catch {
    // A chat that cannot be opened is better than a page that breaks, and
    // the panel says so in its own words when the lists come back empty.
    return NextResponse.json({
      hostels: [],
      runs: [],
      cars: [],
      codes: false,
      faqs: [],
      card: null,
      boxes: [],
      giftDishes: [],
      horizonDays: 7,
      carFrom: 0,
      kitchens: [],
      feeFrom: 0,
      farther: [],
      whatsapp: "",
      email: "",
      you: null,
    });
  }
}
