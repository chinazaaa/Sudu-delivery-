import type { Metadata } from "next";
import Link from "next/link";
import { safeSettings, whatsappLink } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "Support",
  description: "How to reach a person at Sudu, and what to do when an order is wrong.",
};

/**
 * Where somebody goes when something has gone wrong.
 *
 * Both app stores want a support address that works and puts a human within
 * reach, and Apple checks it. That is the reason this page exists, but it is
 * not what it is for: an order that is late or wrong is the worst moment a
 * customer has with us, and sending them hunting for a number makes it worse.
 *
 * Everything here answers a question somebody is asking while annoyed, so the
 * answers come first and the explanations come after.
 */
export default async function SupportPage() {
  const settings = await safeSettings();
  const whatsapp = settings.whatsapp_number;
  const chat = whatsapp
    ? whatsappLink(whatsapp, "Hello Sudu, I need help with my order.")
    : null;

  return (
    <article className="mx-auto max-w-2xl space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-sm text-muted">
          A person answers. Not a form, and not a robot.
        </p>
      </header>

      <section className="card space-y-3">
        <h2 className="font-bold">Message us</h2>
        {whatsapp ? (
          <>
            <p className="text-sm text-ink/80">
              WhatsApp is the fastest way to reach us, and the only one we watch
              all day. Send the number you ordered with, and your order number if
              you have it.
            </p>
            <p className="text-lg font-extrabold">{whatsapp}</p>
            {chat && (
              <a href={chat} target="_blank" rel="noopener noreferrer" className="btn-primary block w-full text-center">
                Open WhatsApp
              </a>
            )}
          </>
        ) : (
          <p className="text-sm text-ink/80">
            Message us on the WhatsApp number shown on your order.
          </p>
        )}
      </section>

      <Section title="My food is late">
        <p>
          Check your order page first: it says where the order has got to, from
          paid, to being collected, to on the road, to at your block. If it has
          not moved and the window has passed, message us with your order number
          and we will find the rider.
        </p>
      </Section>

      <Section title="Something is wrong or missing">
        <p>
          Tell us the same day, with a photo if you can. We deal with the
          restaurant, not you. If an item is missing or is not what you ordered
          we refund it to the account you paid from, and we do not ask you to
          take it up with the restaurant yourself.
        </p>
      </Section>

      <Section title="I paid and my order still says unpaid">
        <p>
          Payments are matched by the short code we ask you to type into the
          transfer narration. If the code was left out, the transfer can take a
          while to find. Message us the name on the account you paid from and the
          time you sent it, and we will match it by hand.
        </p>
      </Section>

      <Section title="I cannot see my orders">
        <p>
          There are no accounts here. Your phone number is who you are, and the
          four digit PIN we sent you on WhatsApp the first time you ordered is
          what opens your order history, on{" "}
          <Link href="/orders" className="font-semibold text-brand">
            the website
          </Link>{" "}
          or in the app.
        </p>
        <p>
          Lost the PIN? Message us from the number it belongs to and we will send
          it again. We only ever send a PIN to its own number, so nobody can ask
          for somebody else&apos;s.
        </p>
      </Section>

      <Section title="I want to change or cancel an order">
        <p>
          Before the run closes, message us and we will change it. After it
          closes the food has been bought, so it cannot be cancelled, though we
          would still rather hear from you than not.
        </p>
      </Section>

      <Section title="Delete everything you have about me">
        <p>
          In the app: the <span className="font-semibold">You</span> screen, then
          Delete my data. On the website, message us from your own number and we
          will do it. Either way it goes, and what we keep and why is set out in
          the{" "}
          <Link href="/privacy" className="font-semibold text-brand">
            privacy policy
          </Link>
          .
        </p>
      </Section>

      <p className="text-center text-sm text-muted">
        <Link href="/" className="font-semibold text-brand">
          Back to the menu
        </Link>
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-2">
      <h2 className="font-bold">{title}</h2>
      <div className="space-y-2 text-sm text-ink/80">{children}</div>
    </section>
  );
}
