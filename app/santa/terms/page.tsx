import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout, { Clause } from "@/components/LegalLayout";
import { policyDate } from "@/lib/time";
import { naira } from "@/lib/money";
import { safeSettings, shopEmails } from "@/lib/settings";
import { LEAST_MEMBERS, MOST_WISHES, santaDelivery } from "@/lib/santa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/santa/terms" },
  title: "Secret Santa terms",
  description:
    "What the budget covers, when money is held, what happens if a gift costs more, and how a room is cancelled.",
};

/**
 * The small print for a Secret Santa room.
 *
 * Its own page rather than a clause on the ordinary terms, because it is
 * its own arrangement and a much more serious one. An order of jollof is
 * money paid and food delivered the same evening. A room is money handed
 * over weeks early, by a dozen people at once, against a gift nobody has
 * chosen yet, in a draw nobody can see. Every question that raises -- what
 * the budget covers, who can spend it, what happens when the thing somebody
 * asked for costs more, what happens if the room never fills -- is a
 * question the food terms do not answer.
 *
 * Written from what the code does, the same as the rest of the small print
 * here. Every figure on it is read from the shop's own settings rather than
 * typed, so the page cannot quietly go stale: change the carrying fee in
 * admin and this page changes with it.
 */
export default async function SantaTermsPage() {
  const settings = await safeSettings();
  const whatsapp = settings.whatsapp_number;
  const email = shopEmails(settings.contact_email);
  const fee = await santaDelivery();

  const said = policyDate(settings.terms_updated);
  const updated = said === "" ? "The small print · Secret Santa" : `Last updated ${said}`;

  return (
    <LegalLayout
      ticket={updated}
      title="Secret Santa terms"
      lead="What the budget covers, when we are holding your money, and what happens when a gift costs more than the room agreed. Joining a room means agreeing to this."
      here="santa"
      sections={[
        "What a room is",
        "Who can be in one",
        "The budget",
        "What carrying costs",
        "Paying, and being in the draw",
        "Your list",
        "The draw",
        "What we buy",
        "When a gift costs more",
        "Where your gift goes",
        "Leaving, and cancelling",
        "Money we are holding",
        "Things outside our hands",
        "Talking to us",
      ]}
    >
      <Clause n={1} title="What a room is">
        <p>
          One person makes a room, sets what everybody will pay and the day
          the gifts are exchanged, and shares the link. Everybody who joins
          pays the same amount and writes a short list of things they would
          like. On the close date the names are drawn, each person sees who
          they drew and picks from that person&apos;s list, and we go and buy
          every gift and bring them all on the day.
        </p>
        <p>
          We do not make the gifts and we are not the shop that sells them.
          We are the ones who find them, buy them with the money the room
          put in, and carry them.
        </p>
      </Clause>

      <Clause n={2} title="Who can be in one">
        <p>
          A room needs at least {LEAST_MEMBERS} people who have paid before it
          can be drawn. Below that it is not a draw, it is two or three people
          who already know what each other is getting.
        </p>
        <p>
          Anybody with the link can join while the room is open. The person who
          made it can see who is in and who has paid, and can ask us to take
          somebody out before the draw.
        </p>
      </Clause>

      <Clause n={3} title="The budget">
        <p>
          The budget is set by whoever made the room, and it is the whole of
          what you hand over. A room that calls itself {naira(20000)} is{" "}
          {naira(20000)} out of pocket and not a naira more, because that is
          the number the group agreed out loud and the one everybody budgets
          against.
        </p>
        <p>
          Carrying comes out of the budget rather than on top of it, so what
          is actually spent on the gift is the budget less the carrying, and
          the room page shows you that figure before you pick anything.
        </p>
      </Clause>

      <Clause n={4} title="What carrying costs">
        {fee.base > 0 ? (
          <>
            <p>
              Finding, buying and delivering one person&apos;s gifts costs{" "}
              {naira(fee.base)}. That covers up to {fee.included}{" "}
              {fee.included === 1 ? "gift" : "gifts"} for the person you drew.
              {fee.extra > 0
                ? ` Each gift beyond that adds ${naira(fee.extra)}, because it is another thing to go and find.`
                : ""}
            </p>
            <p>
              It is one fee for what you were drawn to buy, however many shops
              it takes us to find it. Nothing is earned before the draw,
              because nothing has been fetched.
            </p>
          </>
        ) : (
          <p>
            Carrying is included in the budget at the moment, so the whole of
            what you pay goes on the gift.
          </p>
        )}
      </Clause>

      <Clause n={5} title="Paying, and being in the draw">
        <p>
          Paying is what puts you in the draw. You transfer the budget and
          type the reference we give you in the narration: that reference is
          how we tell whose money is whose, and without it a payment can take
          a while to find.
        </p>
        <p>
          Somebody who has not paid by the close date is not drawn and is not
          drawn for. It is not a punishment; it is that the person who draws
          them would be buying a gift with money that is not there.
        </p>
      </Clause>

      <Clause n={6} title="Your list">
        <p>
          Up to {MOST_WISHES} things, with a photograph and a note if it helps.
          More than that stops being a shortlist and starts being a catalogue
          for somebody who has one budget to spend.
        </p>
        <p>
          Write it for a stranger. Whoever drew you cannot ask you what size
          you are, and a list that says &quot;a hoodie&quot; and a list that
          says &quot;a black hoodie, large&quot; are two very different
          mornings for them.
        </p>
        <p>
          You can change your own list while the room is open. After the draw
          it is what the person who drew you is looking at, so it is fixed.
        </p>
      </Clause>

      <Clause n={7} title="The draw">
        <p>
          On the close date the names are drawn at random into a ring, so
          everybody gives to one person and gets from one person, and nobody
          draws themselves.
        </p>
        <p>
          The draw cannot be run again and nobody can be taken out of it
          afterwards: every name after theirs is attached to the one before,
          so pulling one out breaks the ring for everybody. If something has
          gone wrong, message us and we will sort it out by hand.
        </p>
      </Clause>

      <Clause n={8} title="What we buy">
        <p>
          You pick from the list of the person you drew, and we go and buy
          what you picked. If the exact thing cannot be found, or it is not
          what the photograph showed, we tell you and ask before we spend
          anything on something else.
        </p>
        <p>
          If nothing on the list can be found at all, the money for that gift
          comes back. We do not substitute something nobody chose and call it
          done.
        </p>
      </Clause>

      <Clause n={9} title="When a gift costs more">
        <p>
          Nothing above the budget is bought without the person who picked it
          saying yes to the difference first. We tell you what it really
          costs and you decide: pay the difference, or pick something else
          off the list.
        </p>
        <p>
          That agreement is yours to give and nobody else&apos;s. We cannot
          tick it on your behalf, and neither can whoever made the room,
          because the whole reason the rule exists is that somebody is being
          asked for more money than they agreed to hand over.
        </p>
      </Clause>

      <Clause n={10} title="Where your gift goes">
        <p>
          You set the block your own gift comes to, and you can change it
          right up until it is driven. The person who drew you never sees it.
          They chose your gift and paid for it, and neither of those requires
          knowing which block you sleep in.
        </p>
      </Clause>

      <Clause n={11} title="Leaving, and cancelling">
        <p>
          While the room is open you can leave it, and your list goes with
          you: it was written for whoever drew you, and nobody is drawing you
          now. If you had paid, that money comes back.
        </p>
        <p>
          Whoever made the room cannot simply walk out of it, because everybody
          else is relying on them to close it. Message us instead and we will
          close or cancel it properly.
        </p>
        <p>
          If a room never reaches {LEAST_MEMBERS} people, or the group decides
          against it before the draw, everything paid in comes back. Nothing
          has been bought and nothing has been fetched, so there is nothing to
          keep.
        </p>
      </Clause>

      <Clause n={12} title="Money we are holding">
        <p>
          Between the day you pay and the day your gift is bought, your money
          is money we are holding for the room. It is not our takings and it is
          not counted as ours: what each room is holding, what it has spent and
          what it still owes back is worked out from the room&apos;s own record
          every time it is asked for.
        </p>
        <p>
          Anything left over at the end of a room comes back to the people who
          put it in. If a gift came in under budget, the difference is theirs,
          not ours.
        </p>
      </Clause>

      <Clause n={13} title="Things outside our hands">
        <p>
          Shops sell out, especially in December, and a thing that was on a
          shelf on the day somebody wrote their list is not always there three
          weeks later. We will say so rather than guess, and clause 8 says what
          happens then.
        </p>
        <p>
          We do not promise a gift will be liked. We promise it is the thing
          that was picked, off the list the person wrote themselves.
        </p>
      </Clause>

      <Clause n={14} title="Talking to us">
        <p>
          Anything at all about a room:{" "}
          {whatsapp ? <strong>{whatsapp}</strong> : <span>our WhatsApp number</span>} on
          WhatsApp
          {email?.orders ? (
            <>
              , or <strong>{email.orders}</strong>
            </>
          ) : null}
          . A person reads every message.
        </p>
        <p>
          The rest of the small print still applies to anything that is not
          about a room: the{" "}
          <Link href="/terms" className="font-semibold text-brand">
            terms of service
          </Link>
          , the{" "}
          <Link href="/privacy" className="font-semibold text-brand">
            privacy policy
          </Link>
          , and{" "}
          <Link href="/return-policy" className="font-semibold text-brand">
            returns and refunds
          </Link>
          .
        </p>
      </Clause>
    </LegalLayout>
  );
}
