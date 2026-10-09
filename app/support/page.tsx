import type { Metadata } from "next";
import Link from "next/link";
import { safeSettings, whatsappLink } from "@/lib/settings";
import PageHead from "@/components/PageHead";

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
    <article className="-mt-4 pb-10">
      <PageHead
        ticket="Help"
        title={
          <>
            Something wrong?
            <br />
            <span className="text-brand">Tell us.</span>
          </>
        }
        lead="A person reads every message. Most problems are sorted the same day."
      />

      <div className="flex flex-col gap-8 py-9 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <h2 className="font-display text-[40px] font-black uppercase leading-none">
            Common problems
          </h2>
          <div className="flex flex-col border-t-2 border-ink">

      <Section title="My food is late" open>
        <p>
          Check your order page first: it says where the order has got to, from
          paid, to being collected, to on the road, to at your block. If it has
          not moved and the window has passed, message us with your order number
          and we will find the rider.
        </p>
      </Section>

      <Section title="Something is wrong or missing">
        <p>
          Tell us the same day, with a photo if you can. Either way you talk to
          us and not to the restaurant.
        </p>
        <p>
          If it is our doing, we refund it ourselves, to the account you paid
          from: something missing because we missed it, the wrong thing
          collected, damaged on the way, or never delivered.
        </p>
        <p>
          If it is the kitchen&apos;s doing, how it was cooked or what went
          into it, the refund is theirs to give and we are the ones who go and
          ask. We put it to them the same day and pass on whatever they agree.
          The{" "}
          <Link href="/terms" className="font-semibold text-brand">
            terms
          </Link>{" "}
          set out which is which.
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

          </div>
        </div>

        <aside className="flex shrink-0 flex-col gap-4 lg:w-[320px]">
          {whatsapp ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-ink p-6 text-shell shadow-[8px_8px_0_#e5321d]">
              <span className="ticket text-volt">Fastest</span>
              <span className="font-display text-[40px] font-black uppercase leading-none">
                WhatsApp us
              </span>
              <span className="font-mono text-xl">{whatsapp}</span>
              <span className="text-sm leading-relaxed text-[#d8d1c7]">
                Message from the number you ordered with, and send a photo if
                something is wrong.
              </span>
              {chat && (
                <a
                  href={chat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-center rounded-full bg-volt font-bold text-ink"
                >
                  Open WhatsApp
                </a>
              )}
            </div>
          ) : (
            <p className="card text-sm text-ink/80">
              Message us on the WhatsApp number shown on your order.
            </p>
          )}

          <div className="card flex flex-col gap-2">
            <span className="font-bold">The fine print</span>
            <Link href="/terms" className="hover:text-brand-dark">
              Terms of service
            </Link>
            <Link href="/return-policy" className="hover:text-brand-dark">
              Returns and refunds
            </Link>
            <Link href="/privacy" className="hover:text-brand-dark">
              Privacy
            </Link>
          </div>

          <Link href="/products" className="btn-quiet self-start">
            Back to the menu
          </Link>
        </aside>
      </div>
    </article>
  );
}

/**
 * One question, folded away.
 *
 * Six questions open at once is a wall of text nobody reads; the board
 * gives them a rule each and a Tomato plus on the end, and the one most
 * people arrive with starts open.
 */
function Section({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group border-b-2 border-ink">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
        {title}
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-display text-2xl text-white"
        >
          <span className="transition group-open:rotate-45">+</span>
        </span>
      </summary>
      <div className="max-w-[720px] space-y-2.5 pb-5 leading-relaxed text-ink/75">
        {children}
      </div>
    </details>
  );
}
