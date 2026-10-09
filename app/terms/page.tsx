import type { Metadata } from "next";
import LegalLayout, { Clause } from "@/components/LegalLayout";
import { policyDate } from "@/lib/time";
import Link from "next/link";
import { safeSettings } from "@/lib/settings";
import { parseAreas } from "@/lib/areas";
import { liveRoutes, parcels, placesSaid } from "@/lib/parcels";
import { naira } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of service",
  description:
    "What Sudu does, what the kitchen does, what each of us pays for when something goes wrong.",
};

/**
 * The terms, in plain words.
 *
 * Written from what the shop actually does rather than from a template, for
 * the same reason the privacy page is: a promise nobody keeps is worse than
 * no promise, and the two have to match what the code and the WhatsApp
 * messages already say.
 *
 * The part that matters is the refund rule, and it is deliberately not "the
 * restaurant is responsible for everything about the food". Somebody who
 * paid Sudu and got nothing does not care whose fault it was, and a shop on
 * one campus lives on being the one who sorts it out. So the line is drawn
 * at fault: what we did, we pay for; what the kitchen did, we take up with
 * the kitchen on their behalf.
 */
export default async function TermsPage() {
  const settings = await safeSettings();
  const whatsapp = settings.whatsapp_number;

  // Where the shop really goes, read from admin rather than written here.
  // Sangotedo is where most of the food comes from, not all of it, and a
  // terms page that names only Sangotedo describes half the shop.
  const areaNames = parseAreas(settings.delivery_areas).map((one) => one.name);
  const beyond =
    areaNames.length > 1
      ? `${areaNames.slice(0, -1).join(", ")} and ${areaNames[areaNames.length - 1]}`
      : areaNames[0] ?? "";

  // And where a parcel goes, which is further again.
  const parcelSetup = await parcels().catch(() => null);
  const routes = parcelSetup ? liveRoutes(parcelSetup.routes) : [];
  const parcelPlaces = placesSaid(routes);
  const parcelCap = parcelSetup?.maxValue ?? 0;

  // The date the shop typed, spelt out. Empty and the page says what it is
  // instead, which is better than a legal page carrying a date nobody set.
  const said = policyDate(settings.terms_updated);
  const updated = said === "" ? "The small print · terms" : `Last updated ${said}`;

  return (
    <LegalLayout
      ticket={updated}
      title="Terms of service"
      lead="What we do, what the kitchen does, and who pays when something goes wrong. Ordering from Sudu means agreeing to this."
      here="terms"
      sections={[
          "What Sudu is",
          "Prices",
          "Delivery",
          "Paying",
          "What we are responsible for",
          "What the kitchen is responsible for",
          "When something is wrong",
          "Allergies and what is in the food",
          "Changing or cancelling",
          "Your number and your PIN",
          "Offers, codes and promoter links",
          "Parcels",
          "Things outside our hands",
          "Using the site and the app",
          "Changes to these terms",
          "The law and talking to us",
        ]}
    >

      <Clause n={1} title="What Sudu is">
        <p>
          Sudu is a delivery and errand service for Pan-Atlantic University. We
          do not cook. We buy what you asked for from a restaurant, a market or
          a shop and carry it to your block on a run shared with everybody else
          who ordered for the same car.
        </p>
        <p>
          Most runs go to Sangotedo and Novare Mall.
          {beyond !== "" ? (
            <>
              {" "}
              Some go further out, to {beyond}, which is a longer drive and a
              bigger fee. The checkout only offers you a run that can actually
              fetch what is in your cart, so you cannot end up waiting on a car
              that was never going that way.
            </>
          ) : null}
          {parcelPlaces !== "" ? (
            <> Parcels run further again: {parcelPlaces}.</> 
          ) : null}
        </p>
        <p>
          The kitchen whose name is on the menu is the one that makes the food.
          We are the ones who fetch it and bring it.
        </p>
      </Clause>

      <Clause n={2} title="Prices">
        <p>
          The price beside a dish is what that restaurant charges for it. When
          they put their prices up, ours go up with them, which is the only
          reason a price you saw last week can be different today.
        </p>
        <p>
          The price you are shown at the checkout is the price you pay. If
          something has changed by the time we reach the counter we tell you
          before anything is bought, and you can say no and have your money
          back in full.
        </p>
      </Clause>

      <Clause n={3} title="Delivery">
        <p>
          One car, one fee, shared between everybody on that run. What you pay
          depends on how much room your order takes, or on what the shopping
          comes to where a counter is priced that way. The checkout shows it
          before you order and explains how it was worked out.
        </p>
        <p>
          A run has a cut off. Order before it and you are on that car. After
          it you are on the next one, or you can ask for a car of its own,
          which costs more because it is a trip for one person.
        </p>
        <p>
          The arrival time we give you is an honest estimate, not a guarantee.
          Lagos traffic, a kitchen running behind and campus security are all
          real and none of them are ours to command.
        </p>
      </Clause>

      <Clause n={4} title="Paying">
        <p>
          You pay by bank transfer to the account we show you, or by a card
          link we send you by hand. We never ask for your card details, your
          bank login or your OTP, and nobody from Sudu will ever ask you for
          them. If somebody does, it is not us.
        </p>
        <p>
          An order is not on the car until it is paid for. We shop against
          paid orders, so an unpaid one is a place held, not a thing bought.
        </p>
      </Clause>

      <Clause n={5} title="What we are responsible for">
        <ul className="list-disc space-y-1 pl-5">
          <li>Collecting what you actually ordered.</li>
          <li>Everything on your list being in the bag when it reaches you.</li>
          <li>Carrying it carefully, upright and closed.</li>
          <li>Bringing it to the block you gave us, on the run you paid for.</li>
          <li>Telling you where it has got to, and telling you when it is late.</li>
        </ul>
      </Clause>

      <Clause n={6} title="What the kitchen is responsible for">
        <ul className="list-disc space-y-1 pl-5">
          <li>What goes into the food, and how it is cooked.</li>
          <li>How it tastes, how big it is, and how it is presented.</li>
          <li>Their own kitchen hygiene and their own food safety.</li>
          <li>
            What is inside a bag they sealed themselves before it reached us.
          </li>
        </ul>
        <p>
          We choose who we buy from and we stop buying from anybody who keeps
          getting it wrong, but we cannot stand in their kitchen.
        </p>
      </Clause>

      <Clause n={7} title="When something is wrong">
        <p className="font-semibold text-ink">
          If it is our doing, we refund you. If it is the kitchen&apos;s doing,
          the refund is theirs, and we are the ones who go and ask for it.
        </p>
        <p>
          <span className="font-semibold">Ours,</span> and we pay it back
          ourselves, without you having to chase anybody: something on your
          list is missing because we missed it, we collected the wrong thing,
          it was spilled or damaged between the counter and your block, it
          never arrived, or it arrived so far outside the window that it was
          no use to you. Where the whole order is our fault, the delivery fee
          goes back with it.
        </p>
        <p>
          <span className="font-semibold">Theirs,</span> and we take it up with
          them on your behalf rather than sending you to do it: the food is
          undercooked, it is not what the menu described, an ingredient you
          asked to be left out is in it, or something was left out of a bag
          they sealed. We put it to the restaurant the same day with whatever
          you send us, and we pass on whatever they agree, in money or in a
          replacement. We will not pretend a kitchen refused when it agreed,
          and we will not promise you a refund we have not been given.
        </p>
        <p>
          Either way, tell us the same day, with a photo if you can, on the
          WhatsApp number on your order. The same day matters: nobody can
          settle an argument about food a week after it was eaten.
        </p>
        <p>
          Anything we refund goes back to the account you paid from. Nothing
          here takes away any right you have under Nigerian consumer law.
        </p>
      </Clause>

      <Clause n={8} title="Allergies and what is in the food">
        <p>
          Tell us in the note on your order and we will tell the kitchen, but
          we are carrying a sealed bag and we did not cook what is in it. We
          cannot promise you a kitchen that has never touched nuts, dairy,
          shellfish or anything else. If a reaction would be serious, ask the
          restaurant yourself before you order.
        </p>
      </Clause>

      <Clause n={9} title="Changing or cancelling">
        <p>
          Before we have shopped, cancel and get everything back, the delivery
          fee included. Message us and we will do it.
        </p>
        <p>
          Once the run has gone shopping your food has been bought with our
          money and it cannot go back on the shelf, so it cannot be cancelled.
          If you tell us in time we will do what we can, and if a restaurant
          will take something back we pass that on.
        </p>
        <p>
          If you do not come down and your phone is not answered, the driver
          waits as long as the rest of the run allows and then carries your bag
          on to the next block. It is still yours: come and collect it from us.
          What we cannot do is keep food warm, hold a car up while everybody
          else on it waits, or leave a bag outside a room.
        </p>
      </Clause>

      <Clause n={10} title="Your number and your PIN">
        <p>
          Your phone number is your account here and the four digit PIN we sent
          you is what opens it. Keep it to yourself. Anybody with both can see
          your orders, so we only ever send a PIN to the number it belongs to,
          and we will never ask you to read it out to us.
        </p>
      </Clause>

      <Clause n={11} title="Offers, codes and promoter links">
        <p>
          One offer applies to an order. A code you type and an offer already
          on your cart do not stack, and the checkout says which one is on.
        </p>
        <p>
          A promoter&apos;s own link carries a discount for people ordering
          with us for the first time. Offers and codes can be changed or
          withdrawn at any time, and an order already placed keeps whatever it
          was given.
        </p>
        <p>
          One person, one first order. Using a second phone number to take a
          first order discount again is not on, and we can refuse an order or
          take a discount back off one where it is obvious.
        </p>
      </Clause>

      <Clause n={12} title="Parcels">
        <p>
          A parcel is somebody handing us something to carry, not something we
          bought, so we cannot say what is in it or what it is worth.
          {parcelPlaces !== "" ? <> Routes run between PAU and {parcelPlaces}.</> : null}{" "}
          There is a limit on the value of a parcel we will take
          {parcelCap > 0 ? `, ${naira(parcelCap)}` : ""}, shown on the{" "}
          <Link href="/parcel" className="font-semibold text-brand">
            parcel page
          </Link>
          , and that limit is the most we will ever pay out if one is lost or
          damaged in our hands. We do not carry money, documents that cannot be
          replaced, or anything illegal.
        </p>
      </Clause>

      <Clause n={13} title="Things outside our hands">
        <p>
          A restaurant closing unexpectedly, a campus lock down, a fuel queue,
          a flood, a strike, a network outage that stops payments: where one of
          these stops a run, we tell you and we refund anything you paid for
          food that was never bought, and the delivery fee with it.
        </p>
      </Clause>

      <Clause n={14} title="Using the site and the app">
        <p>
          Order for yourself or for somebody you actually know. Do not place
          orders in other people&apos;s names, do not try to get into anybody
          else&apos;s order history, and do not try to break the site. We can
          refuse service to a number that does any of this.
        </p>
      </Clause>

      <Clause n={15} title="Changes to these terms">
        <p>
          If this changes we change this page. It is the only copy, so it is
          always the current one, and the version that counts for your order is
          the one that was here when you placed it.
        </p>
      </Clause>

      <Clause n={16} title="The law and talking to us">
        <p>
          These terms are under the law of the Federal Republic of Nigeria, and
          anything neither of us can settle between ourselves goes to the
          courts of Lagos State.
        </p>
        <p>
          Almost nothing ever needs to get that far. Message us and we will
          sort it out.
          {whatsapp ? (
            <>
              {" "}
              That number is{" "}
              <span className="font-semibold">{whatsapp}</span>.
            </>
          ) : null}
        </p>
        <p className="text-muted">
          See also our{" "}
          <Link href="/return-policy" className="font-semibold text-brand">
            returns and refunds page
          </Link>
          , our{" "}
          <Link href="/privacy" className="font-semibold text-brand">
            privacy policy
          </Link>{" "}
          and the{" "}
          <Link href="/support" className="font-semibold text-brand">
            help page
          </Link>
          .
        </p>
      </Clause>
    </LegalLayout>
  );
}
