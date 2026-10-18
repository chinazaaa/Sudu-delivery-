import type { Metadata } from "next";
import LegalLayout, { Clause } from "@/components/LegalLayout";
import { policyDate } from "@/lib/time";
import Link from "next/link";
import { safeSettings, shopEmails, whatsappLink } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/return-policy" },
  title: "Returns and refunds",
  description:
    "When you get your money back from Sudu, how long it takes, and what to do about an order that was wrong.",
};

/**
 * Returns and refunds, on a page of its own.
 *
 * All of it is already in the terms, and it stays there: this is the same
 * rules gathered where somebody looking for them will look, and where a
 * bank, a card provider or a store can be pointed at a single address.
 * Somebody whose order went wrong is not going to read a terms page to the
 * end to find out what happens next.
 *
 * It is written around one line: what we did, we pay for; what the kitchen
 * did, we take up with the kitchen on your behalf. A shop on one campus
 * lives on being the one who sorts it out, and a policy that answers "whose
 * fault was it" before "what do I get" has already lost the person reading
 * it.
 */
export default async function ReturnPolicyPage() {
  const settings = await safeSettings();
  const email = shopEmails(settings.contact_email);
  const whatsapp = whatsappLink(
    settings.whatsapp_number,
    "Hi Sudu, something was wrong with my order."
  );

  // The date the shop typed, spelt out. Empty and the page says what it is
  // instead, which is better than a legal page carrying a date nobody set.
  const said = policyDate(settings.returns_updated);
  const updated = said === "" ? "The small print · returns" : `Last updated ${said}`;

  return (
    <LegalLayout
      ticket={updated}
      title="Returns and refunds"
      lead="When money comes back, how fast, and what is ours to put right rather than the restaurant's."
      here="returns"
      sections={[
          "The short version",
          "Cancelling before we have shopped",
          "What we refund ourselves",
          "What we take up with the restaurant",
          "Skincare, and anything that is not food",
          "Medicine and anything from a pharmacy",
          "How the money comes back",
          "If a run does not happen",
          "Telling us",
        ]}
    >

      <Clause n={1} title="The short version">
        <p className="font-semibold text-ink">
          If it is our doing, we refund you. If it is the kitchen&apos;s doing,
          the refund is theirs, and we are the ones who go and ask for it.
        </p>
        <p>
          Tell us the same day, on WhatsApp, with a photo if you have one.
          Nobody can settle an argument about food a week after it was eaten.
        </p>
      </Clause>

      <Clause n={2} title="Cancelling before we have shopped">
        <p>
          While the run is still open and nothing has been bought, you can
          cancel and get <span className="font-semibold">everything</span>{" "}
          back, the delivery fee included. Message us and we will do it.
        </p>
        <p>
          Once the run has gone shopping, your food has been bought with our
          money and it cannot go back on the shelf, so it cannot be cancelled.
          Tell us anyway and we will do what we can: if a restaurant will take
          something back, we pass that on.
        </p>
        <p>
          A skincare or pharmacy order sits on a weekly car, so its moment is
          that morning&apos;s cut off rather than a run going out. Before the
          cut off, cancel and everything comes back. After it the shopping for
          that car has been done.
        </p>
      </Clause>

      <Clause n={3} title="What we refund ourselves">
        <p>
          No chasing anybody, and no argument about whose fault it was. We pay
          these back:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Something on your list is missing because we missed it.</li>
          <li>We collected the wrong thing.</li>
          <li>It was spilled or damaged between the counter and your block.</li>
          <li>It never arrived.</li>
          <li>
            It arrived so far outside the window that it was no use to you.
          </li>
        </ul>
        <p>
          Where the whole order is our fault, the delivery fee goes back with
          it. Where part of it is, you get that part back.
        </p>
      </Clause>

      <Clause n={4} title="What we take up with the restaurant">
        <p>
          We carry a sealed bag and we did not cook what is in it. These are
          the kitchen&apos;s, and we put them to the kitchen on your behalf
          rather than sending you to do it:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>The food is undercooked or badly made.</li>
          <li>It is not what the menu described.</li>
          <li>An ingredient you asked to be left out is in it.</li>
          <li>Something was left out of a bag they sealed.</li>
        </ul>
        <p>
          We put it to them the same day with whatever you send us, and we pass
          on whatever they agree, in money or in a replacement. We will not
          pretend a kitchen refused when it agreed, and we will not promise you
          a refund we have not been given.
        </p>
      </Clause>

      <Clause n={5} title="Skincare, and anything that is not food">
        <p>
          The skincare counter, market shopping, a thing we went out and found
          for you: if it arrives damaged, or it is not what you asked for, tell
          us the same day and we will take it back and refund it, the delivery
          with it where the whole order was wrong.
        </p>
        <p>
          Once something has been opened or used, it cannot go back, for the
          same reason no shop takes opened skincare back. Anything bought to
          order for one person is bought with your money at your ask, so it
          cannot be returned simply because it was no longer wanted.
        </p>
        <p>
          A counter order is its own order on its own car, so a refund on one
          never touches a food order you have waiting, and the other way
          about.
        </p>
      </Clause>

      <Clause n={6} title="Medicine and anything from a pharmacy">
        <p className="font-semibold text-ink">
          Check it before the rider leaves. Medicine is the one thing on this
          page that cannot come back afterwards, and that is for safety rather
          than for our convenience.
        </p>
        <p>
          Look at the product, the seal and the expiry date while we are still
          standing there. Wrong product, broken seal, out of date, damaged, or
          simply not what you ordered: it goes straight back with the rider and
          you get all of it back, the delivery included. That is the whole of
          our mistake and we do not argue about it.
        </p>
        <p>
          After it has left our hands it cannot be returned or exchanged. No
          pharmacy can resell a medicine that has been out of its sight, so
          nor can we, and a packet that was correct when it reached you is not
          returnable because it was no longer wanted or because somebody
          changed their mind about taking it.
        </p>
        <p>
          We are not a pharmacy and nobody here is a pharmacist, so we cannot
          advise on what to take or how much, and we do not carry prescription
          only medicine at all. If something we fetched was wrong, that is
          ours and this page covers it. What the medicine does once it was
          correctly supplied is between you and whoever told you to take it.
          The full wording is in clause 9 of the{" "}
          <Link href="/terms" className="font-semibold text-brand">
            terms
          </Link>
          .
        </p>
      </Clause>

      <Clause n={7} title="How the money comes back">
        <p>
          To the account you paid from, by transfer, in{" "}
          <span className="font-semibold">two working days</span> of us
          agreeing it, and usually the same day. Card payments go back to the
          card, which the bank can take a few days longer to show.
        </p>
        <p>
          We do not hold credit, points or a wallet balance. Your money comes
          back as money.
        </p>
      </Clause>

      <Clause n={8} title="If a run does not happen">
        <p>
          Weather, a road, a car, or a restaurant that is shut when we get
          there. If a run cannot go, we tell you and we refund everything you
          paid for it, the delivery fee included, without being asked.
        </p>
      </Clause>

      <Clause n={9} title="Telling us">
        <p>
          The same day, on the WhatsApp number on your order, with a photo
          where there is something to photograph. A person answers.
        </p>
        {whatsapp ? (
          <p>
            <a href={whatsapp} className="font-semibold text-brand">
              Message us about an order
            </a>
          </p>
        ) : null}
        {email && (
          <p>
            Or in writing, to{" "}
            <a href={`mailto:${email.orders}`} className="font-semibold text-brand">
              {email.orders}
            </a>
            , with your order number and the photo attached.
          </p>
        )}
        <p className="text-muted">
          This sits alongside our{" "}
          <Link href="/terms" className="font-semibold text-brand">
            terms
          </Link>
          , and nothing here takes away any right you have under Nigerian
          consumer law.
        </p>
      </Clause>
    </LegalLayout>
  );
}
