import type { Metadata } from "next";
import LegalLayout, { Clause } from "@/components/LegalLayout";
import { policyDate } from "@/lib/time";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy",
  description: "What Sudu keeps about you, why, and how to have it deleted.",
};

/**
 * The privacy policy, in plain words.
 *
 * Both app stores require a policy at a public URL before a listing goes
 * live, and it has to describe what the app actually does. This is written
 * from what the code really collects rather than from a template, because the
 * two have to match.
 */
export default async function PrivacyPage() {
  const settings = await safeSettings();
  const whatsapp = settings.whatsapp_number;

  // The date the shop typed, spelt out. Empty and the page says what it is
  // instead, which is better than a legal page carrying a date nobody set.
  const said = policyDate(settings.privacy_updated);
  const updated = said === "" ? "The small print · privacy" : `Last updated ${said}`;

  return (
    <LegalLayout
      ticket={updated}
      title="Privacy"
      lead="What we keep about you, who sees it, and how to have it deleted. Short and plain, on purpose."
      here="privacy"
      sections={[
          "There are no accounts",
          "What we keep",
          "What we never keep",
          "Who else sees it",
          "Messages you get",
          "Having it deleted",
          "Children",
          "Changes",
        ]}
    >

      <Clause n={1} title="There are no accounts">
        <p>
          You never make an account with Sudu and you never give us a password.
          Your phone number is who you are. When you order for the first time we
          send you a four digit PIN on WhatsApp, and that number and PIN are all
          that is ever needed to see your own orders again, on the website or in
          the app.
        </p>
      </Clause>

      <Clause n={2} title="What we keep">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name, phone number and the block you are delivered to.</li>
          <li>
            What you ordered, what it cost, how you paid and where it got to. We
            keep this because it is the record of a sale.
          </li>
          <li>
            Your four digit PIN, and the count of wrong tries, so a number
            cannot be guessed into.
          </li>
          <li>
            An email address, only if you gave us one, and only to send you the
            receipt for your order.
          </li>
          <li>
            If you use the app and allow notifications, the push token your
            phone gives us. It tells us where to send a message. It is not a
            name and it is not a location.
          </li>
          <li>
            Which pages and app screens were viewed and how many times, with no
            name attached, so we know which restaurants people actually want.
            These are counted against a random id your browser or your copy of
            the app makes for itself. It is never kept beside your name or your
            number, and it tells us how many people looked, never who.
          </li>
        </ul>
      </Clause>

      <Clause n={3} title="What we never keep">
        <p>
          We never see or store your card details or your bank login. A bank
          transfer happens in your own banking app, and a card payment happens
          on the payment provider&apos;s own page. Neither passes through us. We
          do not track your location, we do not read your contacts, and we do
          not use your camera or microphone.
        </p>
      </Clause>

      <Clause n={4} title="Who else sees it">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The restaurant sees only the food. It does not get your number or
            your block.
          </li>
          <li>
            Whoever is doing the run sees the name and block on the bag, because
            that is how it reaches you.
          </li>
          <li>
            Our hosting and database providers hold the data on our behalf, and
            our email provider sends the receipt. Nobody else.
          </li>
          <li>
            We never sell your details, and we never hand them to anybody for
            advertising.
          </li>
        </ul>
      </Clause>

      <Clause n={5} title="Messages you get">
        <p>
          We message you about your own order: that it was received, that the
          payment landed, that the food is on the road, that it has arrived. If
          you turned on notifications in the app, the same few messages come as
          notifications instead. Turn them off in your phone settings at any
          time and the app keeps working.
        </p>
      </Clause>

      <Clause n={6} title="Having it deleted">
        <p>
          Message us on WhatsApp from the number you order with and ask, and we
          delete your name, number, block and PIN. We keep the bare record of
          past sales, without your name, because we have to be able to account
          for money that changed hands.
        </p>
        {whatsapp && (
          <p>
            That number is <span className="font-semibold">{whatsapp}</span>.
          </p>
        )}
      </Clause>

      <Clause n={7} title="Children">
        <p>
          Sudu delivers to a university campus and is not meant for children
          under 13. We do not knowingly keep anything about them.
        </p>
      </Clause>

      <Clause n={8} title="Changes">
        <p>
          If this changes we will change this page. It is the only copy, so it
          is always the current one.
        </p>
      </Clause>
    </LegalLayout>
  );
}
